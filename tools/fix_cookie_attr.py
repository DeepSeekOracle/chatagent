import re
from pathlib import Path

roots = [
    Path(r"D:\eternalhaven"),
    Path(r"D:\excavationpro-ca"),
    Path(r"D:\deepseekoracle-com"),
    Path(r"D:\asiancoastline"),
    Path(r"D:\bpmfinder"),
]
pat = re.compile(r'(data-cookie-key="[^"]+")(?:\s+\1)+')
for root in roots:
    for p in list(root.glob("*.html")) + list(root.rglob("thanks.html")):
        t = p.read_text(encoding="utf-8", errors="replace")
        n = pat.sub(r"\1", t)
        if n != t:
            p.write_text(n, encoding="utf-8")
            print("fixed", p)
print("done")
