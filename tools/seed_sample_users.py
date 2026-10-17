"""Add labelled fictional learners only; preserve all existing users and records."""
import os
import sys
import secrets
import sqlite3
from pathlib import Path
from datetime import date, timedelta, datetime

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
os.environ['WF_DATA_DIR'] = str(ROOT / 'data/production')
import server

def main():
    server.init_db()
    credentials = server.DATA / 'sample-user-accounts.txt'
    with server.connect() as db:
        if db.execute("SELECT 1 FROM users WHERE email IN (?,?,?)", tuple(f'mau{i}@example.invalid' for i in range(1, 4))).fetchone():
            raise SystemExit('Sample accounts already exist; refused to duplicate or reset passwords.')
        backup_path = server.DATA / ('backup-before-samples-' + datetime.now().strftime('%Y%m%d-%H%M%S') + '.sqlite3')
        with sqlite3.connect(backup_path) as backup:
            db.backup(backup)
        db.execute('BEGIN IMMEDIATE')
        existing_users = list(map(tuple, db.execute('SELECT * FROM users ORDER BY id')))
        existing_records = list(map(tuple, db.execute('SELECT * FROM records ORDER BY id')))
        admin_row = db.execute("SELECT * FROM users WHERE role='ADMIN' AND active=1 LIMIT 1").fetchone()
        assert admin_row, 'An existing administrator is required to create unassigned sample activities.'
        admin = server.public_user(admin_row)
        today = date.today()
        note = '[MẪU] Dữ liệu giả để kiểm thử, không phải yêu cầu vận hành thật.'
        def add(user, kind, body, resident=None):
            validated = server.validate(db, user, kind, body)
            record = server.insert(db, kind, user['id'], resident, validated)
            server.audit(db, user, '[MẪU] Tạo dữ liệu kiểm thử', kind, record)
            return record
        activities = []
        for offset, name, topic in [(3, 'Trải nghiệm gieo hạt', 'Nông nghiệp'), (5, 'Thực hành ghi nhật ký số', 'Số hóa')]:
            activities.append(add(admin, 'activities', dict(name='[MẪU] ' + name,
                topic=topic, format='Workshop', fitness='Nhẹ nhàng', expert_id='', assignee='',
                date=(today + timedelta(days=offset)).isoformat(), time='09:00',
                location='[MẪU] Khu trải nghiệm', capacity=10, active=True, description=note)))
        packages = sorted((p for p in server.rows(db, 'packages') if p.get('active')), key=lambda p:p['days'])
        assert packages, 'No active packages'
        lines = ['TAI KHOAN MAU - chi dung cho website nay; email khong nhan thu.']
        for i, (name, role, birth) in enumerate([
            ('Nguyễn Văn An', 'FAMILY', '1956-04-12'),
            ('Trần Thị Bình', 'FAMILY', '1961-08-20'),
            ('Lê Minh Chi', 'FAMILY', '1959-11-03'),
        ], 1):
            email = f'mau{i}@example.invalid'
            password = 'Mau-' + secrets.token_urlsafe(14)
            user_id = server.uid()
            db.execute('INSERT INTO users VALUES(?,?,?,?,?,?,?,?)',
                (user_id, name, email, '', server.password_hash(password), role, 1, server.now()))
            user = dict(id=user_id, name=name, role=role)
            resident = add(user, 'residents', dict(name=name if i < 3 else 'Lê Thị Hương',
                dob=birth, phone='', emergency='', health='', allergies='', diet='',
                mobility='Tự đi lại', habits=note, consent=False, staff_ids=[], family_ids=[]))
            package = packages[(i - 1) % len(packages)]
            add(user, 'bookings', dict(resident=resident, package_id=package['id'], duration=1,
                start=(today+timedelta(days=7+i)).isoformat(), notes=note), resident)
            add(user, 'enrollments', dict(resident=resident, activity_id=activities[(i-1)%2], notes=note), resident)
            add(user, 'requests', dict(resident=resident, title='[MẪU] '+[
                'Hỏi lịch trải nghiệm vườn', 'Xin tư vấn chọn gói lưu trú', 'Hỏi thủ tục đăng ký cho người thân'][i-1],
                priority='Thông thường', notes=note), resident)
            add(user, 'visits', dict(resident=resident, visitor='[MẪU] Người thân '+str(i),
                date=(today+timedelta(days=10+i)).isoformat(), time='14:00', phone='', notes=note), resident)
            add(user, 'practice', dict(resident=resident, title='[MẪU] Kế hoạch thực hành tuần đầu',
                date=today.isoformat(), notes=note, result='[MẪU] Chưa thực hiện'), resident)
            lines.append(f'{email} | {role} | {password}')
            assert server.password_ok(password, db.execute('SELECT password FROM users WHERE id=?', (user_id,)).fetchone()[0])
        for row in existing_users:
            assert tuple(db.execute('SELECT * FROM users WHERE id=?', (row[0],)).fetchone()) == row
        for row in existing_records:
            assert tuple(db.execute('SELECT * FROM records WHERE id=?', (row[0],)).fetchone()) == row
        assert not db.execute('PRAGMA foreign_key_check').fetchall()
        assert db.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
        credentials.write_text('\n'.join(lines)+'\n', encoding='utf-8')
    print('Created 3 sample users, 2 unassigned activities, 3 profiles, 3 enrollments, 3 bookings, 3 requests, 3 visits, 3 practice entries.')
    print('Existing users/records unchanged. Password verification and database checks passed.')
    print('Credentials: data/production/sample-user-accounts.txt')

if __name__ == '__main__':
    main()
