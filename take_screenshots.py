import subprocess
import os
import shutil

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
target_dir = r"C:\Users\mynam\.gemini\antigravity-ide\scratch\security-vault\screenshots"
artifact_dir = r"C:\Users\mynam\.gemini\antigravity-ide\brain\1aed1653-76c1-499b-8185-79eba1a36e52"

os.makedirs(target_dir, exist_ok=True)
os.makedirs(artifact_dir, exist_ok=True)

urls = [
    ("01_dashboard_encryption.png", "http://localhost:8080/?tab=tabEncryption"),
    ("02_otp_authentication.png", "http://localhost:8080/?tab=tabOTP&active=1"),
    ("03_qrcode_totp.png", "http://localhost:8080/?tab=tabQRCode"),
    ("04_audit_privacy_uupdp.png", "http://localhost:8080/?tab=tabPrivacyAudit"),
]

for filename, url in urls:
    out_file = os.path.join(target_dir, filename)
    cmd = [
        chrome_path,
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--window-size=1280,1050",
        f"--screenshot={out_file}",
        url
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
    print(f"Captured {filename}: exists={os.path.exists(out_file)}, size={os.path.getsize(out_file) if os.path.exists(out_file) else 0}")
    if os.path.exists(out_file):
        shutil.copy2(out_file, os.path.join(artifact_dir, filename))

print("All screenshots captured and copied to artifact directory!")
