"""Protect the user's original presentation while adding server-backed modules."""
import unittest
import html
from html.parser import HTMLParser
from pathlib import Path

class Inspect(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids=set()
        self.handlers=[]
        self.actions=[]
    def handle_starttag(self,tag,attrs):
        for key,value in attrs:
            if key=='id':self.ids.add(value)
            if key.startswith('on'):self.handlers.append(key)
            if key=='data-action':self.actions.append(value)

class OriginalProjectTests(unittest.TestCase):
    def test_original_content_and_sections_remain(self):
        source=(Path(__file__).parent/'index.html').read_text(encoding='utf-8')
        parsed=Inspect();parsed.feed(source)
        for section in ['sec-home','sec-about','sec-zones','sec-process','sec-nabc','sec-packages','navAuthArea']:
            self.assertIn(section,parsed.ids)
        for content in ['Trương Huỳnh Phương Khanh','25DATA1','278+','Nơi Tận Hưởng Tuổi Già An Yên, Khỏe Mạnh &amp; Kết Nối','Cơ Chế Hoạt Động 8 Bước Chuẩn Hóa','Mô Hình Khung NABC','Gói Theo Ngày','Gói Theo Tuần','Gói Theo Tháng','/assets/images/farm.jpg']:
            self.assertIn(html.unescape(content),html.unescape(source))

    def test_legacy_auth_and_inline_handlers_are_removed(self):
        source=(Path(__file__).parent/'index.html').read_text(encoding='utf-8')
        parsed=Inspect();parsed.feed(source)
        self.assertEqual(parsed.handlers,[])
        self.assertNotIn('admin123',source)
        self.assertNotIn('wf_users',source)
        self.assertNotIn('cdn.tailwindcss.com',source)
        for action in ['original-home','original-packages','original-section','original-book']:
            self.assertIn(action,parsed.actions)

if __name__=='__main__':unittest.main(verbosity=2)
