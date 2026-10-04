import base64
import hashlib
import hmac
import http.client
import json
import secrets
import sqlite3
import struct
import tempfile
import threading
import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from pathlib import Path

import server


class Client:
    def __init__(self, port):
        self.port, self.cookie, self.csrf = port, '', ''

    def request(self, path, method='GET', body=None, csrf=True, origin=True):
        conn = http.client.HTTPConnection('127.0.0.1', self.port, timeout=10)
        headers = {'Cookie': self.cookie}
        if body is not None:
            headers['Content-Type'] = 'application/json'
            if origin:
                headers['Origin'] = f'http://127.0.0.1:{self.port}'
            if csrf:
                headers['X-CSRF-Token'] = self.csrf
        conn.request(method, '/api/' + path, json.dumps(body) if body is not None else None, headers)
        response = conn.getresponse()
        raw = response.read()
        if response.getheader('Set-Cookie'):
            self.cookie = response.getheader('Set-Cookie').split(';')[0]
        result = json.loads(raw) if response.getheader('Content-Type', '').startswith('application/json') else raw
        if isinstance(result, dict) and 'csrf' in result:
            self.csrf = result['csrf']
        status = response.status
        conn.close()
        return status, result


class WellnessTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        server.DATA = Path(cls.temp.name)
        server.DB = server.DATA / 'test.sqlite3'
        server.init_db()
        cls.http = server.ThreadingHTTPServer(('127.0.0.1', 0), server.Handler)
        cls.port = cls.http.server_port
        cls.thread = threading.Thread(target=cls.http.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.http.shutdown()
        cls.http.server_close()
        cls.thread.join()
        cls.temp.cleanup()

    def setUp(self):
        with server.connect() as db:
            db.execute('DELETE FROM sessions')
            db.execute('DELETE FROM mfa')
            db.execute('DELETE FROM audit')
            db.execute("DELETE FROM records WHERE kind NOT IN ('packages','rooms')")
            db.execute('DELETE FROM users')
            for role in ['FAMILY', 'MANAGER', 'ADMIN', 'NURSE', 'ACCOUNTANT']:
                db.execute('INSERT INTO users VALUES(?,?,?,?,?,?,?,?)', (role, role, role.lower()+'@test.example', '090000'+str(len(role)).zfill(4), server.password_hash('long-test-password'), role, 1, server.now()))
        server.ATTEMPTS.clear()
        self.family = self.login('FAMILY')
        self.manager = self.login('MANAGER')
        self.admin = self.login('ADMIN')
        self.nurse = self.login('NURSE')
        self.accountant = self.login('ACCOUNTANT')
        _, self.resident = self.family.request('residents', 'POST', {'name': 'Test resident', 'dob': '1950-01-01', 'phone': '0900123456', 'consent': True})
        _, self.packages = self.family.request('packages')
        _, self.rooms = self.manager.request('rooms')

    def login(self, role):
        client = Client(self.port)
        status, _ = client.request('login', 'POST', {'email': role.lower()+'@test.example', 'password': 'long-test-password'})
        self.assertEqual(status, 200)
        return client

    def booking(self, client=None):
        status, result = (client or self.family).request('bookings', 'POST', {'resident': self.resident['id'], 'package_id': self.packages[0]['id'], 'start': (date.today()+timedelta(days=1)).isoformat(), 'duration': 1, 'total': 1, 'status': 'Đã xác nhận'})
        self.assertEqual(status, 200, result)
        return result

    def test_server_price_and_state(self):
        b = self.booking()
        self.assertEqual(b['total'], self.packages[0]['price'])
        self.assertEqual(b['status'], 'Chờ duyệt')
        status, _ = self.manager.request('bookings/'+b['id'], 'PATCH', {'status':'Hoàn tất'})
        self.assertEqual(status, 400)

    def test_cross_family_access_and_role_spoof(self):
        other=Client(self.port)
        status, result=other.request('register','POST',{'name':'Other','email':'other@test.example','phone':'0912345678','password':'another-long-password','role':'ADMIN'})
        self.assertEqual(status,200)
        self.assertEqual(result['user']['role'],'FAMILY')
        status, result=other.request('residents')
        self.assertEqual(result,[])
        status, _=other.request('residents/'+self.resident['id'],'PATCH',{'name':'Attacker'})
        self.assertEqual(status,403)
        status, _=other.request('users')
        self.assertEqual(status,403)

    def test_csrf_and_origin_required(self):
        b=self.booking()
        self.assertEqual(self.family.request('bookings/'+b['id'],'PATCH',{'status':'Đã hủy'},csrf=False)[0],403)
        self.assertEqual(self.family.request('bookings/'+b['id'],'PATCH',{'status':'Đã hủy'},origin=False)[0],403)

    def test_staff_assignment(self):
        self.assertEqual(self.nurse.request('residents')[1],[])
        self.manager.request('residents/'+self.resident['id'],'PATCH',{'staff_ids':['NURSE']})
        self.assertEqual(len(self.nurse.request('residents')[1]),1)
        status,result=self.nurse.request('vitals','POST',{'resident':self.resident['id'],'systolic':185,'diastolic':95,'pulse':75,'spo2':98})
        self.assertEqual(status,200,result)
        self.assertTrue(result['alert'])
        self.assertEqual(self.admin.request('vitals')[1],[])

    def test_concurrent_room_capacity(self):
        room=next(r for r in self.rooms if r['capacity']==2)
        bookings=[self.booking() for _ in range(3)]
        def confirm(b):
            return self.manager.request('bookings/'+b['id'],'PATCH',{'status':'Đã xác nhận','room_id':room['id']})[0]
        with ThreadPoolExecutor(max_workers=3) as pool:
            statuses=list(pool.map(confirm,bookings))
        self.assertEqual(statuses.count(200),2)
        self.assertEqual(statuses.count(409),1)

    def test_payments_idempotency_and_refund(self):
        b=self.booking()
        payment={'booking_id':b['id'],'amount':b['total'],'reference':'bank-123','type':'Thu tiền'}
        self.assertEqual(self.accountant.request('payments','POST',payment)[0],200)
        self.assertEqual(self.accountant.request('payments','POST',payment)[0],409)
        self.assertEqual(self.family.request('payments','POST',dict(payment,reference='fake'))[0],403)
        self.assertEqual(self.accountant.request('payments','POST',dict(payment,reference='refund1',type='Hoàn tiền',amount=b['total']+1))[0],400)
        self.assertEqual(self.accountant.request('payments','POST',dict(payment,reference='refund2',type='Hoàn tiền'))[0],200)

    def test_shared_reports_consent(self):
        status,r=self.manager.request('reports','POST',{'resident':self.resident['id'],'title':'Report','summary':'Private','shared':False})
        self.assertEqual(status,200)
        self.assertEqual(self.family.request('reports')[1],[])
        self.manager.request('reports/'+r['id'],'PATCH',{'shared':True})
        self.assertEqual(len(self.family.request('reports')[1]),1)
        self.family.request('residents/'+self.resident['id'],'PATCH',{'consent':False})
        self.assertEqual(self.family.request('reports')[1],[])

    def test_private_attachments(self):
        payload={'resident':self.resident['id'],'title':'PDF','filename':'test.pdf','mime':'application/pdf','content':base64.b64encode(b'%PDF-1.4\nTest').decode(),'shared':False}
        status,r=self.manager.request('attachments','POST',payload)
        self.assertEqual(status,200,r)
        self.assertNotIn('content',r)
        self.assertEqual(self.family.request('attachments/'+r['id']+'/download')[0],403)
        self.assertEqual(self.manager.request('attachments/'+r['id']+'/download')[1],b'%PDF-1.4\nTest')
        self.assertEqual(self.manager.request('attachments','POST',dict(payload,content=base64.b64encode(b'<script>').decode()))[0],400)
        self.assertEqual(self.manager.request('attachments','POST',dict(payload,content=base64.b64encode(b'%PDF-1.4\n'+b'x'*20000).decode()))[0],200)

    def test_account_lock_revokes_session(self):
        status,_=self.admin.request('users/FAMILY','PATCH',{'role':'FAMILY','active':False})
        self.assertEqual(status,200)
        self.assertEqual(self.family.request('me')[0],401)

    def test_no_passwords_returned(self):
        _,users=self.admin.request('users')
        self.assertTrue(all('password' not in u for u in users))
        with server.connect() as db:
            stored=db.execute("SELECT password FROM users WHERE id='FAMILY'").fetchone()[0]
        self.assertNotEqual(stored,'long-test-password')

    def test_family_cannot_resolve_request(self):
        status,r=self.family.request('requests','POST',{'resident':self.resident['id'],'title':'Help','status':'Hoàn tất','response':'Forged'})
        self.assertEqual(status,200)
        self.assertEqual(r['status'],'Chờ xử lý')
        self.assertEqual(r['response'],'')

    def test_activity_capacity(self):
        status,a=self.manager.request('activities','POST',{'name':'Garden','date':date.today().isoformat(),'capacity':1,'active':True})
        self.assertEqual(status,200)
        payload={'resident':self.resident['id'],'activity_id':a['id']}
        self.assertEqual(self.family.request('enrollments','POST',payload)[0],200)
        self.assertEqual(self.family.request('enrollments','POST',payload)[0],409)

    def test_totp_mfa(self):
        _,setup=self.family.request('mfa/setup','POST',{'password':'long-test-password'})
        def otp(step):
            digest=hmac.new(base64.b32decode(setup['secret']),struct.pack('>Q',step),hashlib.sha1).digest()
            offset=digest[-1]&15
            return f'{(struct.unpack(">I",digest[offset:offset+4])[0]&0x7fffffff)%1000000:06}'
        step=int(time.time()//30)
        self.assertEqual(self.family.request('mfa/enable','POST',{'password':'long-test-password','otp':otp(step-1)})[0],200)
        client=Client(self.port)
        payload={'email':'family@test.example','password':'long-test-password'}
        self.assertEqual(client.request('login','POST',payload)[0],401)
        self.assertEqual(client.request('login','POST',dict(payload,otp=otp(step)))[0],200)
        self.assertEqual(client.request('login','POST',dict(payload,otp=otp(step)))[0],401)


if __name__=='__main__':
    unittest.main(verbosity=2)
