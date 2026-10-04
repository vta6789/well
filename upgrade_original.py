"""Build the upgraded entry document from the user's actual original HTML.

Only presentation sections are retained; legacy browser authentication is replaced
by the existing server API. This never changes the input document.
"""

import argparse
import html
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent


class OriginalPresentation(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.output = []

    def handle_starttag(self, tag, attrs):
        converted = []
        for key, value in attrs:
            if key.startswith("on"):
                if key == "onclick":
                    section = re.fullmatch(r"showSection\('([^']+)'\)", value or "")
                    booking = re.fullmatch(
                        r"startBooking\('[^']+',\s*\d+,\s*'(Ngay|Tuan|Thang)'\)",
                        value or "",
                    )
                    if section:
                        action = {
                            "home": "original-home",
                            "packages": "original-packages",
                            "my-trips": "original-trips",
                            "admin": "original-dashboard",
                        }.get(section[1])
                        if action:
                            converted.append(("data-action", action))
                    elif booking:
                        converted.extend(
                            [
                                ("data-action", "original-book"),
                                (
                                    "data-days",
                                    str(
                                        {"Ngay": 1, "Tuan": 7, "Thang": 30}[booking[1]]
                                    ),
                                ),
                            ]
                        )
                    elif value == "openModal('authModal')":
                        converted.append(("data-action", "login"))
                continue
            if key == "class" and tag == "nav":
                value = value.replace("lg:flex", "xl:flex")
            converted.append((key, value))
        self.output.append(
            "<"
            + tag
            + "".join(
                " "
                + key
                + (
                    '="' + html.escape(value, quote=True) + '"'
                    if value is not None
                    else ""
                )
                for key, value in converted
            )
            + ">"
        )

    def handle_endtag(self, tag):
        self.output.append("</" + tag + ">")

    def handle_data(self, data):
        self.output.append(data)

    def handle_entityref(self, name):
        self.output.append("&" + name + ";")

    def handle_charref(self, name):
        self.output.append("&#" + name + ";")

    def handle_comment(self, data):
        self.output.append("<!--" + data + "-->")


def convert(fragment):
    parser = OriginalPresentation()
    parser.feed(fragment)
    return "".join(parser.output)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    args = parser.parse_args()
    source = args.source.read_text(encoding="utf-8-sig")
    header = re.search(r"<header\b[\s\S]*?</header>", source)[0]
    home = re.search(r'<section id="sec-home"[\s\S]*?</section>', source)[0]
    packages = re.search(r'<section id="sec-packages"[\s\S]*?</section>', source)[0]
    footer = re.search(r"<footer\b[\s\S]*?</footer>", source)[0]
    quick = """<nav class="project-quick-menu" aria-label="Điều hướng trên màn hình nhỏ"><button data-action="original-home">Trang chủ</button><button data-action="original-packages">Gói dưỡng lão</button><button data-action="original-trips">Chuyến đã đăng ký</button><button data-action="original-dashboard">Không gian quản lý</button></nav>"""
    header = header.replace("</header>", quick + "</header>")
    document = (
        """<!doctype html>
<html lang="vi">
<head>
 <meta charset="utf-8">
 <meta name="viewport" content="width=device-width, initial-scale=1">
 <title>Wellness Farm - Nông Trại Dưỡng Lão & Chăm Sóc Sức Khỏe</title>
 <link rel="stylesheet" href="/style.css">
 <link rel="stylesheet" href="/original-theme.css">
 <link rel="stylesheet" href="/assets/fontawesome/css/all.min.css">
 <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
 <script src="/app.js" defer></script>
</head>
<body>
 <a class="skip" href="#main">Đến nội dung chính</a>
 <div id="app"></div>
 <dialog id="modal" aria-labelledby="modal-title"></dialog>
 <div id="toast" role="status" aria-live="polite"></div>
 <template id="original-project">
  <div class="original-site" id="original-site">
"""
        + convert(header)
        + '\n<main class="flex-grow" id="main">'
        + convert(home)
        + convert(packages)
        + "</main>"
        + convert(footer)
        + """
  </div>
 </template>
</body>
</html>
"""
    )
    from project_template import modernize

    document = modernize(document)
    (ROOT / "index.html").write_text(document, encoding="utf-8")
    print(
        "Original layout and all project presentation sections retained; upgraded entry documents written."
    )


if __name__ == "__main__":
    main()
