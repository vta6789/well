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
from contextlib import closing
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
            for role in ['FAMILY', 'MANAGER', 'ADMIN', 'NURSE', 'ACCOUNTANT', 'SENIOR', 'EXPERT']:
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
        payload = {'email': role.lower()+'@test.example', 'password': 'long-test-password'}
        status, result = client.request('login', 'POST', payload)
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
        self.assertEqual(self.admin.request('vitals')[1][0]['id'],result['id'])

    def test_admin_receives_and_manages_family_information(self):
        booking = self.booking()
        _, request = self.family.request('requests', 'POST', {'resident': self.resident['id'], 'title': 'Family needs assistance'})
        self.assertEqual(self.admin.request('residents')[1][0]['id'], self.resident['id'])
        self.assertEqual(self.admin.request('bookings')[1][0]['id'], booking['id'])
        self.assertEqual(self.admin.request('requests')[1][0]['id'], request['id'])
        status, result = self.admin.request('requests/'+request['id'], 'PATCH', {'status': 'Hoàn tất', 'response': 'Received by admin'})
        self.assertEqual(status, 200, result)
        self.assertEqual(self.family.request('requests')[1][0]['response'], 'Received by admin')
        status, result = self.admin.request('residents/'+self.resident['id'], 'PATCH', {'staff_ids': ['NURSE'], 'family_ids': ['FAMILY']})
        self.assertEqual(status, 200, result)
        self.assertEqual(result['staff_ids'], ['NURSE'])
        self.assertEqual(self.admin.request('users')[0], 200)
        self.assertEqual(self.admin.request('audit')[0], 200)
        self.assertEqual(self.admin.request('export')[0], 200)
        for kind in server.POLICY:
            self.assertIn('ADMIN', server.POLICY[kind], kind)

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
        # Historical paid bookings retain their quotation after free experiences launch.
        b['total'] = 500000
        with server.connect() as db:
            server.update(db, b['id'], b)
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


    def test_registration_without_phone_and_password_login(self):
        for email in ['first@test.example', 'second@test.example']:
            client = Client(self.port)
            payload = {'name': 'Family', 'email': email, 'password': 'another-long-password'}
            status, result = client.request('register', 'POST', payload)
            self.assertEqual(status, 200, result)
            self.assertEqual(result['user']['phone'], '')
            self.assertIn('csrf', result)
            self.assertEqual(client.request('me')[0], 200)
            client.request('logout', 'POST', {})
            self.assertEqual(client.request('login', 'POST', payload)[0], 200)
            self.assertEqual(client.request('login', 'POST', dict(payload, password='wrong'))[0], 401)
        duplicate = Client(self.port)
        self.assertEqual(duplicate.request('register', 'POST', payload)[0], 409)

    def test_paid_packages_and_safe_registration_roles(self):
        self.assertEqual({p['days']: p['price'] for p in self.packages}, {1: 450000, 7: 2000000, 30: 9000000})
        booking = self.booking()
        self.assertEqual(booking['total'], self.packages[0]['price'])
        self.assertEqual(self.accountant.request('payments', 'POST', {'booking_id': booking['id'], 'amount': booking['total']+1, 'reference': 'overcharge', 'type': 'Thu tiền'})[0], 400)
        status, result = self.admin.request('packages/'+self.packages[0]['id'], 'PATCH', {'price': 999999})
        self.assertEqual(status, 200, result)
        self.assertEqual(result['price'], 999999)
        with server.connect() as db:
            server.migrate_packages(db)
        self.assertEqual(next(p for p in self.family.request('packages')[1] if p['id'] == result['id'])['price'], 999999)
        # Restore the catalogue for the remaining independently run cases.
        self.admin.request('packages/'+result['id'], 'PATCH', {'price': self.packages[0]['price']})
        senior = Client(self.port)
        status, result = senior.request('register', 'POST', {'name': 'Senior learner', 'email': 'new-senior@test.example', 'password': 'senior-test-password', 'account_type': 'SENIOR', 'role': 'ADMIN'})
        self.assertEqual(status, 200, result)
        self.assertEqual(result['user']['role'], 'SENIOR')

    def test_package_entitlements_are_server_calculated_and_immutable(self):
        for tier, price, priority in [('day', 450000, 0), ('week', 2000000, 1), ('month', 9000000, 2)]:
            package = next(p for p in self.packages if p['health_tier'] == tier)
            status, b = self.family.request('bookings', 'POST', {'resident': self.resident['id'], 'package_id': package['id'], 'start': date.today().isoformat(), 'duration': 2, 'total': 1, 'service_priority': 99, 'health_entitlements': {'expert_checkups': True}})
            self.assertEqual(status, 200, b)
            self.assertEqual(b['total'], price * 2)
            self.assertEqual(b['service_priority'], priority)
            self.assertTrue(all(b['health_entitlements'][key] for key in ['all_activities', 'workshops', 'talkshows', 'food_and_drinks', 'basic_screening']))
            self.assertEqual(b['health_entitlements']['expert_checkups'], tier == 'month')
            self.assertEqual(b['health_entitlements']['monitoring_days'], 14 if tier == 'week' else 0)
            status, changed = self.admin.request('bookings/'+b['id'], 'PATCH', {'service_priority': 99, 'total': 1, 'health_tier': 'month', 'health_entitlements': {}})
            self.assertEqual(status, 200, changed)
            for key in ['total', 'service_priority', 'health_tier', 'health_entitlements']:
                self.assertEqual(changed[key], b[key])

    def test_case_priority_requires_confirmed_unexpired_package(self):
        package = next(p for p in self.packages if p['health_tier'] == 'month')
        _, b = self.family.request('bookings', 'POST', {'resident': self.resident['id'], 'package_id': package['id'], 'start': date.today().isoformat(), 'duration': 1})
        _, request = self.family.request('requests', 'POST', {'resident': self.resident['id'], 'title': 'Help', 'service_priority': 99})
        self.assertEqual(request['service_priority'], 0)
        status, confirmed = self.admin.request('bookings/'+b['id'], 'PATCH', {'status': 'Đã xác nhận', 'room_id': self.rooms[0]['id']})
        self.assertEqual(status, 200, confirmed)
        self.assertEqual(self.admin.request('requests')[1][0]['service_priority'], 2)
        _, request = self.family.request('requests/'+request['id'], 'PATCH', {'notes': 'Update', 'service_priority': 99})
        self.assertEqual(request['service_priority'], 2)
        self.admin.request('bookings/'+b['id'], 'PATCH', {'status': 'Đã hủy'})
        self.assertEqual(self.admin.request('requests')[1][0]['service_priority'], 0)
        _, request = self.family.request('requests/'+request['id'], 'PATCH', {'notes': 'After cancellation'})
        self.assertEqual(request['service_priority'], 0)

    def test_catalog_upgrade_preserves_historical_bookings_and_later_prices(self):
        with closing(sqlite3.connect(':memory:')) as db:
            db.row_factory = sqlite3.Row
            db.execute('CREATE TABLE records(id TEXT,kind TEXT,owner TEXT,resident TEXT,body TEXT,created_at TEXT,updated_at TEXT)')
            package_id = server.insert(db, 'packages', '', '', {'name': 'Học nghề', 'price': 0, 'days': 7, 'active': True})
            booking_id = server.insert(db, 'bookings', '', '', {'package_id': package_id, 'total': 0, 'package_name': 'Học nghề'})
            server.migrate_packages(db)
            package = server.get_record(db, package_id)
            self.assertEqual(package['price'], 2000000)
            self.assertEqual(package['health_tier'], 'week')
            self.assertEqual(server.get_record(db, booking_id)['total'], 0)
            self.assertEqual(server.get_record(db, booking_id)['package_name'], 'Học nghề')
            package['price'] = 2100000
            server.update(db, package_id, package)
            server.migrate_packages(db)
            self.assertEqual(server.get_record(db, package_id)['price'], 2100000)

    def test_english_content_requires_same_consent_and_moderation(self):
        _, workshop = self.admin.request('activities', 'POST', {'name': 'Vườn rau', 'name_en': 'Vegetable garden', 'description_en': 'Learn gardening', 'date': date.today().isoformat(), 'capacity': 2, 'active': True})
        public = Client(self.port).request('public')[1]
        self.assertEqual(public['workshops'][0]['name_en'], 'Vegetable garden')
        _, garden = self.family.request('gardens', 'POST', {'resident': self.resident['id'], 'name': 'Bác An', 'focus': 'Rau', 'focus_en': 'Vegetables', 'story_en': 'My garden story', 'public_consent': True})
        self.assertEqual(Client(self.port).request('public')[1]['artisans'], [])
        self.admin.request('gardens/'+garden['id'], 'PATCH', {'publication': 'Đã duyệt'})
        public = Client(self.port).request('public')[1]
        self.assertEqual(public['artisans'][0]['story_en'], 'My garden story')
        self.assertNotIn('resident', public['artisans'][0])
        self.family.request('gardens/'+garden['id'], 'PATCH', {'story_en': 'An edited story'})
        self.assertEqual(Client(self.port).request('public')[1]['artisans'], [])

    def test_workshop_waitlist_and_expert_access(self):
        expert = self.login('EXPERT')
        _, workshop = self.admin.request('activities', 'POST', {'name': 'Learn farming', 'date': date.today().isoformat(), 'capacity': 1, 'active': True, 'expert_id': 'EXPERT', 'topic': 'Nông nghiệp', 'fitness': 'Nhẹ nhàng'})
        self.assertEqual(expert.request('residents')[1], [])
        _, enrolled = self.family.request('enrollments', 'POST', {'resident': self.resident['id'], 'activity_id': workshop['id']})
        self.assertEqual(enrolled['status'], 'Đã đăng ký')
        self.assertEqual(expert.request('residents')[1][0]['name'], self.resident['name'])
        self.assertNotIn('phone', expert.request('residents')[1][0])
        self.assertEqual(expert.request('vitals')[1], [])
        _, other_workshop = self.admin.request('activities', 'POST', {'name': 'Another workshop', 'date': date.today().isoformat(), 'capacity': 10, 'active': True})
        _, other_enrollment = self.family.request('enrollments', 'POST', {'resident': self.resident['id'], 'activity_id': other_workshop['id']})
        self.assertEqual(expert.request('enrollments/'+other_enrollment['id'], 'PATCH', {'status': 'Đã tham gia'})[0], 403)
        self.assertEqual(expert.request('enrollments', 'POST', {'resident': self.resident['id'], 'activity_id': other_workshop['id']})[0], 403)
        _, second = self.family.request('residents', 'POST', {'name': 'Second learner', 'dob': '1950-01-01'})
        status, waiting = self.family.request('enrollments', 'POST', {'resident': second['id'], 'activity_id': workshop['id'], 'waitlist': True})
        self.assertEqual(status, 200, waiting)
        self.assertEqual(waiting['status'], 'Danh sách chờ')
        self.assertEqual(self.admin.request('enrollments/'+waiting['id'], 'PATCH', {'status': 'Đã đăng ký'})[0], 409)
        self.family.request('enrollments/'+enrolled['id'], 'PATCH', {'status': 'Đã hủy'})
        self.assertEqual(self.admin.request('enrollments/'+waiting['id'], 'PATCH', {'status': 'Đã đăng ký'})[0], 200)
        public = Client(self.port).request('public')[1]
        self.assertEqual(next(w for w in public['workshops'] if w['id'] == workshop['id'])['remaining'], 0)

    def test_learning_portfolio_consent_and_impact(self):
        expert = self.login('EXPERT')
        _, workshop = self.admin.request('activities', 'POST', {'name': 'Learn gardening', 'date': date.today().isoformat(), 'capacity': 10, 'active': True, 'expert_id': 'EXPERT'})
        self.family.request('enrollments', 'POST', {'resident': self.resident['id'], 'activity_id': workshop['id']})
        _, skill = self.family.request('skills', 'POST', {'resident': self.resident['id'], 'title': 'Grow vegetables', 'activity_id': workshop['id'], 'status': 'Đã học'})
        self.assertEqual(skill['status'], 'Chờ xác nhận')
        self.assertEqual(expert.request('skills/'+skill['id'], 'PATCH', {'status': 'Đã học'})[0], 200)
        _, garden = self.family.request('gardens', 'POST', {'resident': self.resident['id'], 'name': 'Silver artisan', 'focus': 'Vegetables', 'story': 'Learning story', 'public_consent': True, 'publication': 'Đã duyệt'})
        self.assertEqual(garden['publication'], 'Chờ duyệt')
        _, product = self.family.request('products', 'POST', {'resident': self.resident['id'], 'name': 'Herb pot', 'description': 'Grown in my garden', 'quantity': 2, 'unit': 'pots', 'public_consent': True})
        self.assertEqual(Client(self.port).request('public')[1]['artisans'], [])
        self.admin.request('gardens/'+garden['id'], 'PATCH', {'publication': 'Đã duyệt'})
        self.admin.request('products/'+product['id'], 'PATCH', {'publication': 'Đã duyệt'})
        public = Client(self.port).request('public')[1]
        self.assertEqual(public['artisans'][0]['skills_count'], 1)
        self.assertEqual(len(public['products']), 1)
        self.assertNotIn('resident', public['artisans'][0])
        self.assertNotIn('phone', public['artisans'][0])
        _, tour = self.family.request('tour_bookings', 'POST', {'artisan_id': garden['id'], 'date': date.today().isoformat(), 'guests': 3, 'contact': 'visitor@example.test', 'status': 'Đã tham quan'})
        self.assertEqual(tour['status'], 'Chờ duyệt')
        self.admin.request('tour_bookings/'+tour['id'], 'PATCH', {'status': 'Đã tham quan'})
        self.assertEqual(Client(self.port).request('public')[1]['impact']['visitors'], 3)
        self.family.request('gardens/'+garden['id'], 'PATCH', {'public_consent': False})
        self.assertEqual(Client(self.port).request('public')[1]['artisans'], [])
        self.assertEqual(Client(self.port).request('public')[1]['products'], [])

    def test_expert_application_requires_admin_approval(self):
        _, application = self.family.request('expert_applications', 'POST', {'specialty': 'Gardening', 'bio': 'Experienced gardener', 'status': 'Đã duyệt'})
        self.assertEqual(application['status'], 'Chờ duyệt')
        self.assertEqual(self.family.request('me')[1]['user']['role'], 'FAMILY')
        self.assertEqual(self.admin.request('expert_applications/'+application['id'], 'PATCH', {'status': 'Đã duyệt'})[0], 200)
        self.assertEqual(self.family.request('me')[0], 401)
        self.assertEqual(self.login('FAMILY').request('me')[1]['user']['role'], 'EXPERT')


if __name__=='__main__':
    unittest.main(verbosity=2)
