import fitz
import os
import re
import json

def parse_graduating(filepath):
    doc = fitz.open(filepath)
    text = doc[0].get_text()
    name_match = re.search(r"This letter is presented to\s*\n+([^\n]+)", text)
    class_match = re.search(r"Class:\s*([^\n]+)", text)
    pos_match = re.search(r"Position Held:\s*([^\n]+)", text)
    tenure_match = re.search(r"Tenure of Position:\s*([^\n]+)", text)
    date_match = re.search(r"Date:\s*([^\n]+)", text)
    return {
        "filename": os.path.basename(filepath),
        "filepath": filepath,
        "folder": "Graduating Members 2026",
        "category": "Graduating Members",
        "type_slug": "appreciation",
        "type_name": "Special Appreciation",
        "recipient_name": name_match.group(1).strip() if name_match else "",
        "class_info": class_match.group(1).strip() if class_match else "",
        "position": pos_match.group(1).strip() if pos_match else "",
        "tenure": tenure_match.group(1).strip() if tenure_match else "",
        "date": date_match.group(1).strip() if date_match else "19 September 2026"
    }

def parse_hiring(filepath):
    doc = fitz.open(filepath)
    text = doc[0].get_text()
    name_match = re.search(r"This letter is presented to\s*\n+([^\n]+)", text)
    class_match = re.search(r"Class:\s*([^\n]+)", text)
    pos_match = re.search(r"Position Held:\s*([^\n]+)", text)
    tenure_match = re.search(r"Tenure of Position:\s*([^\n]+)", text)
    date_match = re.search(r"Date:\s*([^\n]+)", text)
    subj_match = re.search(r"Subject:\s*([^\n]+)", text)
    return {
        "filename": os.path.basename(filepath),
        "filepath": filepath,
        "folder": "Hiring AY 2026-27",
        "category": "Office Bearer Offer Letter",
        "type_slug": "office_bearer",
        "type_name": "Office Bearers & Postholders",
        "recipient_name": name_match.group(1).strip() if name_match else "",
        "class_info": class_match.group(1).strip() if class_match else "",
        "position": pos_match.group(1).strip() if pos_match else "",
        "tenure": tenure_match.group(1).strip() if tenure_match else "",
        "date": date_match.group(1).strip() if date_match else "19 September 2026",
        "subject": subj_match.group(1).strip() if subj_match else ""
    }

grad_files = sorted(os.listdir("Graduating Members 2026"))
grad_data = [parse_graduating(os.path.join("Graduating Members 2026", f)) for f in grad_files if f.endswith(".pdf")]

hire_files = sorted(os.listdir("Hiring AY 2026-27"))
hire_data = [parse_hiring(os.path.join("Hiring AY 2026-27", f)) for f in hire_files if f.endswith(".pdf")]

with open("data/extracted_certificates.json", "w", encoding="utf-8") as f:
    json.dump({"graduating": grad_data, "hiring": hire_data}, f, indent=2)

print(f"=== GRADUATING MEMBERS ({len(grad_data)}) ===")
for g in grad_data:
    print(f"{g['filename']} -> {g['recipient_name']} ({g['position']})")

print(f"\n=== HIRING MEMBERS ({len(hire_data)}) ===")
for h in hire_data:
    print(f"{h['filename']} -> {h['recipient_name']} ({h['position']})")
