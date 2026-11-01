import subprocess
import os
import shutil

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
pdf_name = "Laporan_Keamanan_Siber_Yusuf_Sanjaya_202410715162.pdf"
out_project_pdf = os.path.join(r"C:\Users\mynam\.gemini\antigravity-ide\scratch\security-vault", pdf_name)
out_artifact_pdf = os.path.join(r"C:\Users\mynam\.gemini\antigravity-ide\brain\1aed1653-76c1-499b-8185-79eba1a36e52", pdf_name)

url = "http://localhost:8080/laporan_cetak.html"

cmd = [
    chrome_path,
    "--headless=new",
    "--disable-gpu",
    "--no-pdf-header-footer",
    f"--print-to-pdf={out_project_pdf}",
    url
]

print(f"Generating PDF from {url}...")
res = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
print("Returncode:", res.returncode)
print("Stderr:", res.stderr)

if os.path.exists(out_project_pdf):
    size = os.path.getsize(out_project_pdf)
    print(f"Success! Generated {out_project_pdf} ({size} bytes)")
    shutil.copy2(out_project_pdf, out_artifact_pdf)
    print(f"Copied to artifact directory: {out_artifact_pdf}")
else:
    print("PDF generation failed: file not found.")
