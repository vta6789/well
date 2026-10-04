"""Copy licensed Fontsource fonts to the public, dependency-free assets."""

from pathlib import Path
import re
import shutil

root = Path(__file__).resolve().parents[1]
source = root / "node_modules/@fontsource/plus-jakarta-sans"
target = root / "assets/fonts"
target.mkdir(parents=True, exist_ok=True)
styles = []
for weight in [300, 400, 500, 600, 700, 800]:
    css = (source / f"{weight}.css").read_text(encoding="utf-8")
    for block in re.findall(r"@font-face\s*\{[^}]+\}", css):
        if "cyrillic" in block:
            continue
        filename = re.search(r"files/([^)]*\.woff2)", block)[1]
        shutil.copyfile(source / "files" / filename, target / filename)
        block = re.sub(
            r"src:[^;]+;", f"src: url('./{filename}') format('woff2');", block
        )
        styles.append(block)
shutil.copyfile(source / "LICENSE", target / "LICENSE.txt")
(target / "fonts.css").write_text("\n".join(styles), encoding="utf-8")
