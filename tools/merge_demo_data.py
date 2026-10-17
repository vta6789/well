"""One-time merge of this project's demo accounts/catalogue into local data.

Run only while both application servers are stopped. Refuses unexpected data.
"""
import json
import sqlite3
from datetime import datetime
from pathlib import Path

root = Path(__file__).resolve().parents[1]
local_path = root / 'data/production/wellness.sqlite3'
demo_path = root / 'data/public-demo/wellness.sqlite3'
stamp = datetime.now().strftime('%Y%m%d-%H%M%S')
with sqlite3.connect(local_path) as local, sqlite3.connect(demo_path) as demo:
    local.row_factory = demo.row_factory = sqlite3.Row
    for path, db in [(local_path, local), (demo_path, demo)]:
        with sqlite3.connect(path.parent / f'backup-before-merge-{stamp}.sqlite3') as backup:
            db.backup(backup)
        assert db.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
    assert not demo.execute('SELECT 1 FROM mfa').fetchone(), 'Unexpected demo MFA data'
    local.execute('PRAGMA foreign_keys=ON')
    local.execute('BEGIN IMMEDIATE')
    emails = {r['email'].lower(): r for r in local.execute('SELECT * FROM users')}
    users = list(demo.execute('SELECT * FROM users'))
    assert not any(r['email'].lower() in emails for r in users), 'Overlapping accounts require manual review'
    record_map = {}
    for row in demo.execute('SELECT * FROM records'):
        assert row['kind'] in ('packages', 'rooms') and row['owner'] is None, 'Unexpected demo business data'
        body = json.loads(row['body'])
        matches = [r for r in local.execute('SELECT * FROM records WHERE kind=?', (row['kind'],))
                   if json.loads(r['body']).get('name') == body.get('name')]
        assert len(matches) == 1, 'Catalogue mismatch requires manual review'
        record_map[row['id']] = matches[0]['id']
    for row in users:
        local.execute('INSERT INTO users VALUES(?,?,?,?,?,?,?,?)', tuple(row))
    for row in demo.execute('SELECT * FROM audit'):
        existing = local.execute('SELECT * FROM audit WHERE id=?', (row['id'],)).fetchone()
        values = list(row)
        values[5] = record_map.get(row['record_id'], row['record_id'])
        if existing:
            assert tuple(existing) == tuple(values), 'Audit collision'
        else:
            local.execute('INSERT INTO audit VALUES(?,?,?,?,?,?,?)', values)
    assert not local.execute('PRAGMA foreign_key_check').fetchall()
    local.commit()
    print('Merged demo accounts:', len(users))
    print('Shared accounts:', local.execute('SELECT count(*) FROM users').fetchone()[0])
    print('Integrity:', local.execute('PRAGMA integrity_check').fetchone()[0])
    print('Original demo database preserved; sessions were not imported.')
