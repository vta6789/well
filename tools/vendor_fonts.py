"""Copy licensed Fontsource fonts to the public, dependency-free assets."""

from pathlib import Path
import re
import shutil

root = Path(__file__).resolve().parents[1]
target = root / "assets/fonts"
target.mkdir(parents=True, exist_ok=True)
styles = []
for family, weights, variants in [
    ("plus-jakarta-sans", [300, 400, 500, 600, 700, 800], ["normal"]),
    ("nunito-sans", [400, 600, 700, 800], ["normal"]),
    ("lora", [400, 500, 600], ["normal", "italic"]),
]:
    source = root / "node_modules/@fontsource" / family
    for weight in weights:
        for variant in variants:
            filename_css = f"{weight}.css" if variant == "normal" else f"{weight}-{variant}.css"
            css = (source / filename_css).read_text(encoding="utf-8")
            for block in re.findall(r"@font-face\s*\{[^}]+\}", css):
                filename = re.search(r"files/([^)]*\.woff2)", block)[1]
                if not any(f"-{subset}-" in filename for subset in ["latin", "latin-ext", "vietnamese"]):
                    continue
                shutil.copyfile(source / "files" / filename, target / filename)
                block = re.sub(
                    r"src:[^;]+;", f"src: url('./{filename}') format('woff2');", block
                )
                styles.append(block)
    license_name = "LICENSE.txt" if family == "plus-jakarta-sans" else f"LICENSE-{family}.txt"
    shutil.copyfile(source / "LICENSE", target / license_name)
(target / "fonts.css").write_text("\n".join(styles), encoding="utf-8")
