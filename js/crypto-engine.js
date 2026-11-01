/**
 * CryptoEngine: Web Crypto API Implementation
 * Implements real AES-256-GCM encryption, PBKDF2 key derivation,
 * SHA-256 hashing, and Data Privacy Masking (UU PDP compliant).
 */
class CryptoEngine {
    constructor() {
        this.subtle = window.crypto.subtle;
    }

    /**
     * Converts ArrayBuffer to Base64
     */
    bufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    /**
     * Converts Base64 to ArrayBuffer
     */
    base64ToBuffer(base64) {
        const binary = window.atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    /**
     * Converts ArrayBuffer to Hex string
     */
    bufferToHex(buffer) {
        const bytes = new Uint8Array(buffer);
        return Array.from(bytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * Generates a random cryptographic salt or IV
     */
    getRandomBytes(length) {
        const bytes = new Uint8Array(length);
        window.crypto.getRandomValues(bytes);
        return bytes;
    }

    /**
     * Derives an AES-GCM 256-bit key from a password and salt using PBKDF2
     */
    async deriveKey(password, saltUint8, iterations = 100000) {
        const enc = new TextEncoder();
        const baseKey = await this.subtle.importKey(
            'raw',
            enc.encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );

        return await this.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: saltUint8,
                iterations: iterations,
                hash: 'SHA-256'
            },
            baseKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Encrypts plaintext string using AES-256-GCM
     * Returns an envelope with { version, salt, iv, ciphertext, hash, timestamp }
     */
    async encrypt(plainText, password) {
        if (!plainText) throw new Error('Data teks tidak boleh kosong');
        if (!password) throw new Error('Password / Kunci rahasia diperlukan');

        const enc = new TextEncoder();
        const dataBytes = enc.encode(plainText);

        // 16-byte random salt for PBKDF2
        const salt = this.getRandomBytes(16);
        // 12-byte random IV for AES-GCM (standard best practice)
        const iv = this.getRandomBytes(12);

        // Derive 256-bit AES-GCM key
        const key = await this.deriveKey(password, salt);

        // Encrypt with AES-GCM
        const encryptedBuffer = await this.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv,
                tagLength: 128
            },
            key,
            dataBytes
        );

        // Calculate SHA-256 integrity hash of original data
        const hashBuffer = await this.subtle.digest('SHA-256', dataBytes);
        const dataHash = this.bufferToHex(hashBuffer);

        const envelope = {
            version: 'AES-256-GCM/PBKDF2-100K',
            salt: this.bufferToBase64(salt.buffer),
            iv: this.bufferToBase64(iv.buffer),
            ciphertext: this.bufferToBase64(encryptedBuffer),
            dataHash: dataHash,
            createdAt: new Date().toISOString()
        };

        return {
            envelope: envelope,
            serialized: JSON.stringify(envelope),
            rawCipherHex: this.bufferToHex(encryptedBuffer),
            rawSaltHex: this.bufferToHex(salt.buffer),
            rawIvHex: this.bufferToHex(iv.buffer),
            dataHash: dataHash
        };
    }

    /**
     * Decrypts an AES-256-GCM envelope
     */
    async decrypt(envelopeData, password) {
        let envelope;
        if (typeof envelopeData === 'string') {
            try {
                envelope = JSON.parse(envelopeData);
            } catch (e) {
                throw new Error('Format ciphertext tidak valid. Harus format JSON terenkripsi');
            }
        } else {
            envelope = envelopeData;
        }

        const saltVal = envelope.salt || envelope.s;
        const ivVal = envelope.iv || envelope.i;
        const cipherVal = envelope.ciphertext || envelope.c;

        if (!saltVal || !ivVal || !cipherVal) {
            throw new Error('Struktur amplop enkripsi tidak lengkap (kurang salt/iv/ciphertext)');
        }

        const saltUint8 = new Uint8Array(this.base64ToBuffer(saltVal));
        const ivUint8 = new Uint8Array(this.base64ToBuffer(ivVal));
        const cipherBuffer = this.base64ToBuffer(cipherVal);

        const key = await this.deriveKey(password, saltUint8);

        try {
            const decryptedBuffer = await this.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: ivUint8,
                    tagLength: 128
                },
                key,
                cipherBuffer
            );

            const dec = new TextDecoder();
            const plainText = dec.decode(decryptedBuffer);

            // Verify integrity hash if present
            if (envelope.dataHash) {
                const checkHashBuffer = await this.subtle.digest('SHA-256', decryptedBuffer);
                const checkHash = this.bufferToHex(checkHashBuffer);
                if (checkHash !== envelope.dataHash) {
                    console.warn('Hash integritas data tidak cocok!');
                }
            }

            return plainText;
        } catch (err) {
            throw new Error('Dekripsi gagal! Kunci/Password salah atau data telah dimodifikasi (Tag Auth Rusak)');
        }
    }

    /**
     * Computes SHA-256 hash of a string
     */
    async sha256(text) {
        const enc = new TextEncoder();
        const buffer = await this.subtle.digest('SHA-256', enc.encode(text));
        return this.bufferToHex(buffer);
    }

    /**
     * Data Privacy Masking (UU PDP compliance helper)
     */
    maskPII(type, value) {
        if (!value) return '';
        const str = String(value).trim();
        switch (type) {
            case 'nik':
                // 16 digits: 320101XXXXXXXX01
                if (str.length >= 8) {
                    return str.slice(0, 6) + '******' + str.slice(-4);
                }
                return '******';
            case 'email':
                // a***@domain.com
                const parts = str.split('@');
                if (parts.length === 2) {
                    const name = parts[0];
                    const maskedName = name.length > 2 ? name[0] + '***' + name.slice(-1) : name[0] + '***';
                    return maskedName + '@' + parts[1];
                }
                return '***@***';
            case 'phone':
                // 0812****8901
                if (str.length >= 8) {
                    return str.slice(0, 4) + '****' + str.slice(-4);
                }
                return '0812****';
            case 'bank':
                // 1234-****-****-5678
                if (str.length >= 10) {
                    return str.slice(0, 4) + '-****-****-' + str.slice(-4);
                }
                return '****-****';
            default:
                if (str.length <= 4) return '****';
                return str.slice(0, 2) + '*'.repeat(Math.max(4, str.length - 4)) + str.slice(-2);
        }
    }

    /**
     * Password strength evaluation
     */
    evaluatePasswordStrength(password) {
        if (!password) return { score: 0, label: 'Kosong', color: '#64748b', hints: ['Masukkan password'] };
        let score = 0;
        const hints = [];

        if (password.length >= 8) score += 25;
        else hints.push('Minimal 8 karakter');

        if (/[A-Z]/.test(password)) score += 25;
        else hints.push('Gunakan huruf besar (A-Z)');

        if (/[0-9]/.test(password)) score += 25;
        else hints.push('Gunakan angka (0-9)');

        if (/[^A-Za-z0-9]/.test(password)) score += 25;
        else hints.push('Gunakan simbol (!@#$%^&*)');

        let label = 'Sangat Lemah';
        let color = '#ef4444';
        if (score >= 100) {
            label = 'Sangat Kuat (AES-256 Recommended)';
            color = '#10b981';
        } else if (score >= 75) {
            label = 'Kuat';
            color = '#06b6d4';
        } else if (score >= 50) {
            label = 'Sedang';
            color = '#f59e0b';
        }

        return { score, label, color, hints };
    }
}

window.cryptoEngine = new CryptoEngine();
