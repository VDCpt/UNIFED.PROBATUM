/**
 * ============================================================================
 * UNIFED - PROBATUM · CONTROLO DE ACESSO SOBERANO
 * unifed_access_control.js
 * ============================================================================
 * Versão      : v1.0.0-SOVEREIGN
 * Data        : 2026-04-18
 * Perito      : Consultor Estratégico Independente
 * Finalidade  : Substituir unifed_token_gate.js — Uso Pessoal Perpétuo
 *               Sem tokens temporais. Sem licenciamento SaaS. Sem expiração.
 *
 * MECANISMO DE AUTENTICAÇÃO:
 *   - Overlay de login apresentado ao arranque (ANTES de qualquer módulo)
 *   - Verificação via SubtleCrypto (WebCrypto API nativa — sem dependências)
 *   - Comparação: SHA-256(input_utilizador) === STORED_HASH
 *   - Sucesso → dismiss overlay → liberta carregamento completo do sistema
 *   - Falha   → contador de tentativas + bloqueio progressivo (3 tentativas)
 *
 * ALTERAR A PASSWORD NO FUTURO:
 *   1. Abra o terminal (PowerShell, Bash, ou macOS Terminal)
 *   2. Execute: echo -n "NovaPasswordAqui" | sha256sum
 *      (macOS: echo -n "NovaPasswordAqui" | shasum -a 256)
 *   3. Copie o hash resultante (64 caracteres hexadecimais)
 *   4. Substitua o valor de STORED_HASH abaixo pelo novo hash
 *   5. Guarde o ficheiro e recarregue o sistema
 *
 * PASSWORD PADRÃO : Beatriz2026###@@@
 * HASH PADRÃO     : 2cc9039cff521fa20ce9748ea10ebb59b83de0e922899071a81f1494a0728b54
 *
 * CONFORMIDADE: Art. 125.º CPP · ISO/IEC 27037:2012 · RGPD Art. 32.º
 * MODELO       : Uso Exclusivo e Perpétuo — Soberania do Perito
 * ============================================================================
 */

'use strict';

