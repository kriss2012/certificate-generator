import fitz

def inspect(path):
    print("=== FILE:", path, "===")
    doc = fitz.open(path)
    page = doc[0]
    d = page.get_text("dict")
    for b in d["blocks"]:
        if "lines" in b:
            for l in b["lines"]:
                for s in l["spans"]:
                    t = s["text"]
                    if any(x in t for x in ["Chirag", "Aastha", "President", "MCA", "Date", "This letter", "Offer of Position"]):
                        print(f"TEXT: {t!r:35} | FONT: {s['font']:25} | SIZE: {s['size']:5.1f} | COLOR: {hex(s['color'])} | ORIGIN: {s['origin']} | BBOX: {s['bbox']}")

inspect("Hiring AY 2026-27/president-membership-letter-aisc-2026.pdf")
inspect("Graduating Members 2026/aastha-deshmukh-appreciation-letter-aisc-2026.pdf")
