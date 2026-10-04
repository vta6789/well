"""Normalize imported presentation to the current local application shell."""

import re


def modernize(document):
    document = document.replace("Giảm Saút", "Giảm Sút").replace("Kết Thừa", "Kết Hợp")
    document = re.sub(
        r' <link href="https://fonts.googleapis.com[^\n]+\n', "", document
    )
    document = re.sub(
        r'https://images.unsplash.com/[^" ]+', "/assets/images/farm.jpg", document
    )
    scripts = "\n".join(
        f' <script src="/frontend/{name}.js" defer></script>'
        for name in [
            "core",
            "components",
            "navigation",
            "pages",
            "forms",
            "account",
            "events",
            "bootstrap",
        ]
    )
    document = document.replace(' <script src="/app.js" defer></script>', scripts)
    document = document.replace(
        '<dialog id="modal"', '<dialog role="dialog" aria-modal="true" id="modal"'
    )
    return document.replace(
        ' <link rel="stylesheet" href="/style.css">',
        ' <link rel="stylesheet" href="/assets/fonts/fonts.css">\n <link rel="stylesheet" href="/style.css">\n <link rel="stylesheet" href="/design-tokens.css">',
    )