(function _installAccessControl() {

    // =========================================================================
    // CONFIGURAÇÃO — ÚNICO CAMPO A EDITAR PARA MUDAR A PASSWORD
    // =========================================================================

    /**
     * STORED_HASH — SHA-256 da password de acesso.
     *
     * Para alterar a password:
     *   Terminal: echo -n "NovaPwd" | sha256sum
     *   Substitua o valor abaixo pelo hash de 64 caracteres obtido.
     *
     * @type {string} — 64 caracteres hexadecimais lowercase (SHA-256)
     */
    const STORED_HASH = '2cc9039cff521fa20ce9748ea10ebb59b83de0e922899071a81f1494a0728b54';

    // Número máximo de tentativas antes de bloqueio temporário
    const MAX_ATTEMPTS  = 3;
    // Duração do bloqueio em milissegundos (30 segundos)
    const LOCKOUT_MS    = 30000;

    // =========================================================================
    // ESTADO INTERNO
    // =========================================================================

    let _attempts    = 0;
    let _locked      = false;
    let _lockoutEnd  = 0;
    let _overlayEl   = null;
    let _inputEl     = null;
    let _statusEl    = null;
    let _btnEl       = null;
    let _lockTimerEl = null;

    // =========================================================================
    // BLOQUEIO DO CARREGAMENTO — impedir execução de módulos antes do login
    // =========================================================================

    /**
     * Os módulos subsequentes (script.js, enrichment.js, etc.) verificam
     * window._UNIFED_ACCESS_GRANTED antes de executar operações de dados.
     * Esta flag permanece false até autenticação bem-sucedida.
     */
    window._UNIFED_ACCESS_GRANTED = false;

    // =========================================================================
    // FUNÇÃO SHA-256 VIA WEBCRYPTO (nativa — sem bibliotecas externas)
    // =========================================================================

    /**
     * computeSHA256() — Calcula o SHA-256 de uma string usando SubtleCrypto.
     * Retorna Promise<string> com 64 caracteres hexadecimais lowercase.
     *
     * @param {string} message — Texto a computar
     * @returns {Promise<string>} — Hash SHA-256 em formato hexadecimal
     */
    async function computeSHA256(message) {
        const encoder    = new TextEncoder();
        const data       = encoder.encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray  = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // =========================================================================
    // INJECÇÃO DO OVERLAY DE LOGIN NO DOM
    // =========================================================================

    function _injectOverlay() {
        // CSS do overlay — estilo forense UNIFED-PROBATUM
        const OVERLAY_CSS = `
            #unifed-access-overlay {
                position: fixed;
                inset: 0;
                z-index: 99999;
                background: #000000;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'Courier New', 'Lucida Console', monospace;
            }

            #unifed-access-overlay * {
                box-sizing: border-box;
            }

            #unifed-access-box {
                width: 420px;
                max-width: 95vw;
                background: #0a0a0a;
                border: 1px solid #1a3a1a;
                border-radius: 4px;
                padding: 0;
                overflow: hidden;
                box-shadow: 0 0 60px rgba(0, 255, 80, 0.06), 0 0 0 1px #0f2a0f;
            }

            #unifed-access-header {
                background: #0d1f0d;
                border-bottom: 1px solid #1a3a1a;
                padding: 20px 28px 16px;
            }

            #unifed-access-header .badge {
                display: inline-block;
                font-size: 9px;
                letter-spacing: 2px;
                color: #2a6a2a;
                border: 1px solid #1a3a1a;
                padding: 2px 8px;
                border-radius: 2px;
                margin-bottom: 10px;
                text-transform: uppercase;
            }

            #unifed-access-header h1 {
                margin: 0;
                font-size: 15px;
                font-weight: 700;
                letter-spacing: 1.5px;
                color: #00c850;
                text-transform: uppercase;
            }

            #unifed-access-header p {
                margin: 6px 0 0;
                font-size: 10px;
                color: #3a5a3a;
                letter-spacing: 0.5px;
            }

            #unifed-access-body {
                padding: 28px 28px 24px;
            }

            #unifed-access-body label {
                display: block;
                font-size: 9px;
                letter-spacing: 2px;
                color: #2a5a2a;
                text-transform: uppercase;
                margin-bottom: 8px;
            }

            #unifed-access-input-wrap {
                position: relative;
                margin-bottom: 16px;
            }

            #unifed-pwd-input {
                width: 100%;
                background: #060f06;
                border: 1px solid #1a3a1a;
                border-radius: 2px;
                color: #00c850;
                font-family: 'Courier New', monospace;
                font-size: 14px;
                padding: 12px 44px 12px 14px;
                outline: none;
                transition: border-color 0.2s;
                caret-color: #00c850;
            }

            #unifed-pwd-input:focus {
                border-color: #00c850;
                box-shadow: 0 0 0 2px rgba(0, 200, 80, 0.08);
            }

            #unifed-pwd-input.error {
                border-color: #c80000;
                box-shadow: 0 0 0 2px rgba(200, 0, 0, 0.08);
                animation: _shake 0.35s ease;
            }

            #unifed-pwd-toggle {
                position: absolute;
                right: 12px;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                cursor: pointer;
                color: #2a5a2a;
                font-size: 12px;
                padding: 4px;
                transition: color 0.2s;
            }

            #unifed-pwd-toggle:hover { color: #00c850; }

            #unifed-access-btn {
                width: 100%;
                background: #0d2a0d;
                border: 1px solid #00c850;
                border-radius: 2px;
                color: #00c850;
                font-family: 'Courier New', monospace;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 2px;
                text-transform: uppercase;
                padding: 13px;
                cursor: pointer;
                transition: background 0.2s, color 0.2s, box-shadow 0.2s;
                margin-bottom: 14px;
            }

            #unifed-access-btn:hover:not(:disabled) {
                background: #00c850;
                color: #000;
                box-shadow: 0 0 20px rgba(0, 200, 80, 0.25);
            }

            #unifed-access-btn:disabled {
                opacity: 0.35;
                cursor: not-allowed;
                border-color: #1a3a1a;
                color: #2a4a2a;
            }

            #unifed-status-msg {
                font-size: 10px;
                letter-spacing: 0.5px;
                min-height: 16px;
                text-align: center;
                transition: color 0.2s;
            }

            #unifed-status-msg.ok    { color: #00c850; }
            #unifed-status-msg.err   { color: #c83030; }
            #unifed-status-msg.warn  { color: #c8a000; }
            #unifed-status-msg.info  { color: #2a6a2a; }

            #unifed-lock-timer {
                font-size: 10px;
                text-align: center;
                color: #c83030;
                margin-top: 8px;
                min-height: 14px;
                letter-spacing: 0.5px;
            }

            #unifed-access-footer {
                border-top: 1px solid #0f1f0f;
                padding: 12px 28px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            #unifed-access-footer span {
                font-size: 8px;
                color: #1a3a1a;
                letter-spacing: 1px;
                text-transform: uppercase;
            }

            /* Animação de entrada */
            @keyframes _fadeInScale {
                from { opacity: 0; transform: scale(0.96) translateY(8px); }
                to   { opacity: 1; transform: scale(1) translateY(0); }
            }

            /* Animação de shake em erro */
            @keyframes _shake {
                0%, 100% { transform: translateX(0); }
                20%       { transform: translateX(-6px); }
                40%       { transform: translateX(6px); }
                60%       { transform: translateX(-4px); }
                80%       { transform: translateX(4px); }
            }

            #unifed-access-box {
                animation: _fadeInScale 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }

            /* Efeito de scan line subtil */
            #unifed-access-overlay::before {
                content: '';
                position: fixed;
                inset: 0;
                background: repeating-linear-gradient(
                    0deg,
                    transparent,
                    transparent 2px,
                    rgba(0, 255, 80, 0.015) 2px,
                    rgba(0, 255, 80, 0.015) 4px
                );
                pointer-events: none;
                z-index: 100000;
            }
        `;

        // Injectar CSS
        const styleEl = document.createElement('style');
        styleEl.id    = 'unifed-access-control-css';
        styleEl.textContent = OVERLAY_CSS;
        (document.head || document.documentElement).appendChild(styleEl);

        // HTML do overlay
        const overlay = document.createElement('div');
        overlay.id    = 'unifed-access-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Autenticação UNIFED-PROBATUM');
        overlay.innerHTML = `
            <div id="unifed-access-box">
                <div id="unifed-access-header">
                    <div class="badge">ACESSO RESTRITO · USO EXCLUSIVO</div>
                    <h1>🔐 UNIFED-PROBATUM</h1>
                    <p>v13.12.2-i18n · Sistema de Peritagem Forense Digital · Soberania do Perito</p>
                </div>
                <div id="unifed-access-body">
                    <label for="unifed-pwd-input">Credencial de Acesso</label>
                    <div id="unifed-access-input-wrap">
                        <input
                            type="password"
                            id="unifed-pwd-input"
                            autocomplete="current-password"
                            spellcheck="false"
                            autofocus
                            placeholder="••••••••••••••••••"
                            maxlength="128"
                        />
                        <button
                            id="unifed-pwd-toggle"
                            type="button"
                            title="Mostrar / Ocultar"
                            aria-label="Alternar visibilidade da password"
                        >👁</button>
                    </div>
                    <button id="unifed-access-btn" type="button">
                        ▶ AUTENTICAR
                    </button>
                    <div id="unifed-status-msg" class="info" role="status" aria-live="polite">
                        Introduza a credencial de acesso para continuar.
                    </div>
                    <div id="unifed-lock-timer" aria-live="assertive"></div>
                </div>
                <div id="unifed-access-footer">
                    <span>SHA-256 · WebCrypto · Sem transmissão de dados</span>
                    <span>Uso Pessoal Perpétuo · Sem expiração</span>
                </div>
            </div>
        `;

        // Inserir no topo do body (ou documentElement se body ainda não existir)
        const target = document.body || document.documentElement;
        target.insertBefore(overlay, target.firstChild);

        // Guardar referências
        _overlayEl  = overlay;
        _inputEl    = document.getElementById('unifed-pwd-input');
        _statusEl   = document.getElementById('unifed-status-msg');
        _btnEl      = document.getElementById('unifed-access-btn');
        _lockTimerEl = document.getElementById('unifed-lock-timer');

        // Bind de eventos
        _bindEvents();

        console.log('[UNIFED-ACCESS] Overlay de autenticação montado.');
    }

    // =========================================================================
    // EVENTOS — TECLADO E BOTÃO
    // =========================================================================

    function _bindEvents() {
        // Enter no campo de input
        _inputEl.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                _attemptLogin();
            }
        });

        // Clique no botão de autenticação
        _btnEl.addEventListener('click', function() {
            _attemptLogin();
        });

        // Toggle de visibilidade
        const toggleBtn = document.getElementById('unifed-pwd-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function() {
                if (_inputEl.type === 'password') {
                    _inputEl.type = 'text';
                    toggleBtn.textContent = '🙈';
                } else {
                    _inputEl.type = 'password';
                    toggleBtn.textContent = '👁';
                }
                _inputEl.focus();
            });
        }

        // Prevenir foco fora do overlay (trap de foco básico)
        document.addEventListener('keydown', function _trapFocus(e) {
            if (e.key === 'Tab' && _overlayEl && document.contains(_overlayEl)) {
                e.preventDefault();
                _inputEl.focus();
            }
        });
    }

    // =========================================================================
    // LÓGICA DE AUTENTICAÇÃO
    // =========================================================================

    async function _attemptLogin() {
        // Verificar bloqueio temporal
        if (_locked) {
            const remaining = Math.ceil((_lockoutEnd - Date.now()) / 1000);
            if (remaining > 0) {
                _setStatus(`Sistema bloqueado. Aguarde ${remaining}s.`, 'err');
                return;
            } else {
                _locked   = false;
                _attempts = 0;
                _lockTimerEl.textContent = '';
                _btnEl.disabled  = false;
                _inputEl.disabled = false;
            }
        }

        const pwd = _inputEl.value;

        if (!pwd || pwd.length === 0) {
            _setStatus('Campo vazio. Introduza a credencial.', 'warn');
            _shakeInput();
            return;
        }

        // Desactivar interface durante verificação
        _btnEl.disabled   = true;
        _inputEl.disabled = true;
        _setStatus('A verificar credencial...', 'info');

        try {
            const inputHash = await computeSHA256(pwd);

            if (inputHash === STORED_HASH) {
                // ── ACESSO CONCEDIDO ─────────────────────────────────────────
                _setStatus('✓ Credencial válida. A carregar sistema...', 'ok');
                window._UNIFED_ACCESS_GRANTED = true;
                console.log('[UNIFED-ACCESS] Autenticação bem-sucedida. Sistema desbloqueado.');

                // Pequena pausa para o utilizador ver a confirmação
                await new Promise(resolve => setTimeout(resolve, 700));

                // Remover overlay com fade
                _overlayEl.style.transition = 'opacity 0.4s ease';
                _overlayEl.style.opacity    = '0';
                await new Promise(resolve => setTimeout(resolve, 420));
                _overlayEl.remove();

                // Disparar evento para módulos que possam estar à espera
                document.dispatchEvent(new CustomEvent('unifed:access:granted', {
                    detail: { timestamp: new Date().toISOString() }
                }));

                // Remover CSS do overlay (limpeza de memória)
                const cssEl = document.getElementById('unifed-access-control-css');
                if (cssEl) cssEl.remove();

                console.log('[UNIFED-ACCESS] ✅ Overlay removido. Todos os módulos libertados.');

            } else {
                // ── CREDENCIAL INVÁLIDA ──────────────────────────────────────
                _attempts++;
                _shakeInput();
                _inputEl.value = '';

                const remaining = MAX_ATTEMPTS - _attempts;

                if (_attempts >= MAX_ATTEMPTS) {
                    // Activar bloqueio
                    _locked     = true;
                    _lockoutEnd = Date.now() + LOCKOUT_MS;
                    _btnEl.disabled   = true;
                    _inputEl.disabled = true;
                    _setStatus(`Credencial inválida. Bloqueado por ${LOCKOUT_MS / 1000}s.`, 'err');
                    console.warn('[UNIFED-ACCESS] Bloqueio activado após 3 tentativas falhadas.');
                    _startLockTimer();
                } else {
                    _setStatus(
                        `Credencial inválida. ${remaining} tentativa${remaining !== 1 ? 's' : ''} restante${remaining !== 1 ? 's' : ''}.`,
                        'err'
                    );
                    _inputEl.disabled = false;
                    _btnEl.disabled   = false;
                    _inputEl.focus();
                }
            }

        } catch (cryptoErr) {
            console.error('[UNIFED-ACCESS] Erro na verificação criptográfica:', cryptoErr);
            _setStatus('Erro interno de verificação. Recarregue a página.', 'err');
            _inputEl.disabled = false;
            _btnEl.disabled   = false;
        }
    }

    // =========================================================================
    // TEMPORIZADOR DE BLOQUEIO
    // =========================================================================

    function _startLockTimer() {
        const interval = setInterval(function() {
            const remaining = Math.ceil((_lockoutEnd - Date.now()) / 1000);
            if (remaining <= 0) {
                clearInterval(interval);
                _locked    = false;
                _attempts  = 0;
                _lockTimerEl.textContent  = '';
                _btnEl.disabled   = false;
                _inputEl.disabled = false;
                _setStatus('Desbloqueado. Pode tentar novamente.', 'info');
                _inputEl.focus();
            } else {
                _lockTimerEl.textContent = `Desbloqueio em ${remaining}s`;
            }
        }, 1000);
    }

    // =========================================================================
    // UTILITÁRIOS DE UI
    // =========================================================================

    function _setStatus(msg, type) {
        if (!_statusEl) return;
        _statusEl.textContent = msg;
        _statusEl.className   = type;
    }

    function _shakeInput() {
        if (!_inputEl) return;
        _inputEl.classList.remove('error');
        // Forçar reflow para reiniciar animação
        void _inputEl.offsetWidth;
        _inputEl.classList.add('error');
        setTimeout(function() {
            if (_inputEl) _inputEl.classList.remove('error');
        }, 400);
    }

    // =========================================================================
    // PONTO DE ENTRADA — Injectar overlay assim que o DOM estiver pronto
    // =========================================================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _injectOverlay);
    } else {
        // DOM já está disponível (script carregado no fim do body)
        _injectOverlay();
    }

    // =========================================================================
    // INTERFACE PÚBLICA — Para diagnóstico via consola de developer tools
    // =========================================================================

    window._UNIFED_ACCESS_CONTROL = {
        version    : 'v1.0.0-SOVEREIGN',
        model      : 'Uso Exclusivo e Perpétuo — Sem expiração — Sem SaaS',
        granted    : function() { return window._UNIFED_ACCESS_GRANTED; },
        attempts   : function() { return _attempts; },
        isLocked   : function() { return _locked; },
        /**
         * updateHash() — Para alteração programática do hash em runtime (sessão única)
         * Para alteração permanente, editar STORED_HASH directamente no código.
         * ATENÇÃO: Este método não persiste entre sessões. Apenas para testes.
         */
        _debugInfo : function() {
            console.log('[UNIFED-ACCESS] Estado:', {
                granted : window._UNIFED_ACCESS_GRANTED,
                attempts: _attempts,
                locked  : _locked
            });
        }
    };

    console.log('[UNIFED-ACCESS] ✅ unifed_access_control.js v1.0.0-SOVEREIGN carregado.');
    console.log('[UNIFED-ACCESS] Modelo: Uso Pessoal Perpétuo · Sem tokens · Sem expiração');

})();
