/**
 * CyberShield Main Application Controller
 * Handles UI interactions, state synchronization, events, and audit logging.
 */

document.addEventListener('DOMContentLoaded', () => {
    // State Store
    const state = {
        vault: [],
        currentPushOTP: null,
        activeOtpSessionVerified: false,
        lastGeneratedEncryptedQRPayload: null,
        auditLogs: [],
        resendTimerInterval: null,
        pushTimerInterval: null
    };

    // DOM Elements
    const elements = {
        // Navigation
        tabBtns: document.querySelectorAll('.tab-btn'),
        tabPanes: document.querySelectorAll('.tab-pane'),

        // Summary Stats
        statVaultCount: document.getElementById('statVaultCount'),
        
        // Encryption Form
        formEncryptData: document.getElementById('formEncryptData'),
        dataLabel: document.getElementById('dataLabel'),
        dataCategory: document.getElementById('dataCategory'),
        dataPlaintext: document.getElementById('dataPlaintext'),
        toggleMasking: document.getElementById('toggleMasking'),
        maskedPreviewDisplay: document.getElementById('maskedPreviewDisplay'),
        encryptPassphrase: document.getElementById('encryptPassphrase'),
        pwStrengthFill: document.getElementById('pwStrengthFill'),
        pwStrengthText: document.getElementById('pwStrengthText'),
        pwEntropyHint: document.getElementById('pwEntropyHint'),
        btnEncryptSubmit: document.getElementById('btnEncryptSubmit'),

        // Crypto Inspector
        textCiphertext: document.getElementById('textCiphertext'),
        textSaltHex: document.getElementById('textSaltHex'),
        textIvHex: document.getElementById('textIvHex'),
        textDataHash: document.getElementById('textDataHash'),
        btnCopyCipher: document.getElementById('btnCopyCipher'),

        // Vault
        vaultContainer: document.getElementById('vaultContainer'),
        btnExportVault: document.getElementById('btnExportVault'),

        // OTP Tab
        otpChannelSelect: document.getElementById('otpChannelSelect'),
        btnRequestOTP: document.getElementById('btnRequestOTP'),
        simulatedPhoneNotification: document.getElementById('simulatedPhoneNotification'),
        smsHeaderTitle: document.getElementById('smsHeaderTitle'),
        simulatedCodeText: document.getElementById('simulatedCodeText'),
        pinDigits: [
            document.getElementById('pin0'),
            document.getElementById('pin1'),
            document.getElementById('pin2'),
            document.getElementById('pin3'),
            document.getElementById('pin4'),
            document.getElementById('pin5')
        ],
        timerProgressRing: document.getElementById('timerProgressRing'),
        otpTimerLabel: document.getElementById('otpTimerLabel'),
        otpTimerStatus: document.getElementById('otpTimerStatus'),
        btnVerifyOTP: document.getElementById('btnVerifyOTP'),
        btnResendOTP: document.getElementById('btnResendOTP'),
        attemptsRemainingBadge: document.getElementById('attemptsRemainingBadge'),

        // QR Code Tab
        qrContainerTotp: document.getElementById('qrContainerTotp'),
        textTotpSecret: document.getElementById('textTotpSecret'),
        btnCopyTotpSecret: document.getElementById('btnCopyTotpSecret'),
        liveTotpDisplay: document.getElementById('liveTotpDisplay'),
        totpTickerCountdown: document.getElementById('totpTickerCountdown'),
        btnFillTotp: document.getElementById('btnFillTotp'),
        inputVerifyTotp: document.getElementById('inputVerifyTotp'),
        btnCheckTotp: document.getElementById('btnCheckTotp'),

        // Encrypted QR
        qrSecretPayloadText: document.getElementById('qrSecretPayloadText'),
        qrSecretPassphrase: document.getElementById('qrSecretPassphrase'),
        btnGenerateEncryptedQR: document.getElementById('btnGenerateEncryptedQR'),
        qrContainerEncrypted: document.getElementById('qrContainerEncrypted'),
        qrEncryptedPayloadLength: document.getElementById('qrEncryptedPayloadLength'),
        qrDecryptKeyInput: document.getElementById('qrDecryptKeyInput'),
        btnScanAndDecryptQR: document.getElementById('btnScanAndDecryptQR'),
        qrDecryptedResult: document.getElementById('qrDecryptedResult'),

        // Audit Log
        auditConsoleContainer: document.getElementById('auditConsoleContainer'),
        btnClearAuditLogs: document.getElementById('btnClearAuditLogs'),

        // Decrypt Modal
        decryptModal: document.getElementById('decryptModal'),
        modalItemLabel: document.getElementById('modalItemLabel'),
        modalDecryptPassword: document.getElementById('modalDecryptPassword'),
        modalOtpCode: document.getElementById('modalOtpCode'),
        btnModalQuickOtp: document.getElementById('btnModalQuickOtp'),
        modalDecryptedOutputGroup: document.getElementById('modalDecryptedOutputGroup'),
        modalDecryptedContent: document.getElementById('modalDecryptedContent'),
        btnModalClose: document.getElementById('btnModalClose'),
        btnModalCancel: document.getElementById('btnModalCancel'),
        btnModalSubmitDecrypt: document.getElementById('btnModalSubmitDecrypt'),

        // Toast Container
        toastContainer: document.getElementById('toastContainer')
    };

    let activeModalItem = null;

    /* ==========================================================================
       Toast & Audit Logging Utilities
       ========================================================================== */

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '❌';

        toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
        elements.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    function addAuditLog(action, message, level = 'info') {
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
        
        const entry = {
            id: Date.now() + Math.random(),
            time: timeStr,
            action: action,
            message: message,
            level: level
        };

        state.auditLogs.unshift(entry);
        renderAuditLogs();
    }

    function renderAuditLogs() {
        if (!elements.auditConsoleContainer) return;
        elements.auditConsoleContainer.innerHTML = state.auditLogs.map(log => `
            <div class="log-entry">
                <span class="log-time">[${log.time}]</span>
                <span class="log-tag ${log.level}">${log.action}</span>
                <span class="log-msg">${log.message}</span>
            </div>
        `).join('');
    }

    /* ==========================================================================
       Tab Navigation
       ========================================================================== */

    function activateTab(targetTab) {
        elements.tabBtns.forEach(b => {
            const matches = b.getAttribute('data-tab') === targetTab;
            b.classList.toggle('active', matches);
            b.setAttribute('aria-selected', matches ? 'true' : 'false');
        });
        elements.tabPanes.forEach(p => {
            p.classList.toggle('active', p.id === targetTab);
        });
        const targetBtn = document.querySelector(`.tab-btn[data-tab="${targetTab}"]`);
        if (targetBtn) {
            addAuditLog('NAV', `Navigasi ke modul: ${targetBtn.textContent.trim()}`, 'info');
        }
    }

    elements.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            activateTab(targetTab);
        });
    });

    /* ==========================================================================
       Module 1: Data Encryption & Secure Vault
       ========================================================================== */

    // Live PII Masking Preview & Strength
    elements.dataPlaintext.addEventListener('input', updateMaskedPreview);
    elements.dataCategory.addEventListener('change', updateMaskedPreview);
    elements.toggleMasking.addEventListener('change', updateMaskedPreview);

    function updateMaskedPreview() {
        const rawText = elements.dataPlaintext.value;
        const category = elements.dataCategory.value;
        const isMasked = elements.toggleMasking.checked;

        if (!rawText.trim()) {
            elements.maskedPreviewDisplay.textContent = '(Pratinjau masking akan muncul saat mengetik)';
            return;
        }

        if (!isMasked) {
            elements.maskedPreviewDisplay.textContent = rawText;
            return;
        }

        const masked = window.cryptoEngine.maskPII(category, rawText);
        elements.maskedPreviewDisplay.textContent = masked;
    }

    // Password Strength Meter
    elements.encryptPassphrase.addEventListener('input', () => {
        const pw = elements.encryptPassphrase.value;
        const evaluation = window.cryptoEngine.evaluatePasswordStrength(pw);

        elements.pwStrengthFill.style.width = `${evaluation.score}%`;
        elements.pwStrengthFill.style.backgroundColor = evaluation.color;
        elements.pwStrengthText.textContent = `Kekuatan Kunci: ${evaluation.label}`;
        elements.pwStrengthText.style.color = evaluation.color;

        if (evaluation.hints.length > 0) {
            elements.pwEntropyHint.textContent = evaluation.hints.join(', ');
        } else {
            elements.pwEntropyHint.textContent = 'Enkripsi AES-256 siap digunakan dengan proteksi maksimal.';
        }
    });

    // Form Submit: Encrypt Data
    elements.btnEncryptSubmit.addEventListener('click', async () => {
        const label = elements.dataLabel.value.trim();
        const category = elements.dataCategory.value;
        const plaintext = elements.dataPlaintext.value.trim();
        const passphrase = elements.encryptPassphrase.value;

        if (!label) {
            showToast('Harap masukkan nama / keterangan dokumen', 'error');
            elements.dataLabel.focus();
            return;
        }

        if (!plaintext) {
            showToast('Konten data rahasia tidak boleh kosong', 'error');
            elements.dataPlaintext.focus();
            return;
        }

        if (!passphrase || passphrase.length < 4) {
            showToast('Passphrase kunci rahasia minimal 4 karakter', 'error');
            elements.encryptPassphrase.focus();
            return;
        }

        try {
            elements.btnEncryptSubmit.disabled = true;
            elements.btnEncryptSubmit.innerHTML = '<span>⏳ Mengenkripsi AES-256-GCM...</span>';

            const result = await window.cryptoEngine.encrypt(plaintext, passphrase);

            // Update Live Crypto Inspector
            elements.textCiphertext.textContent = result.serialized;
            elements.textSaltHex.textContent = result.rawSaltHex;
            elements.textIvHex.textContent = result.rawIvHex;
            elements.textDataHash.textContent = result.dataHash;

            // Save to Vault
            const vaultItem = {
                id: 'VAULT-' + Date.now().toString(36).toUpperCase(),
                label: label,
                category: category,
                categoryName: elements.dataCategory.options[elements.dataCategory.selectedIndex].text,
                maskedPreview: window.cryptoEngine.maskPII(category, plaintext),
                envelope: result.envelope,
                dataHash: result.dataHash,
                createdAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
            };

            state.vault.unshift(vaultItem);
            saveVaultToStorage();
            renderVaultItems();

            addAuditLog('ENCRYPT', `Data "${label}" berhasil dienkripsi (AES-256-GCM, Hash: ${result.dataHash.slice(0, 10)}...)`, 'success');
            showToast(`Data "${label}" berhasil dienkripsi & disimpan ke Vault!`, 'success');

            // Reset inputs except passphrase for convenience
            elements.dataLabel.value = '';
            elements.dataPlaintext.value = '';
            updateMaskedPreview();
        } catch (err) {
            showToast(err.message, 'error');
            addAuditLog('ERROR', `Gagal enkripsi data: ${err.message}`, 'danger');
        } finally {
            elements.btnEncryptSubmit.disabled = false;
            elements.btnEncryptSubmit.innerHTML = '<span>🔒 Enkripsi &amp; Simpan ke Secure Vault</span>';
        }
    });

    // Copy Ciphertext
    elements.btnCopyCipher.addEventListener('click', () => {
        const text = elements.textCiphertext.textContent;
        if (!text || text.includes('Belum ada')) return;
        navigator.clipboard.writeText(text).then(() => {
            showToast('Ciphertext berhasil disalin ke clipboard!', 'success');
        });
    });

    // Render Vault Items
    function renderVaultItems() {
        if (!elements.vaultContainer) return;
        elements.statVaultCount.textContent = `${state.vault.length} Item Tersimpan`;

        if (state.vault.length === 0) {
            elements.vaultContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.9rem;">
                    Belum ada data terenkripsi. Buat item baru di form sebelah kiri.
                </div>
            `;
            return;
        }

        elements.vaultContainer.innerHTML = state.vault.map(item => `
            <div class="vault-item" data-id="${item.id}">
                <div class="vault-item-info">
                    <h4>
                        <span>📁</span>
                        <span>${escapeHtml(item.label)}</span>
                        <span class="status-badge" style="font-size: 0.7rem; padding: 0.15rem 0.5rem;">${escapeHtml(item.categoryName)}</span>
                    </h4>
                    <p>PII: <span style="color: #38bdf8;">${escapeHtml(item.maskedPreview)}</span> &bull; ${item.createdAt}</p>
                </div>
                <div class="vault-item-actions">
                    <button class="btn btn-primary btn-sm btn-action-decrypt" data-id="${item.id}">
                        🔓 Buka
                    </button>
                    <button class="btn btn-danger btn-sm btn-action-delete" data-id="${item.id}" title="Hak Penghapusan Data (UU PDP)">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');

        // Attach listeners for decrypt & delete
        elements.vaultContainer.querySelectorAll('.btn-action-decrypt').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                openDecryptModal(id);
            });
        });

        elements.vaultContainer.querySelectorAll('.btn-action-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                deleteVaultItem(id);
            });
        });
    }

    function saveVaultToStorage() {
        try {
            localStorage.setItem('cybershield_vault', JSON.stringify(state.vault));
        } catch (e) {
            console.warn('Storage save skipped', e);
        }
    }

    function loadVaultFromStorage() {
        try {
            const raw = localStorage.getItem('cybershield_vault');
            if (raw) {
                state.vault = JSON.parse(raw);
            }
        } catch (e) {
            console.warn('Storage load failed', e);
        }

        // If vault is empty, seed with two realistic privacy examples
        if (!state.vault || state.vault.length === 0) {
            seedSampleVaultData();
        }
    }

    async function seedSampleVaultData() {
        const seedPass = 'DemoPassword123!';
        
        // Sample 1: KTP / NIK
        const sample1 = await window.cryptoEngine.encrypt(
            'NIK: 3201015609920002 | Nama: RIAN PRATAMA | Alamat: Jl. Sudirman No. 42 Jakarta',
            seedPass
        );
        // Sample 2: Rekening Bank
        const sample2 = await window.cryptoEngine.encrypt(
            'Bank BCA No: 8271-9283-7182 a.n Rian Pratama (Cabang Thamrin)',
            seedPass
        );

        state.vault = [
            {
                id: 'VAULT-NIK-01',
                label: 'KTP & Identitas Kependudukan',
                category: 'nik',
                categoryName: 'Identitas Pribadi (NIK)',
                maskedPreview: '320101******0002',
                envelope: sample1.envelope,
                dataHash: sample1.dataHash,
                createdAt: '10:00'
            },
            {
                id: 'VAULT-BANK-02',
                label: 'Rekening Payroll BCA Utama',
                category: 'bank',
                categoryName: 'Keuangan (Rekening)',
                maskedPreview: '8271-****-****-7182',
                envelope: sample2.envelope,
                dataHash: sample2.dataHash,
                createdAt: '10:15'
            }
        ];
        saveVaultToStorage();
    }

    // Export Vault
    elements.btnExportVault.addEventListener('click', () => {
        if (state.vault.length === 0) {
            showToast('Vault masih kosong', 'info');
            return;
        }
        const jsonStr = JSON.stringify(state.vault, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cybershield-vault-backup-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        addAuditLog('EXPORT', 'Pengguna mengunduh cadangan terenkripsi Vault', 'info');
        showToast('File cadangan Vault berhasil diunduh!', 'success');
    });

    // Delete item (UU PDP Hak Penghapusan)
    function deleteVaultItem(id) {
        const item = state.vault.find(v => v.id === id);
        if (!item) return;

        const confirmDel = confirm(`[UU PDP Hak Dilupakan / Right to Erasure]\nApakah Anda yakin ingin menghapus data "${item.label}" secara permanen? Data terenkripsi akan dihapus dan tidak dapat dipulihkan.`);
        if (!confirmDel) return;

        state.vault = state.vault.filter(v => v.id !== id);
        saveVaultToStorage();
        renderVaultItems();

        addAuditLog('DELETE', `Hak penghapusan dieksekusi: Data "${item.label}" dihapus permanen`, 'warn');
        showToast(`Data "${item.label}" berhasil dihapus secara permanen!`, 'info');
    }

    /* ==========================================================================
       Decryption & 2FA Modal Flow
       ========================================================================== */

    function openDecryptModal(id) {
        const item = state.vault.find(v => v.id === id);
        if (!item) return;

        activeModalItem = item;
        elements.modalItemLabel.textContent = item.label;
        elements.modalDecryptPassword.value = '';
        elements.modalOtpCode.value = '';
        elements.modalDecryptedOutputGroup.style.display = 'none';
        elements.modalDecryptedContent.textContent = '-';
        elements.decryptModal.classList.add('active');
        elements.modalDecryptPassword.focus();

        addAuditLog('ACCESS_REQ', `Permintaan akses dekripsi diajukan untuk item "${item.label}"`, 'info');
    }

    function closeDecryptModal() {
        elements.decryptModal.classList.remove('active');
        activeModalItem = null;
    }

    elements.btnModalClose.addEventListener('click', closeDecryptModal);
    elements.btnModalCancel.addEventListener('click', closeDecryptModal);

    elements.btnModalQuickOtp.addEventListener('click', () => {
        if (state.currentPushOTP) {
            elements.modalOtpCode.value = state.currentPushOTP;
            showToast('OTP aktif otomatis diisi!', 'info');
        } else if (window.otpManager.totpCurrentCode) {
            elements.modalOtpCode.value = window.otpManager.totpCurrentCode;
            showToast('Kode TOTP QR aktif otomatis diisi!', 'info');
        } else {
            showToast('Belum ada kode OTP/TOTP yang dibuat. Minta OTP di tab "Autentikasi OTP" terlebih dahulu.', 'error');
        }
    });

    elements.btnModalSubmitDecrypt.addEventListener('click', async () => {
        if (!activeModalItem) return;

        const password = elements.modalDecryptPassword.value;
        const otpCode = elements.modalOtpCode.value.trim();

        if (!password) {
            showToast('Masukkan password / passphrase enkripsi', 'error');
            elements.modalDecryptPassword.focus();
            return;
        }

        // Validate 2FA OTP: Either current push OTP, or TOTP from QR, or session already verified
        let otpValid = false;
        if (state.activeOtpSessionVerified) {
            otpValid = true;
        } else if (otpCode) {
            if (state.currentPushOTP && otpCode === state.currentPushOTP) {
                otpValid = true;
            } else {
                const totpCheck = await window.otpManager.verifyTOTP(otpCode);
                if (totpCheck.valid) {
                    otpValid = true;
                }
            }
        }

        if (!otpValid) {
            showToast('Otorisasi 2FA gagal! Masukkan 6-digit OTP/TOTP yang valid atau selesaikan verifikasi di tab OTP.', 'error');
            addAuditLog('2FA_FAIL', `Akses item "${activeModalItem.label}" ditolak karena kegagalan 2FA`, 'danger');
            return;
        }

        try {
            elements.btnModalSubmitDecrypt.disabled = true;
            elements.btnModalSubmitDecrypt.innerHTML = '<span>⏳ Mendekripsi...</span>';

            const decrypted = await window.cryptoEngine.decrypt(activeModalItem.envelope, password);

            elements.modalDecryptedOutputGroup.style.display = 'block';
            elements.modalDecryptedContent.textContent = decrypted;

            addAuditLog('DECRYPT_SUCCESS', `Akses data disetujui: "${activeModalItem.label}" berhasil didekripsi dengan Passphrase & 2FA`, 'success');
            showToast('Data berhasil didekripsi dengan aman!', 'success');
        } catch (err) {
            showToast(err.message, 'error');
            addAuditLog('DECRYPT_FAIL', `Gagal dekripsi "${activeModalItem.label}": Password salah atau data rusak`, 'danger');
        } finally {
            elements.btnModalSubmitDecrypt.disabled = false;
            elements.btnModalSubmitDecrypt.innerHTML = '<span>🔓 Dekripsi Sekarang</span>';
        }
    });

    /* ==========================================================================
       Module 2: OTP (One-Time Password) Authentication
       ========================================================================== */

    // Request OTP Button
    elements.btnRequestOTP.addEventListener('click', () => {
        const channel = elements.otpChannelSelect.value;
        let dest = '+62 812-****-8899';
        if (channel === 'Email') dest = 'u***@privatedata.id';
        if (channel === 'WhatsApp') dest = '+62 812-****-8899 (WhatsApp)';

        const res = window.otpManager.generatePushOTP(channel, dest);
        if (!res.success) {
            showToast(res.message, 'error');
            return;
        }

        state.currentPushOTP = res.code;
        state.activeOtpSessionVerified = false;

        // Show mock phone SMS notification
        elements.simulatedPhoneNotification.style.display = 'block';
        elements.smsHeaderTitle.textContent = `📩 ${channel} Security Gateway`;
        elements.simulatedCodeText.textContent = res.code;

        // Start Radial Countdown Timer (60s)
        startOtpCountdown(res.expiresIn);

        // Clear PIN digits
        elements.pinDigits.forEach(input => input.value = '');
        elements.pinDigits[0].focus();

        addAuditLog('OTP_GEN', `Kode OTP baru dibuat via ${channel} untuk ${dest} (Kedaluwarsa: 60s)`, 'info');
        showToast(`Kode OTP berhasil dikirim via ${channel}! Periksa simulasi notifikasi pesan.`, 'success');
    });

    function startOtpCountdown(totalSeconds) {
        if (state.pushTimerInterval) clearInterval(state.pushTimerInterval);
        
        const totalDuration = totalSeconds;
        let secondsLeft = totalSeconds;
        const circumference = 264; // 2 * PI * 42

        elements.btnResendOTP.disabled = true;
        elements.otpTimerStatus.textContent = 'Kode berlaku selama:';

        const tick = () => {
            elements.otpTimerLabel.textContent = `${secondsLeft}s`;
            
            // Progress dash offset
            const offset = circumference - (secondsLeft / totalDuration) * circumference;
            elements.timerProgressRing.style.strokeDashoffset = offset;

            // Dynamic color
            if (secondsLeft <= 10) {
                elements.timerProgressRing.style.stroke = 'var(--danger)';
            } else if (secondsLeft <= 25) {
                elements.timerProgressRing.style.stroke = 'var(--warning)';
            } else {
                elements.timerProgressRing.style.stroke = 'var(--primary)';
            }

            if (secondsLeft <= 0) {
                clearInterval(state.pushTimerInterval);
                state.currentPushOTP = null;
                elements.otpTimerLabel.textContent = '0s';
                elements.otpTimerStatus.textContent = 'Kode OTP telah kedaluwarsa!';
                elements.btnResendOTP.disabled = false;
                addAuditLog('OTP_EXP', 'Kode OTP telah kedaluwarsa secara otomatis', 'warn');
            }

            // Enable resend button after 15s
            if (totalDuration - secondsLeft >= 15) {
                elements.btnResendOTP.disabled = false;
            }

            secondsLeft--;
        };

        tick();
        state.pushTimerInterval = setInterval(tick, 1000);
    }

    // Resend OTP
    elements.btnResendOTP.addEventListener('click', () => {
        elements.btnRequestOTP.click();
    });

    // 6-Pin Input Handlers (Auto-focus next, backspace, paste)
    elements.pinDigits.forEach((digitInput, index) => {
        digitInput.addEventListener('input', (e) => {
            const val = e.target.value.replace(/[^0-9]/g, '');
            e.target.value = val.slice(0, 1);

            if (val && index < 5) {
                elements.pinDigits[index + 1].focus();
            }

            // If filled all 6, auto verify
            const fullCode = elements.pinDigits.map(d => d.value).join('');
            if (fullCode.length === 6) {
                elements.btnVerifyOTP.click();
            }
        });

        digitInput.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !digitInput.value && index > 0) {
                elements.pinDigits[index - 1].focus();
            }
        });

        digitInput.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasted = (e.clipboardData || window.clipboardData).getData('text');
            const cleanDigits = pasted.replace(/[^0-9]/g, '').slice(0, 6);
            for (let i = 0; i < 6; i++) {
                if (cleanDigits[i]) {
                    elements.pinDigits[i].value = cleanDigits[i];
                }
            }
            if (cleanDigits.length >= 6) {
                elements.pinDigits[5].focus();
                elements.btnVerifyOTP.click();
            } else if (cleanDigits.length > 0) {
                elements.pinDigits[cleanDigits.length].focus();
            }
        });
    });

    // Verify OTP Button
    elements.btnVerifyOTP.addEventListener('click', () => {
        const inputCode = elements.pinDigits.map(d => d.value).join('');
        if (inputCode.length < 6) {
            showToast('Masukkan lengkap 6 digit kode OTP', 'error');
            return;
        }

        const verifyResult = window.otpManager.verifyPushOTP(inputCode);

        if (verifyResult.valid) {
            state.activeOtpSessionVerified = true;
            if (state.pushTimerInterval) clearInterval(state.pushTimerInterval);
            elements.otpTimerStatus.textContent = '✅ Terverifikasi! Sesi Aman Aktif.';
            elements.attemptsRemainingBadge.textContent = '3 / 3 Percobaan (Normal)';
            elements.attemptsRemainingBadge.style.color = 'var(--success)';

            addAuditLog('OTP_SUCCESS', 'Verifikasi One-Time Password sukses. Sesi 2FA diotorisasi.', 'success');
            showToast('Verifikasi OTP Berhasil! Sesi aman Anda telah disetujui.', 'success');
        } else {
            state.activeOtpSessionVerified = false;
            if (verifyResult.remainingAttempts !== undefined) {
                elements.attemptsRemainingBadge.textContent = `${verifyResult.remainingAttempts} / 3 Percobaan`;
                elements.attemptsRemainingBadge.style.color = verifyResult.remainingAttempts === 1 ? 'var(--danger)' : 'var(--warning)';
            }
            if (verifyResult.locked) {
                elements.attemptsRemainingBadge.textContent = 'TERKUNCI SEMENTARA (30s)';
                elements.attemptsRemainingBadge.style.color = 'var(--danger)';
            }

            addAuditLog('OTP_FAIL', `Verifikasi OTP Gagal: ${verifyResult.message}`, 'danger');
            showToast(verifyResult.message, 'error');
        }
    });

    /* ==========================================================================
       Module 3: QR Code Security & MFA Binding (TOTP)
       ========================================================================== */

    // Generate Initial TOTP QR Code
    function renderTotpQRCode() {
        const uri = window.otpManager.getTOTPUri('CyberShield', 'admin@privatedata.id');
        const qrSvg = window.createQRCodeSvg(uri, 175, '#070b12', '#ffffff');
        elements.qrContainerTotp.innerHTML = qrSvg;
    }
    renderTotpQRCode();

    // Listen to background TOTP Ticker
    window.addEventListener('totp-tick', (e) => {
        const { code, remaining, period } = e.detail;
        elements.liveTotpDisplay.textContent = `${code.slice(0, 3)} ${code.slice(3)}`;
        elements.totpTickerCountdown.textContent = `Berganti dlm ${remaining}s`;

        // Slight flash effect on code change
        if (remaining === period) {
            elements.liveTotpDisplay.style.color = 'var(--primary)';
            setTimeout(() => {
                elements.liveTotpDisplay.style.color = '#fff';
            }, 500);
        }
    });

    // Copy TOTP Secret
    elements.btnCopyTotpSecret.addEventListener('click', () => {
        navigator.clipboard.writeText(elements.textTotpSecret.textContent).then(() => {
            showToast('Kunci manual TOTP disalin!', 'success');
        });
    });

    // Fill Live TOTP into input
    elements.btnFillTotp.addEventListener('click', () => {
        if (window.otpManager.totpCurrentCode) {
            elements.inputVerifyTotp.value = window.otpManager.totpCurrentCode;
            showToast('Kode live disalin ke kolom verifikasi!', 'info');
        }
    });

    // Verify TOTP Button
    elements.btnCheckTotp.addEventListener('click', async () => {
        const inputCode = elements.inputVerifyTotp.value.trim();
        if (inputCode.length !== 6) {
            showToast('Masukkan 6 digit kode dari Authenticator', 'error');
            return;
        }

        const check = await window.otpManager.verifyTOTP(inputCode);
        if (check.valid) {
            state.activeOtpSessionVerified = true;
            addAuditLog('TOTP_SUCCESS', 'Validasi TOTP QR Authenticator berhasil (RFC 6238)', 'success');
            showToast('Otentikasi TOTP Authenticator Cocok & Valid!', 'success');
        } else {
            addAuditLog('TOTP_FAIL', 'Validasi TOTP Authenticator tidak cocok', 'danger');
            showToast(check.message, 'error');
        }
    });

    // Encrypted QR Code Generator
    elements.btnGenerateEncryptedQR.addEventListener('click', async () => {
        const payloadText = elements.qrSecretPayloadText.value.trim();
        const passphrase = elements.qrSecretPassphrase.value;

        if (!payloadText) {
            showToast('Masukkan pesan rahasia untuk dimasukkan ke QR', 'error');
            return;
        }

        if (!passphrase) {
            showToast('Masukkan passphrase pengunci QR', 'error');
            return;
        }

        try {
            elements.btnGenerateEncryptedQR.disabled = true;
            elements.btnGenerateEncryptedQR.innerHTML = '<span>⏳ Mengenkripsi Payload QR...</span>';

            const encrypted = await window.cryptoEngine.encrypt(payloadText, passphrase);
            const compactPayload = JSON.stringify({
                s: encrypted.envelope.salt,
                i: encrypted.envelope.iv,
                c: encrypted.envelope.ciphertext
            });
            state.lastGeneratedEncryptedQRPayload = compactPayload;

            // Generate QR Code containing the encrypted JSON string
            const qrSvg = window.createQRCodeSvg(compactPayload, 175, '#070b12', '#ffffff');
            elements.qrContainerEncrypted.innerHTML = qrSvg;
            elements.qrEncryptedPayloadLength.textContent = `Payload: ${compactPayload.length} bytes (AES-256-GCM Terenkripsi)`;

            addAuditLog('QR_ENCRYPT', `QR Code terenkripsi dibuat untuk payload pesan rahasia (Hash: ${encrypted.dataHash.slice(0, 8)})`, 'info');
            showToast('QR Code Terenkripsi berhasil dibuat!', 'success');
        } catch (err) {
            showToast('Gagal membuat QR: ' + err.message, 'error');
        } finally {
            elements.btnGenerateEncryptedQR.disabled = false;
            elements.btnGenerateEncryptedQR.innerHTML = '<span>⚡ Generate QR Code Terenkripsi</span>';
        }
    });

    // Scan & Decrypt QR Simulator
    elements.btnScanAndDecryptQR.addEventListener('click', async () => {
        if (!state.lastGeneratedEncryptedQRPayload) {
            showToast('Silakan generate QR Code Terenkripsi terlebih dahulu', 'error');
            return;
        }

        const key = elements.qrDecryptKeyInput.value;
        if (!key) {
            showToast('Masukkan passphrase untuk membaca QR', 'error');
            elements.qrDecryptKeyInput.focus();
            return;
        }

        try {
            const decrypted = await window.cryptoEngine.decrypt(state.lastGeneratedEncryptedQRPayload, key);
            elements.qrDecryptedResult.textContent = `HASIL DEKRIPSI QR: "${decrypted}"`;
            elements.qrDecryptedResult.style.color = 'var(--success)';
            
            addAuditLog('QR_DECRYPT', 'QR Code terenkripsi berhasil dipindai dan didekripsi', 'success');
            showToast('QR Code berhasil didekripsi!', 'success');
        } catch (err) {
            elements.qrDecryptedResult.textContent = `GAGAL: ${err.message}`;
            elements.qrDecryptedResult.style.color = 'var(--danger)';
            addAuditLog('QR_DECRYPT_FAIL', 'Percobaan dekripsi QR gagal karena kunci salah', 'danger');
            showToast(err.message, 'error');
        }
    });

    // Generate initial sample encrypted QR
    elements.btnGenerateEncryptedQR.click();

    /* ==========================================================================
       Module 4: Audit Log & UU PDP Controls
       ========================================================================== */

    elements.btnClearAuditLogs.addEventListener('click', () => {
        state.auditLogs = [];
        renderAuditLogs();
        addAuditLog('LOG_CLEAR', 'Konsol audit log dibersihkan oleh pengguna', 'info');
        showToast('Audit log dibersihkan', 'info');
    });

    /* ==========================================================================
       Helper Utilities
       ========================================================================== */

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Initialize application
    loadVaultFromStorage();
    renderVaultItems();
    addAuditLog('SYSTEM_BOOT', 'Sistem CyberShield aktif. Web Crypto API & Zero-Trust Architecture siap.', 'success');

    // Hash and SearchParam navigation support
    function handleNavigation() {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab');
        const hash = window.location.hash.replace('#', '');
        
        const targetTab = tabParam || hash;
        if (targetTab === 'tabOTP' || targetTab === 'tabOTP-active') {
            activateTab('tabOTP');
            if (params.get('active') === '1' || targetTab === 'tabOTP-active') {
                setTimeout(() => elements.btnRequestOTP.click(), 100);
            }
        } else if (targetTab === 'tabQRCode') {
            activateTab('tabQRCode');
        } else if (targetTab === 'tabPrivacyAudit') {
            activateTab('tabPrivacyAudit');
        } else if (targetTab === 'tabEncryption') {
            activateTab('tabEncryption');
        }
        window.scrollTo(0, 0);
    }
    window.addEventListener('hashchange', handleNavigation);
    handleNavigation();
});
