/**
 * OTPManager: One-Time Password System
 * Supports:
 * 1. Push OTP (SMS / WhatsApp / Email simulation) with 60s expiration and anti-brute force lockout.
 * 2. RFC 6238 TOTP (Time-Based One-Time Password) with 30s cycle for QR Code Authenticator apps.
 */
class OTPManager {
    constructor() {
        this.currentPushOTP = null;
        this.pushExpiresAt = 0;
        this.pushTimerId = null;
        this.failedAttempts = 0;
        this.maxAttempts = 3;
        this.lockoutUntil = 0;
        this.resendCooldownUntil = 0;
        
        // Base32 secret for TOTP (e.g., JBSWY3DPEHPK3PXP)
        this.totpSecret = 'JBSWY3DPEHPK3PXP';
        this.totpPeriod = 30; // 30 seconds
        this.totpDigits = 6;
        
        // Start background TOTP tick
        this.totpRemaining = 30;
        this.totpCurrentCode = '';
        this.startTotpClock();
    }

    /**
     * Generates a 6-digit random Push OTP using window.crypto
     */
    generatePushOTP(channel = 'SMS', destination = '+62 812-****-8899') {
        const now = Date.now();
        if (now < this.lockoutUntil) {
            const waitSec = Math.ceil((this.lockoutUntil - now) / 1000);
            return {
                success: false,
                locked: true,
                message: `Akun terkunci sementara karena 3x gagal verifikasi. Silakan tunggu ${waitSec} detik.`
            };
        }

        if (now < this.resendCooldownUntil) {
            const waitSec = Math.ceil((this.resendCooldownUntil - now) / 1000);
            return {
                success: false,
                cooldown: true,
                message: `Harap tunggu ${waitSec} detik sebelum meminta kode OTP baru.`
            };
        }

        // Generate 6 secure random digits
        const array = new Uint32Array(1);
        window.crypto.getRandomValues(array);
        const codeNum = (array[0] % 900000) + 100000;
        const code = codeNum.toString();

        const durationSeconds = 60;
        this.currentPushOTP = code;
        this.pushExpiresAt = now + (durationSeconds * 1000);
        this.failedAttempts = 0;
        this.resendCooldownUntil = now + (15 * 1000); // 15s cooldown between sends

        return {
            success: true,
            code: code,
            channel: channel,
            destination: destination,
            expiresIn: durationSeconds,
            expiresAt: this.pushExpiresAt
        };
    }

    /**
     * Verifies a Push OTP
     */
    verifyPushOTP(inputCode) {
        const now = Date.now();

        if (now < this.lockoutUntil) {
            const waitSec = Math.ceil((this.lockoutUntil - now) / 1000);
            return {
                valid: false,
                locked: true,
                message: `Akses terkunci! Silakan coba lagi dalam ${waitSec} detik.`
            };
        }

        if (!this.currentPushOTP || now > this.pushExpiresAt) {
            return {
                valid: false,
                expired: true,
                message: 'Kode OTP telah kedaluwarsa atau belum dibuat. Silakan minta kode baru.'
            };
        }

        const cleanInput = String(inputCode).trim();
        if (cleanInput === this.currentPushOTP) {
            // Success! Reset OTP
            this.currentPushOTP = null;
            this.pushExpiresAt = 0;
            this.failedAttempts = 0;
            return {
                valid: true,
                message: 'Verifikasi OTP Berhasil! Akses data diamankan & disetujui.'
            };
        } else {
            this.failedAttempts++;
            const remaining = this.maxAttempts - this.failedAttempts;
            if (this.failedAttempts >= this.maxAttempts) {
                this.lockoutUntil = now + (30 * 1000); // Lock 30s
                this.currentPushOTP = null; // Invalidate OTP
                return {
                    valid: false,
                    locked: true,
                    message: 'Terlalu banyak percobaan salah! Sistem mengaktifkan brute-force lockdown selama 30 detik.'
                };
            }
            return {
                valid: false,
                remainingAttempts: remaining,
                message: `Kode OTP salah! Sisa percobaan: ${remaining} kali lagi.`
            };
        }
    }

