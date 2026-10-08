"""Local security regression suite; uses only the temporary harness database."""
import http.client
import json
from datetime import date
import test_server as harness
import server


class SecurityTests(harness.WellnessTests):
    def test_only_one_server_can_listen_on_a_local_port(self):
        with server.WellnessHTTPServer(('127.0.0.1', 0), server.Handler) as first:
            with self.assertRaises(OSError):
                with server.WellnessHTTPServer(first.server_address, server.Handler):
                    self.fail('A second server was allowed to share the same port')

    def test_private_learning_and_support_not_visible_to_finance(self):
        _, garden = self.family.request('gardens', 'POST', {'resident': self.resident['id'], 'name': 'Private garden', 'focus': 'Plants', 'story': 'PRIVATE_STORY', 'public_consent': False})
        _, request = self.family.request('requests', 'POST', {'resident': self.resident['id'], 'title': 'PRIVATE_SUPPORT', 'notes': 'PRIVATE_CONTACT'})
        for kind, record in [('gardens', garden), ('requests', request)]:
            with self.subTest(kind=kind):
                status, visible = self.accountant.request(kind)
                self.assertEqual(status, 200)
                self.assertNotIn(record['id'], [r['id'] for r in visible])

    def test_public_catalog_does_not_expose_internal_fields_or_inactive_activities(self):
        _, activity = self.admin.request('activities', 'POST', {'name': 'Public workshop', 'date': date.today().isoformat(), 'capacity': 2, 'active': True, 'notes': 'PRIVATE_STAFF_NOTE', 'internal_email': 'private@example.test'})
        _, inactive = self.admin.request('activities', 'POST', {'name': 'INACTIVE_WORKSHOP', 'date': date.today().isoformat(), 'capacity': 2, 'active': False})
        self.admin.request('packages/'+self.packages[0]['id'], 'PATCH', {'notes': 'PRIVATE_CATALOG_NOTE'})
        self.admin.request('rooms/'+self.rooms[0]['id'], 'PATCH', {'notes': 'PRIVATE_ROOM_NOTE'})
        public = harness.Client(self.port).request('public')[1]
        for marker in ['PRIVATE_STAFF_NOTE', 'private@example.test', 'PRIVATE_CATALOG_NOTE', 'PRIVATE_ROOM_NOTE', inactive['id']]:
            with self.subTest(marker=marker):
                self.assertNotIn(marker, json.dumps(public))
        self.assertIn(activity['id'], [a['id'] for a in public['workshops']])
        self.assertTrue(all('owner' not in a for a in public['activities']))

    def test_successful_other_login_cannot_reset_target_throttle(self):
        attacker = harness.Client(self.port)
        wrong = {'email': 'admin@test.example', 'password': 'wrong-password'}
        for _ in range(14):
            self.assertEqual(attacker.request('login', 'POST', wrong)[0], 401)
        self.assertEqual(attacker.request('login', 'POST', {'email': 'family@test.example', 'password': 'long-test-password'})[0], 200)
        statuses = [attacker.request('login', 'POST', wrong)[0] for _ in range(2)]
        self.assertIn(429, statuses)

    def test_profile_binding_cannot_be_spoofed_to_change_skill_workshop(self):
        def workshop(name):
            return self.admin.request('activities', 'POST', {'name': name, 'date': date.today().isoformat(), 'capacity': 5, 'active': True})[1]
        own_workshop, other_workshop = workshop('Own class'), workshop('Other class')
        self.family.request('enrollments', 'POST', {'resident': self.resident['id'], 'activity_id': own_workshop['id']})
        _, skill = self.family.request('skills', 'POST', {'resident': self.resident['id'], 'title': 'Own skill', 'activity_id': own_workshop['id']})
        other = harness.Client(self.port)
        other.request('register', 'POST', {'name': 'Other', 'email': 'victim@example.test', 'password': 'another-long-password'})
        _, victim = other.request('residents', 'POST', {'name': 'Victim profile', 'dob': '1950-01-01'})
        other.request('enrollments', 'POST', {'resident': victim['id'], 'activity_id': other_workshop['id']})
        status, result = self.family.request('skills/'+skill['id'], 'PATCH', {'resident': victim['id'], 'activity_id': other_workshop['id']})
        self.assertIn(status, [400, 403], result)
        stored = next(r for r in self.family.request('skills')[1] if r['id'] == skill['id'])
        self.assertEqual(stored['resident'], self.resident['id'])
        self.assertEqual(stored['activity_id'], own_workshop['id'])

    def test_nonclinical_role_cannot_create_or_read_unrelated_health(self):
        _, vital = self.admin.request('vitals', 'POST', {'resident': self.resident['id'], 'systolic': 120, 'diastolic': 80, 'pulse': 70, 'spo2': 98})
        self.assertEqual(self.accountant.request('vitals')[1], [])
        self.assertEqual(self.accountant.request('vitals', 'POST', vital)[0], 403)
        self.assertEqual(self.family.request('packages/'+self.packages[0]['id'], 'PATCH', {'price': 1})[0], 403)

    def test_login_sql_injection_and_forged_session_are_rejected(self):
        attacker = harness.Client(self.port)
        status, _ = attacker.request('login', 'POST', {'email': "' OR 1=1 --", 'password': 'invalid-password'})
        self.assertEqual(status, 401)
        attacker.cookie = 'wf_session=forged-admin-session'
        self.assertEqual(attacker.request('users')[0], 401)

    def test_private_assets_and_security_headers(self):
        connection = http.client.HTTPConnection('127.0.0.1', self.port, timeout=10)
        for path in ['/data/production/wellness.sqlite3', '/.env', '/.git/config', '/../server.py', '/assets/../../server.py']:
            connection.request('GET', path)
            response = connection.getresponse()
            response.read()
            self.assertEqual(response.status, 404, path)
        connection.request('GET', '/', headers={'Host': 'attacker.example'})
        response = connection.getresponse(); response.read()
        self.assertEqual(response.status, 400)
        connection.request('GET', '/')
        response = connection.getresponse(); response.read()
        self.assertEqual(response.getheader('X-Frame-Options'), 'DENY')
        self.assertEqual(response.getheader('X-Content-Type-Options'), 'nosniff')
        self.assertIn("script-src 'self'", response.getheader('Content-Security-Policy'))
        connection.close()

    def test_log_out_rejects_stolen_old_cookie(self):
        cookie = self.family.cookie
        self.assertEqual(self.family.request('logout', 'POST', {})[0], 200)
        attacker = harness.Client(self.port); attacker.cookie = cookie
        self.assertEqual(attacker.request('me')[0], 401)


if __name__ == '__main__':
    import unittest
    unittest.main(verbosity=2)
