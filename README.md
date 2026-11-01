# 🛡️ CyberShield Data Vault
### Prototipe Sistem Keamanan & Perlindungan Privasi Data
*(Implementasi OTP, QR Code 2FA, Enkripsi AES-256-GCM, dan Kepatuhan UU PDP)*

---

## 📌 Ringkasan Proyek
**CyberShield Data Vault** adalah prototipe aplikasi web interaktif komprehensif yang dirancang untuk mendemonstrasikan prinsip-prinsip perlindungan data dan privasi (Zero-Trust Security & Kepatuhan UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi / UU PDP).

Sistem ini mengimplementasikan tiga pilar utama keamanan modern:
1. **Enkripsi Data (Data at Rest & in Transit)**: Enkripsi tingkat tinggi **AES-256-GCM** dengan derivasi kunci **PBKDF2 (100.000 iterasi)** dan penyamaran data sensitif (**PII Masking**).
2. **Autentikasi OTP (One-Time Password)**: Verifikasi 6-digit acak dengan batas kedaluwarsa 60 detik, proteksi **Anti Brute-Force Rate Limiting**, dan simulasi SMS/Email gateway.
3. **QR Code Security & MFA Binding**: Penerapan standar **RFC 6238 (TOTP)** yang kompatibel dengan Google/Microsoft Authenticator, serta pembuatan **QR Code Payload Terenkripsi** untuk pertukaran data rahasia offline.

---

## 🚀 Fitur Unggulan

### 1. 🔐 Enkripsi Data & Secure Vault (Web Crypto API)
* **AES-256-GCM Authenticated Encryption**: Enkripsi simetris menggunakan API native peramban (`window.crypto.subtle`), memastikan integritas data terjamin (tamper-evident).
* **PBKDF2 Key Derivation**: Mengubah passphrase teks menjadi kunci kriptografis 256-bit dengan 100.000 putaran hash SHA-256 dan salt acak 16-byte untuk menangkal serangan Rainbow Table.
* **Live Cryptographic Inspector**: Menampilkan secara transparan struktur data terenkripsi:
  * *Ciphertext Base64*
  * *Cryptographic Salt Hex*
  * *Initialization Vector (IV/Nonce) 12-byte*
  * *SHA-256 Integrity Hash*
* **PII Sanitization / Masking**: Penyamaran otomatis untuk NIK (`320101******0002`), Rekening Bank, dan Email sesuai mandat UU PDP.
* **Hak Penghapusan Data (Right to be Forgotten)**: Pengguna dapat menghapus data secara permanen kapan saja.

### 2. 📲 Autentikasi 2FA / OTP (One-Time Password)
* **Kriptografis Acak**: Dihasilkan menggunakan `window.crypto.getRandomValues()`.
* **Masa Berlaku Dinamis (60 Detik)**: Dilengkapi dengan *radial countdown ring animation*.
* **Proteksi Anti Brute-Force**: Membatasi percobaan salah maksimal 3 kali. Jika melampaui, sistem otomatis membekukan akses (*lockdown*) selama 30 detik.
* **Simulasi Notifikasi Masuk**: Kotak preview pesan SMS / Email interaktif.
* **Integrasi Buka Kunci Vault**: Data rahasia pada vault hanya dapat didekripsi jika otorisasi OTP valid.

### 3. 📷 QR Code Security & MFA Binding (TOTP)
* **Generasi SVG QR Code Mandiri**: Modul generator QR Code murni JavaScript tanpa ketergantungan jaringan eksternal.
* **TOTP RFC 6238 Engine**: Menghasilkan URI `otpauth://totp/...` yang dapat dipindai oleh Google Authenticator, serta menyediakan simulator kode 30 detik live.
* **Payload QR Terenkripsi**: Pengguna dapat mengenkripsi dokumen atau tiket sesi ke dalam gambar QR Code yang hanya bisa dibaca dengan kunci pembuka yang sah.

### 4. 📜 Audit Log & Kepatuhan UU PDP
* **Audit Trail Real-time**: Mencatat setiap aktivitas penting (enkripsi, pembuatan OTP, kegagalan verifikasi, penghapusan data) dengan stempel waktu berpresisi tinggi.
* **Kepatuhan UU No. 27 Tahun 2022**: Checklist kesesuaian teknis mencakup Pasal 8 (Hak Hapus), Pasal 35 (Kerahasiaan), dan Pasal 36 (Penyamaran Data Sensitif).

---

## 💻 Cara Menjalankan Prototipe

### Opsi 1: Menggunakan Web Server Lokal (Direkomendasikan)
Server lokal sudah berjalan di:
```bash
http://localhost:8080
```
Jika ingin menjalankan ulang melalui terminal:
```bash
# Masuk ke direktori proyek
cd C:\Users\mynam\.gemini\antigravity-ide\scratch\security-vault

# Jalankan server menggunakan Python:
python -m http.server 8080

# Atau menggunakan Node.js / npx serve:
npx serve -l 8080
```
Buka browser dan arahkan ke: `http://localhost:8080`.

### Opsi 2: Membuka Berkas Langsung
Anda juga dapat membuka berkas `index.html` secara langsung dengan klik ganda di File Explorer:
`C:\Users\mynam\.gemini\antigravity-ide\scratch\security-vault\index.html`

---

## 📁 Struktur Direktori
```
security-vault/
├── index.html            # Antarmuka utama aplikasi (Semantic HTML5, Accessible)
├── README.md             # Dokumentasi arsitektur dan panduan penggunaan
├── css/
│   └── style.css         # Desain sistem modern (Glassmorphism dark-mode, responsive)
└── js/
    ├── qrcode-lib.js     # Engine QR Code mandiri (SVG rendering, zero-dependency)
    ├── crypto-engine.js  # Web Crypto API (AES-256-GCM, PBKDF2, SHA-256, PII Masking)
    ├── otp-manager.js    # One-Time Password engine (Push OTP + RFC 6238 TOTP clock)
    └── app.js            # Controller logika aplikasi, UI events, dan audit logging
```
