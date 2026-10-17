"""Add natural-looking fictional community data with private provenance."""
import os, sys, sqlite3, secrets, json
from pathlib import Path
from datetime import date, timedelta, datetime
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
os.environ['WF_DATA_DIR'] = str(ROOT / 'data/production')
import server

people = [('Phạm Quốc Huy','phamquochuy'),('Đặng Thu Hà','dangthuha'),('Võ Minh Tuấn','vominhtuan'),
('Bùi Ngọc Mai','buingocmai'),('Đỗ Hoàng Nam','dohoangnam'),('Hoàng Thanh Trúc','hoangthanhtruc'),
('Ngô Đức Thành','ngoducthanh'),('Dương Thị Lan','duongthilan'),('Lý Gia Bảo','lygiabao'),
('Phan Hồng Nhung','phanhongnhung'),('Trương Anh Khoa','truonganhkhoa'),('Vũ Khánh Linh','vukhanhlinh'),
('Mai Văn Sơn','maivanson'),('Hồ Ngọc Thảo','hongocthao'),('Cao Minh Phúc','caominhphuc')]

EMAIL_DOMAINS = ("wellness.com",)
def community_email(handle, index):
 return handle + "@" + EMAIL_DOMAINS[index % len(EMAIL_DOMAINS)]

def main():
 with server.connect() as db:
  existing = {r['email'] for r in db.execute('SELECT email FROM users')}
  emails = [community_email(handle, i) for i,(_,handle) in enumerate(people)]
  assert len(set(emails))==15 and not (set(emails)&existing), 'Accounts already exist; refusing to duplicate'
  with sqlite3.connect(server.DATA / ('backup-before-community-'+datetime.now().strftime('%Y%m%d-%H%M%S')+'.sqlite3')) as backup: db.backup(backup)
  db.execute('BEGIN IMMEDIATE')
  experts = list(map(tuple,db.execute("SELECT * FROM users WHERE role='EXPERT'")))
  db.execute('CREATE TABLE IF NOT EXISTS seed_entities(entity_type TEXT,entity_id TEXT,source TEXT,PRIMARY KEY(entity_type,entity_id))')
  def mark(kind,id): db.execute('INSERT OR IGNORE INTO seed_entities VALUES(?,?,?)',(kind,id,'fictional-community'))
  def add(user,kind,body,resident=None):
   id=server.insert(db,kind,user['id'],resident,server.validate(db,user,kind,body));mark(kind,id)
   server.audit(db,user,'Tạo dữ liệu cộng đồng',kind,id);return id
  admin=server.public_user(db.execute("SELECT * FROM users WHERE role='ADMIN' AND active=1 LIMIT 1").fetchone())
  old_accounts=[]
  for i,handle in enumerate(['nguyenvanan','tranthibinh','leminhchi'],1):
   row=db.execute('SELECT id,email FROM users WHERE email=?',(f'mau{i}@example.invalid',)).fetchone()
   if row:
    email=community_email(handle, i-1);assert email not in existing
    db.execute('UPDATE users SET email=? WHERE id=?',(email,row['id']));mark('users',row['id']);old_accounts.append((row['email'],email))
    for record in db.execute('SELECT * FROM records WHERE owner=?',(row['id'],)).fetchall():
     body=json.loads(record['body']);mark(record['kind'],record['id'])
     for key,value in list(body.items()):
      if isinstance(value,str):
       body[key]=value.replace('[MẪU] ','')
       if 'Dữ liệu giả để kiểm thử' in body[key]: body[key]='Mong được hướng dẫn lịch phù hợp và các bước chuẩn bị trước khi tham gia.'
     if record['kind']=='visits': body['visitor']=['Nguyễn Minh Đức','Trần Ngọc Anh','Lê Minh Chi'][i-1]
     db.execute('UPDATE records SET body=? WHERE id=?',(json.dumps(body,ensure_ascii=False),record['id']))
  for record in db.execute("SELECT * FROM records WHERE kind='activities'").fetchall():
   body=json.loads(record['body'])
   if body.get('name') in ['[MẪU] Trải nghiệm gieo hạt','[MẪU] Thực hành ghi nhật ký số'] and not body.get('expert_id'):
    mark('activities',record['id']);body['name']=body['name'].replace('[MẪU] ','');body['location']='Vườn trải nghiệm' if body['topic']=='Nông nghiệp' else 'Phòng sinh hoạt cộng đồng'
    body['description']='Cùng thực hành từng bước, trao đổi kinh nghiệm và mang về một kế hoạch nhỏ để tiếp tục tại nhà.'
    db.execute('UPDATE records SET body=? WHERE id=?',(json.dumps(body,ensure_ascii=False),record['id']))
  today=date.today()
  for offset,name,topic,format,time,location in [(8,'Chăm cây trong không gian nhỏ','Nông nghiệp','Workshop','08:30','Vườn trải nghiệm'),(12,'Làm thiệp từ giấy tái chế','Thủ công','Workshop','14:00','Nhà sinh hoạt'),(18,'Kết nối gia đình qua nhật ký ảnh','Số hóa','Talkshow','09:30','Phòng sinh hoạt cộng đồng')]:
   add(admin,'activities',dict(name=name,topic=topic,format=format,fitness='Nhẹ nhàng',expert_id='',assignee='',date=(today+timedelta(days=offset)).isoformat(),time=time,location=location,capacity=20,active=True,description='Một buổi gặp gỡ để thực hành, chia sẻ cách làm và trao đổi những trải nghiệm trong cuộc sống hằng ngày.'))
  activities=[a for a in server.rows(db,'activities') if a.get('active') and a.get('date','')>=today.isoformat() and not a.get('expert_id')]
  packages=[p for p in server.rows(db,'packages') if p.get('active')]
  lines=[]
  for i,(name,handle) in enumerate(people):
   email=community_email(handle, i);password='WF-'+secrets.token_urlsafe(14);id=server.uid()
   db.execute('INSERT INTO users VALUES(?,?,?,?,?,?,?,?)',(id,name,email,'',server.password_hash(password),'FAMILY',1,server.now()));mark('users',id)
   user=dict(id=id,name=name,role='FAMILY')
   resident=add(user,'residents',dict(name=name,dob=f'{1954+i%15}-0{1+i%9}-{10+i%18}',phone='',consent=False,staff_ids=[],family_ids=[],mobility='Tự đi lại',habits=['Thích chăm cây và đi bộ buổi sáng.','Quan tâm hoạt động thủ công cùng gia đình.','Muốn học cách lưu ảnh và viết nhật ký.'][i%3]))
   add(user,'enrollments',dict(resident=resident,activity_id=activities[i%len(activities)]['id'],notes=['Muốn tham gia cùng người thân.','Xin hướng dẫn các vật dụng cần chuẩn bị.','Ưu tiên hoạt động nhẹ nhàng.'][i%3]),resident)
   if i%2==0: add(user,'bookings',dict(resident=resident,package_id=packages[i%len(packages)]['id'],duration=1,start=(today+timedelta(days=6+i)).isoformat(),notes='Gia đình mong được xác nhận lịch và tư vấn trước khi đến.'),resident)
   if i%3==0: add(user,'requests',dict(resident=resident,title=['Hỏi giờ đón tiếp','Tư vấn lịch tham gia cuối tuần','Hỏi về bữa ăn trong ngày'][i//3%3],priority='Thông thường',notes='Nhờ đội ngũ tư vấn thêm để gia đình sắp xếp thời gian.'),resident)
   if i<4:
    titles=['Bắt đầu trồng một chậu rau nhỏ','Một buổi chiều làm thiệp cùng mẹ','Cách tôi giữ lại những bức ảnh gia đình','Đi bộ buổi sáng và những điều dễ thương']
    contents=['Tôi đang thử trồng rau trên ban công. Mỗi sáng chăm cây vài phút giúp tôi thấy ngày mới nhẹ nhàng hơn. Mọi người có kinh nghiệm chọn đất và tưới nước không?','Cuối tuần vừa rồi, mẹ con tôi tận dụng giấy cũ để làm thiệp. Thành phẩm chưa hoàn hảo nhưng cả nhà có một buổi chiều rất vui.','Tôi bắt đầu gom ảnh theo từng tháng và ghi thêm vài dòng về kỷ niệm trong ảnh. Nếu ai có cách sắp xếp đơn giản, cùng chia sẻ nhé.','Sáng nay tôi đi bộ chậm quanh vườn và thấy một bông hoa vừa nở. Tôi muốn giữ thói quen này mỗi ngày, mọi người thường đi bộ lúc mấy giờ?']
    post=server.insert(db,'forum_posts',id,None,dict(title=titles[i],content=contents[i]));mark('forum_posts',post)
   lines.append(f'{email} | FAMILY | {password}')
  assert experts==list(map(tuple,db.execute("SELECT * FROM users WHERE role='EXPERT'")))
  assert not db.execute('PRAGMA foreign_key_check').fetchall()
  assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
  file=server.DATA/'community-accounts.txt';file.write_text('\n'.join(lines)+'\n',encoding='utf-8')
  oldfile=server.DATA/'sample-user-accounts.txt'
  if oldfile.exists():
   content=oldfile.read_text(encoding='utf-8')
   for old,new in old_accounts: content=content.replace(old,new)
   oldfile.write_text(content,encoding='utf-8')
 print('Added 15 unique accounts, 15 enrollments, 8 pending bookings, 5 requests, 3 unassigned activities and 4 forum posts. Experts unchanged; backup and provenance saved.')
if __name__=='__main__': main()
