import fitz
import os

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
assets_dir = os.path.join(project_root, "public/assets")
os.makedirs(assets_dir, exist_ok=True)

# 1. Base Hiring Template
hiring_pdf = os.path.join(project_root, "Hiring AY 2026-27/president-membership-letter-aisc-2026.pdf")
doc_hire = fitz.open(hiring_pdf)
page_hire = doc_hire[0]
page_hire.add_redact_annot(fitz.Rect(180, 700, 1600, 775), fill=False)   # Name
page_hire.add_redact_annot(fitz.Rect(270, 815, 1600, 860), fill=False)   # Class
page_hire.add_redact_annot(fitz.Rect(385, 860, 1600, 905), fill=False)   # Position
page_hire.add_redact_annot(fitz.Rect(180, 1080, 700, 1130), fill=False)  # Dear Name
page_hire.add_redact_annot(fitz.Rect(180, 1170, 1674, 1260), fill=False) # Offer
page_hire.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)

hire_base_png = os.path.join(assets_dir, "template_hiring_base.png")
page_hire.get_pixmap(dpi=150).save(hire_base_png)
doc_hire.close()
print("Created:", hire_base_png)

# 2. Base Graduating Template
grad_pdf = os.path.join(project_root, "Graduating Members 2026/aastha-deshmukh-appreciation-letter-aisc-2026.pdf")
doc_grad = fitz.open(grad_pdf)
page_grad = doc_grad[0]
page_grad.add_redact_annot(fitz.Rect(180, 890, 1600, 965), fill=False)  # Name
page_grad.add_redact_annot(fitz.Rect(270, 1005, 1600, 1050), fill=False) # Class
page_grad.add_redact_annot(fitz.Rect(400, 1050, 1600, 1095), fill=False) # Position
page_grad.add_redact_annot(fitz.Rect(490, 1095, 1600, 1140), fill=False) # Tenure
page_grad.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)

grad_base_png = os.path.join(assets_dir, "template_graduating_base.png")
page_grad.get_pixmap(dpi=150).save(grad_base_png)
doc_grad.close()
print("Created:", grad_base_png)