    /**
     * Simple TOTP (Time-based One-Time Password) Generator
     * RFC 6238 implementation in Javascript for live QR code pairing
     */
    async getTOTP(secret = this.totpSecret) {
        const epoch = Math.round(Date.now() / 1000.0);
        const time = Math.floor(epoch / this.totpPeriod);
        return await this.calculateHOTP(secret, time);
    }

    /**
     * Decodes Base32 string to Uint8Array
     */
    base32ToBytes(base32) {
        const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let bits = '';
        for (let i = 0; i < base32.length; i++) {
            const val = base32chars.indexOf(base32.charAt(i).toUpperCase());
            if (val >= 0) {
                bits += val.toString(2).padStart(5, '0');
            }
        }
        const bytes = [];
        for (let i = 0; i + 8 <= bits.length; i += 8) {
            bytes.push(parseInt(bits.substr(i, 8), 2));
        }
        return new Uint8Array(bytes);
    }

    /**
     * Calculates HMAC-SHA1 HOTP code
     */
    async calculateHOTP(secretBase32, counter) {
        const keyBytes = this.base32ToBytes(secretBase32);
        
        // Counter as 8-byte big-endian
        const counterBuffer = new ArrayBuffer(8);
        const counterView = new DataView(counterBuffer);
        counterView.setUint32(4, counter, false);

        // Crypto key import
        const cryptoKey = await window.crypto.subtle.importKey(
            'raw',
            keyBytes,
            { name: 'HMAC', hash: { name: 'SHA-1' } },
            false,
            ['sign']
        );

        const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, counterBuffer);
        const sigBytes = new Uint8Array(signature);

        // Dynamic truncation
        const offset = sigBytes[sigBytes.length - 1] & 0x0f;
        const binary =
            ((sigBytes[offset] & 0x7f) << 24) |
            ((sigBytes[offset + 1] & 0xff) << 16) |
            ((sigBytes[offset + 2] & 0xff) << 8) |
            (sigBytes[offset + 3] & 0xff);

        const otp = binary % Math.pow(10, this.totpDigits);
        return otp.toString().padStart(this.totpDigits, '0');
    }

    /**
     * Starts continuous TOTP clock ticker
     */
    startTotpClock() {
        const updateTick = async () => {
            const epoch = Math.round(Date.now() / 1000.0);
            this.totpRemaining = this.totpPeriod - (epoch % this.totpPeriod);
            this.totpCurrentCode = await this.getTOTP(this.totpSecret);
            
            // Dispatch event for UI
            const event = new CustomEvent('totp-tick', {
                detail: {
                    code: this.totpCurrentCode,
                    remaining: this.totpRemaining,
                    period: this.totpPeriod,
                    secret: this.totpSecret,
                    uri: this.getTOTPUri('CyberShield', 'admin@privatedata.id', this.totpSecret)
                }
            });
            window.dispatchEvent(event);
        };

        setInterval(updateTick, 1000);
        updateTick();
    }

    /**
     * Returns Google Authenticator compatible URI
     */
    getTOTPUri(issuer = 'CyberShield', user = 'admin@privatedata.id', secret = this.totpSecret) {
        return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(user)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
    }

    /**
     * Verifies TOTP code allowing for 1 window clock drift (+- 30s)
     */
    async verifyTOTP(inputCode, secret = this.totpSecret) {
        const clean = String(inputCode).trim();
        const epoch = Math.round(Date.now() / 1000.0);
        const currentCounter = Math.floor(epoch / this.totpPeriod);

        // Check window: current, previous (-1), and next (+1)
        for (let drift = -1; drift <= 1; drift++) {
            const code = await this.calculateHOTP(secret, currentCounter + drift);
            if (code === clean) {
                return { valid: true, message: 'Autentikasi TOTP Authenticator Cocok!' };
            }
        }
        return { valid: false, message: 'Kode Authenticator 6-digit tidak valid atau telah berganti.' };
    }
}

window.otpManager = new OTPManager();
