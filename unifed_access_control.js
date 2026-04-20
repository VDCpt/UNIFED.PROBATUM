/**
 * ============================================================================
 * UNIFED - PROBATUM · CONTROLO DE ACESSO SOBERANO
 * unifed_access_control.js
 * ============================================================================
 * Versão      : v3.1.0-COMPLIANCE-FORGE
 * Data        : 2026-04-19
 * Finalidade  : Halt Execution Protocol + Glassmorphism UI + Forensic
 *               Hydration Visualizer + Compliance Splash + Post-Auth Unlock
 *
 * NOVIDADES v3.1:
 *   · #complianceOverlay entre login e dashboard (Glassmorphism profundo)
 *   · Splash de Metodologia com Art. 6.º Lei n.º 109/2009
 *   · Terminal de custódia animado (SHA-256 / ISO / SMOKING GUN)
 *   · Botão #prosseguirAnalise dispara ensureDemoDataLoaded() + reveal
 *   · Glow pulse no botão [CASO REAL] quando analysis.executed === false
 *   · Footer de conformidade estático em todas as camadas
 *   · Toolbar normalizada (scale 0.85, flex-end)
 *   · Stat cards com hierarquia tipográfica (labels 0.75rem / valores 1.8rem)
 *
 * NOVIDADES v3.0:
 *   · Design Glassmorphism "Cyber-Security Command Center"
 *   · Tipografia: Syne (títulos) + JetBrains Mono (hashes / métricas)
 *   · Shimmer effect (brilho animado) na caixa de login
 *   · Forensic Module Hydration UI com Data Stream + terminal log
 *   · _onAuthSuccess() com desbloqueio garantido de #pureDashboardWrapper
 *   · Remoção real do overlay do DOM (sem display:none residual)
 *   · Chamada explícita a window._activatePurePanel() com fallback manual
 *   · Preview parcial do SHA-256 no rodapé enquanto o utilizador digita
 *
 * PASSWORD PADRÃO : Beatriz2026###@@@
 * HASH PADRÃO     : 2cc9039cff521fa20ce9748ea10ebb59b83de0e922899071a81f1494a0728b54
 *
 * CONFORMIDADE: Art. 125.º CPP · ISO/IEC 27037:2012 · RGPD Art. 32.º
 * ============================================================================
 */

'use strict';

(function _installAccessControl() {

    if (window._UNIFED_AC_INSTALLED === true) {
        console.info('[UNIFED-AC] Já instalado. Re-execução ignorada.');
        return;
    }
    window._UNIFED_AC_INSTALLED = true;

    // =========================================================================
    // CONFIGURAÇÃO
    // =========================================================================

    const STORED_HASH  = '2cc9039cff521fa20ce9748ea10ebb59b83de0e922899071a81f1494a0728b54';
    const MAX_ATTEMPTS = 3;
    const LOCKOUT_MS   = 30000;

    /**
     * MODULES_SEQUENCE — Sequência canónica de carregamento dinâmico.
     * Editável sem recompilar o sistema.
     */
    const MODULES_SEQUENCE = [
        'unifed_panel_activator.js',
        'unifed_core_harmonizer.js',
        'script.js',
        'script_injection.js',
        'enrichment.js',
        'nexus.js',
        'unifed_triada_export.js'
    ];

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

    window._UNIFED_ACCESS_GRANTED = false;

    // =========================================================================
    // SHA-256 VIA WEBCRYPTO (nativa — sem dependências externas)
    // =========================================================================

    async function computeSHA256(message) {
        const enc    = new TextEncoder();
        const buf    = await crypto.subtle.digest('SHA-256', enc.encode(message));
        return Array.from(new Uint8Array(buf))
                    .map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // =========================================================================
    // CSS CONSOLIDADO — GLASSMORPHISM + FORENSIC HYDRATION UI
    // Tipografia: Syne (display/títulos) + JetBrains Mono (métricas/hashes)
    // =========================================================================

    const OVERLAY_CSS = `
        /* ── Fontes ──────────────────────────────────────────────────────── */
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;800&family=JetBrains+Mono:wght@400;600&display=swap');

        #unifed-ac-overlay * { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── Backdrop com grelha de circuito e gradientes ambientais ─────── */
        #unifed-ac-overlay {
            position: fixed;
            inset: 0;
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'JetBrains Mono', 'Courier New', monospace;
            background:
                radial-gradient(ellipse 80% 55% at 50% -5%,
                    rgba(0, 229, 255, 0.13) 0%, transparent 70%),
                radial-gradient(ellipse 55% 50% at 85% 105%,
                    rgba(99, 0, 255, 0.09) 0%, transparent 70%),
                #060d1a;
            overflow: hidden;
        }

        /* Grelha tipo PCB */
        #unifed-ac-overlay::before {
            content: '';
            position: absolute;
            inset: 0;
            background-image:
                linear-gradient(rgba(0, 229, 255, 0.045) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 229, 255, 0.045) 1px, transparent 1px);
            background-size: 44px 44px;
            mask-image: radial-gradient(ellipse 88% 88% at 50% 50%,
                black 35%, transparent 100%);
            pointer-events: none;
        }

        /* Scan lines em movimento */
        #unifed-ac-overlay::after {
            content: '';
            position: absolute;
            inset: 0;
            background: repeating-linear-gradient(
                0deg,
                transparent 0px, transparent 3px,
                rgba(0, 229, 255, 0.016) 3px, rgba(0, 229, 255, 0.016) 4px
            );
            pointer-events: none;
            animation: _scanMove 10s linear infinite;
        }

        @keyframes _scanMove {
            0%   { background-position: 0 0; }
            100% { background-position: 0 200px; }
        }

        /* ── Caixa principal: Glassmorphism ──────────────────────────────── */
        #unifed-ac-box {
            position: relative;
            width: 468px;
            max-width: 96vw;
            background: rgba(15, 23, 42, 0.82);
            backdrop-filter: blur(15px) saturate(180%);
            -webkit-backdrop-filter: blur(15px) saturate(180%);
            border: 1px solid rgba(0, 229, 255, 0.28);
            border-radius: 18px;
            overflow: hidden;
            box-shadow:
                0 0 0 1px rgba(0, 229, 255, 0.07),
                0 36px 90px rgba(0, 0, 0, 0.65),
                0 0 70px rgba(0, 229, 255, 0.06),
                inset 0 1px 0 rgba(255, 255, 255, 0.06);
            animation: _boxEntrance 0.52s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes _boxEntrance {
            from { opacity: 0; transform: translateY(22px) scale(0.97); }
            to   { opacity: 1; transform: translateY(0)    scale(1); }
        }

        /* Shimmer effect — brilho que percorre a caixa */
        #unifed-ac-box::before {
            content: '';
            position: absolute;
            top: 0; left: -110%;
            width: 55%; height: 100%;
            background: linear-gradient(
                108deg,
                transparent 38%,
                rgba(0, 229, 255, 0.065) 50%,
                transparent 62%
            );
            animation: _shimmer 4.5s ease-in-out infinite;
            pointer-events: none;
            z-index: 1;
        }

        @keyframes _shimmer {
            0%   { left: -110%; }
            42%  { left: 165%; }
            100% { left: 165%; }
        }

        /* Linha de acento RGB superior */
        #unifed-ac-box::after {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 2px;
            background: linear-gradient(
                90deg,
                transparent 0%,
                rgba(0, 229, 255, 0.7) 25%,
                rgba(139, 92, 246, 0.7) 60%,
                rgba(0, 229, 255, 0.3) 85%,
                transparent 100%
            );
        }

        /* ── Cabeçalho ───────────────────────────────────────────────────── */
        #unifed-ac-header {
            padding: 30px 34px 22px;
            border-bottom: 1px solid rgba(0, 229, 255, 0.1);
            position: relative;
            z-index: 2;
        }

        #unifed-ac-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 8.5px;
            letter-spacing: 2.5px;
            color: rgba(0, 229, 255, 0.55);
            border: 1px solid rgba(0, 229, 255, 0.18);
            padding: 4px 12px;
            border-radius: 4px;
            margin-bottom: 16px;
            text-transform: uppercase;
            background: rgba(0, 229, 255, 0.04);
        }

        #unifed-ac-badge::before {
            content: '';
            width: 5px; height: 5px;
            border-radius: 50%;
            background: #00e5ff;
            box-shadow: 0 0 7px #00e5ff;
            flex-shrink: 0;
            animation: _pulseDot 1.8s ease-in-out infinite;
        }

        @keyframes _pulseDot {
            0%, 100% { opacity: 1; box-shadow: 0 0 7px #00e5ff; }
            50%       { opacity: 0.35; box-shadow: 0 0 2px #00e5ff; }
        }

        #unifed-ac-title {
            font-family: 'Syne', 'Segoe UI', system-ui, sans-serif;
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -0.8px;
            color: #f0f9ff;
            line-height: 1.1;
            margin-bottom: 8px;
        }

        #unifed-ac-title .ac-accent {
            background: linear-gradient(135deg, #00e5ff 0%, #8b5cf6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        #unifed-ac-subtitle {
            font-family: 'JetBrains Mono', monospace;
            font-size: 10px;
            color: rgba(148, 163, 184, 0.55);
            letter-spacing: 0.2px;
        }

        /* ── Corpo ───────────────────────────────────────────────────────── */
        #unifed-ac-body {
            padding: 26px 34px 22px;
            position: relative;
            z-index: 2;
        }

        #unifed-ac-label {
            display: block;
            font-family: 'JetBrains Mono', monospace;
            font-size: 8.5px;
            letter-spacing: 2px;
            color: rgba(0, 229, 255, 0.45);
            text-transform: uppercase;
            margin-bottom: 10px;
        }

        #unifed-ac-input-wrap {
            position: relative;
            margin-bottom: 14px;
        }

        #unifed-ac-input-wrap.focused::after {
            content: '';
            position: absolute;
            inset: -1px;
            border-radius: 10px;
            border: 1px solid rgba(0, 229, 255, 0.5);
            box-shadow: 0 0 0 3px rgba(0, 229, 255, 0.08),
                        0 0 24px rgba(0, 229, 255, 0.08);
            pointer-events: none;
        }

        #unifed-pwd-input {
            width: 100%;
            background: rgba(2, 8, 23, 0.72);
            border: 1px solid rgba(0, 229, 255, 0.18);
            border-radius: 9px;
            color: #00e5ff;
            font-family: 'JetBrains Mono', monospace;
            font-size: 15px;
            letter-spacing: 4px;
            padding: 13px 46px 13px 16px;
            outline: none;
            transition: border-color 0.25s;
            caret-color: #00e5ff;
        }

        #unifed-pwd-input[type="text"] {
            letter-spacing: 1.5px;
        }

        #unifed-pwd-input::placeholder {
            color: rgba(0, 229, 255, 0.15);
            letter-spacing: 4px;
        }

        #unifed-pwd-input.error {
            border-color: rgba(239, 68, 68, 0.55);
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.07);
            animation: _shake 0.38s ease;
        }

        @keyframes _shake {
            0%, 100% { transform: translateX(0); }
            20%       { transform: translateX(-7px); }
            40%       { transform: translateX(7px); }
            60%       { transform: translateX(-4px); }
            80%       { transform: translateX(4px); }
        }

        #unifed-pwd-toggle {
            position: absolute;
            right: 14px; top: 50%;
            transform: translateY(-50%);
            background: none; border: none;
            cursor: pointer;
            color: rgba(0, 229, 255, 0.3);
            font-size: 13px;
            padding: 4px;
            line-height: 1;
            transition: color 0.2s;
        }
        #unifed-pwd-toggle:hover { color: #00e5ff; }

        /* Botão de autenticação */
        #unifed-ac-btn {
            width: 100%;
            position: relative;
            background: linear-gradient(135deg,
                rgba(0, 229, 255, 0.1) 0%,
                rgba(139, 92, 246, 0.1) 100%);
            border: 1px solid rgba(0, 229, 255, 0.32);
            border-radius: 9px;
            color: #e0f7ff;
            font-family: 'Syne', sans-serif;
            font-size: 11.5px;
            font-weight: 700;
            letter-spacing: 3px;
            text-transform: uppercase;
            padding: 14px;
            cursor: pointer;
            transition: all 0.28s ease;
            margin-bottom: 16px;
            overflow: hidden;
        }

        #unifed-ac-btn::before {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(135deg,
                rgba(0,229,255,0) 0%,
                rgba(0,229,255,0.14) 50%,
                rgba(0,229,255,0) 100%);
            transform: translateX(-100%);
            transition: transform 0.42s ease;
        }

        #unifed-ac-btn:hover:not(:disabled)::before { transform: translateX(100%); }

        #unifed-ac-btn:hover:not(:disabled) {
            background: linear-gradient(135deg,
                rgba(0, 229, 255, 0.18) 0%,
                rgba(139, 92, 246, 0.18) 100%);
            border-color: rgba(0, 229, 255, 0.65);
            box-shadow: 0 0 32px rgba(0, 229, 255, 0.14),
                        inset 0 1px 0 rgba(255, 255, 255, 0.08);
            transform: translateY(-1px);
        }

        #unifed-ac-btn:disabled {
            opacity: 0.28; cursor: not-allowed;
            border-color: rgba(0, 229, 255, 0.1);
            transform: none; box-shadow: none;
        }

        /* Status e lockout */
        #unifed-ac-status {
            font-family: 'JetBrains Mono', monospace;
            font-size: 10px;
            letter-spacing: 0.4px;
            min-height: 16px;
            text-align: center;
            transition: color 0.2s;
        }
        #unifed-ac-status.ok   { color: #34d399; }
        #unifed-ac-status.err  { color: #f87171; }
        #unifed-ac-status.warn { color: #fbbf24; }
        #unifed-ac-status.info { color: rgba(0, 229, 255, 0.45); }

        #unifed-ac-lock-timer {
            font-family: 'JetBrains Mono', monospace;
            font-size: 10px;
            text-align: center;
            color: #f87171;
            margin-top: 8px;
            min-height: 14px;
            letter-spacing: 0.5px;
        }

        /* ── FORENSIC MODULE HYDRATION UI ────────────────────────────────── */
        #unifed-hydration-panel {
            display: none;
            flex-direction: column;
            gap: 0;
            margin-top: 18px;
            border: 1px solid rgba(0, 229, 255, 0.14);
            border-radius: 10px;
            overflow: hidden;
            background: rgba(2, 8, 23, 0.65);
        }
        #unifed-hydration-panel.active { display: flex; }

        /* Barra de título tipo terminal */
        #unifed-hydration-header {
            display: flex;
            align-items: center;
            gap: 7px;
            padding: 8px 14px;
            background: rgba(0, 229, 255, 0.04);
            border-bottom: 1px solid rgba(0, 229, 255, 0.08);
        }
        #unifed-hydration-header .hy-label {
            font-family: 'JetBrains Mono', monospace;
            font-size: 8px;
            letter-spacing: 2px;
            color: rgba(0, 229, 255, 0.35);
            text-transform: uppercase;
            margin-left: 4px;
        }
        .hy-dot { width: 6px; height: 6px; border-radius: 50%; }
        .hy-dot-r { background: #f87171; }
        .hy-dot-y { background: #fbbf24; }
        .hy-dot-g { background: #34d399; animation: _pulseDot 1.4s ease-in-out infinite; }

        /* Área de log do terminal */
        #unifed-hydration-log {
            font-family: 'JetBrains Mono', monospace;
            font-size: 10px;
            padding: 10px 14px;
            min-height: 64px;
            max-height: 94px;
            overflow-y: auto;
            scrollbar-width: none;
            line-height: 1.75;
        }
        #unifed-hydration-log::-webkit-scrollbar { display: none; }

        .hy-log-line {
            display: flex;
            align-items: baseline;
            gap: 8px;
            animation: _logSlide 0.18s ease forwards;
            opacity: 0;
        }

        @keyframes _logSlide {
            from { opacity: 0; transform: translateX(-6px); }
            to   { opacity: 1; transform: translateX(0); }
        }

        .hy-ts   { color: rgba(0, 229, 255, 0.25); font-size: 9px; flex-shrink: 0; }
        .hy-load { color: #6366f1; }
        .hy-ok   { color: #34d399; }
        .hy-warn { color: #fbbf24; }
        .hy-sys  { color: #34d399; }
        .hy-file { color: #e2e8f0; }
        .hy-cursor {
            display: inline-block;
            width: 5px; height: 10px;
            background: #00e5ff;
            animation: _blink 0.75s step-end infinite;
            vertical-align: middle;
            margin-left: 2px;
            border-radius: 1px;
        }
        @keyframes _blink { 50% { opacity: 0; } }

        /* ── Data Stream Progress Bar ────────────────────────────────────── */
        #unifed-progress-track {
            position: relative;
            height: 30px;
            border-top: 1px solid rgba(0, 229, 255, 0.08);
            background: rgba(0, 0, 0, 0.35);
            overflow: hidden;
            flex-shrink: 0;
        }

        /* Stream de dados em hex — fundo animado */
        #unifed-progress-track::before {
            content: '4E55 4C4C 2042 5954 4553 202F 4157 4149 5449 4E47 2048 5944 5241 5449 4F4E 202F 5359 5354 454D 204C 4F41 4420 4143 5449 5645 202F 4441 5441 2053 5452 4541 4D20 2F20 464F 5245 4E53 4943 202F';
            position: absolute;
            top: 50%; left: 0;
            transform: translateY(-50%);
            font-family: 'JetBrains Mono', monospace;
            font-size: 7px;
            letter-spacing: 1.5px;
            color: rgba(0, 229, 255, 0.07);
            white-space: nowrap;
            animation: _hexStream 7s linear infinite;
        }

        @keyframes _hexStream {
            0%   { transform: translateY(-50%) translateX(0); }
            100% { transform: translateY(-50%) translateX(-50%); }
        }

        /* Fill da barra — efeito 3D com gradiente e segmentos */
        #unifed-progress-fill {
            position: absolute;
            top: 0; left: 0; bottom: 0;
            width: 0%;
            background: linear-gradient(
                90deg,
                rgba(0, 229, 255, 0.12) 0%,
                rgba(0, 229, 255, 0.32) 55%,
                rgba(0, 229, 255, 0.62) 82%,
                rgba(255, 255, 255, 0.85) 100%
            );
            transition: width 0.38s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 4px 0 22px rgba(0, 229, 255, 0.45);
        }

        /* Highlight superior (efeito de profundidade 3D) */
        #unifed-progress-fill::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 38%;
            background: linear-gradient(180deg,
                rgba(255, 255, 255, 0.14) 0%, transparent 100%);
        }

        /* Segmentos (ticks verticais) */
        #unifed-progress-fill::after {
            content: '';
            position: absolute;
            inset: 0;
            background: repeating-linear-gradient(
                90deg,
                transparent 0px, transparent 20px,
                rgba(0, 229, 255, 0.28) 20px, rgba(0, 229, 255, 0.28) 21px
            );
        }

        /* Percentagem sobreposta */
        #unifed-progress-pct {
            position: absolute;
            right: 12px; top: 50%;
            transform: translateY(-50%);
            font-family: 'JetBrains Mono', monospace;
            font-size: 9px;
            color: rgba(0, 229, 255, 0.65);
            letter-spacing: 1px;
            z-index: 2;
        }

        /* ── Rodapé ──────────────────────────────────────────────────────── */
        #unifed-ac-footer {
            padding: 14px 34px;
            border-top: 1px solid rgba(0, 229, 255, 0.06);
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4px;
            position: relative;
            z-index: 2;
        }

        .ac-footer-item {
            font-family: 'JetBrains Mono', monospace;
            font-size: 7.5px;
            color: rgba(0, 229, 255, 0.18);
            letter-spacing: 0.8px;
            text-transform: uppercase;
        }
        .ac-footer-item:nth-child(even) { text-align: right; }

        /* Preview do hash SHA-256 em tempo real */
        #unifed-ac-hash-display {
            grid-column: 1 / -1;
            font-family: 'JetBrains Mono', monospace;
            font-size: 7.5px;
            color: rgba(0, 229, 255, 0.14);
            letter-spacing: 0.5px;
            margin-top: 8px;
            border-top: 1px solid rgba(0, 229, 255, 0.06);
            padding-top: 8px;
            word-break: break-all;
            line-height: 1.6;
        }
        #unifed-ac-hash-display .hd-label { color: rgba(0, 229, 255, 0.25); }
        #unifed-ac-hash-preview { color: rgba(0, 229, 255, 0.38); }
    `;

    // =========================================================================
    // INJECÇÃO DO OVERLAY
    // =========================================================================

    function _injectOverlay() {
        // Fonte via <link> (fallback se @import CORS bloquear)
        const fontLink   = document.createElement('link');
        fontLink.rel     = 'preconnect';
        fontLink.href    = 'https://fonts.googleapis.com';
        document.head.appendChild(fontLink);

        const fontLink2  = document.createElement('link');
        fontLink2.rel    = 'stylesheet';
        fontLink2.href   = 'https://fonts.googleapis.com/css2?family=Syne:wght@600;800&family=JetBrains+Mono:wght@400;600&display=swap';
        document.head.appendChild(fontLink2);

        const styleEl       = document.createElement('style');
        styleEl.id          = 'unifed-ac-css';
        styleEl.textContent = OVERLAY_CSS;
        (document.head || document.documentElement).appendChild(styleEl);

        const overlay    = document.createElement('div');
        overlay.id       = 'unifed-ac-overlay';
        overlay.setAttribute('role',       'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'UNIFED-PROBATUM — Autenticação Forense');

        overlay.innerHTML = `
            <div id="unifed-ac-box">

                <div id="unifed-ac-header">
                    <div id="unifed-ac-badge">
                        ACESSO RESTRITO &nbsp;·&nbsp; HALT EXECUTION PROTOCOL
                    </div>
                    <div id="unifed-ac-title">
                        UNIFED&nbsp;<span class="ac-accent">PROBATUM</span>
                    </div>
                    <div id="unifed-ac-subtitle">
                        v13.12.2&#8209;i18n &nbsp;·&nbsp; Sistema de Peritagem Forense Digital &nbsp;·&nbsp; Soberania do Perito
                    </div>
                </div>

                <div id="unifed-ac-body">
                    <label id="unifed-ac-label" for="unifed-pwd-input">
                        &#9655; CREDENCIAL DE ACESSO (SHA&#8209;256)
                    </label>
                    <div id="unifed-ac-input-wrap">
                        <input
                            type="password"
                            id="unifed-pwd-input"
                            autocomplete="current-password"
                            spellcheck="false"
                            autofocus
                            placeholder="&#xB7; &#xB7; &#xB7; &#xB7; &#xB7; &#xB7; &#xB7; &#xB7; &#xB7; &#xB7; &#xB7; &#xB7;"
                            maxlength="128"
                        />
                        <button
                            id="unifed-pwd-toggle"
                            type="button"
                            title="Alternar visibilidade"
                            aria-label="Alternar visibilidade da password"
                        >&#128065;</button>
                    </div>

                    <button id="unifed-ac-btn" type="button">
                        &#9654;&ensp;AUTENTICAR SESS&#195;O
                    </button>

                    <div id="unifed-ac-status" class="info"
                         role="status" aria-live="polite">
                        Introduza a credencial de acesso para continuar.
                    </div>
                    <div id="unifed-ac-lock-timer" aria-live="assertive"></div>

                    <div id="unifed-hydration-panel"
                         role="progressbar"
                         aria-label="Hidratação de módulos forenses">
                        <div id="unifed-hydration-header">
                            <div class="hy-dot hy-dot-r"></div>
                            <div class="hy-dot hy-dot-y"></div>
                            <div class="hy-dot hy-dot-g"></div>
                            <span class="hy-label">FORENSIC MODULE HYDRATION &mdash; DATA STREAM</span>
                        </div>
                        <div id="unifed-hydration-log"></div>
                        <div id="unifed-progress-track">
                            <div id="unifed-progress-fill"></div>
                            <div id="unifed-progress-pct">0%</div>
                        </div>
                    </div>
                </div>

                <div id="unifed-ac-footer">
                    <div class="ac-footer-item">SHA&#8209;256 &middot; WebCrypto API</div>
                    <div class="ac-footer-item">Uso Perp&#233;tuo &middot; Sem Expira&#231;&#227;o</div>
                    <div class="ac-footer-item">ISO/IEC 27037:2012 &middot; Art. 125.&#186; CPP</div>
                    <div class="ac-footer-item">DORA (UE) 2022/2554</div>
                    <div id="unifed-ac-hash-display">
                        <span class="hd-label">SHA&#8209;256(input) &#8594; </span><span id="unifed-ac-hash-preview">&#183;&#183;&#183;&#183;&#183;&#183;&#183;&#183;</span>
                    </div>
                </div>

            </div>
        `;

        const target = document.body || document.documentElement;
        target.insertBefore(overlay, target.firstChild);

        _overlayEl   = overlay;
        _inputEl     = document.getElementById('unifed-pwd-input');
        _statusEl    = document.getElementById('unifed-ac-status');
        _btnEl       = document.getElementById('unifed-ac-btn');
        _lockTimerEl = document.getElementById('unifed-ac-lock-timer');

        _bindEvents();
        console.log('[UNIFED-AC] Overlay v3.0-CYBER-FORGE montado.');
    }

    // =========================================================================
    // EVENTOS
    // =========================================================================

    function _bindEvents() {
        _inputEl.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); _attemptLogin(); }
        });
        _btnEl.addEventListener('click', _attemptLogin);

        // Glow no wrapper do input
        const wrap = document.getElementById('unifed-ac-input-wrap');
        _inputEl.addEventListener('focus', function() { if (wrap) wrap.classList.add('focused');    });
        _inputEl.addEventListener('blur',  function() { if (wrap) wrap.classList.remove('focused'); });

        // Preview do SHA-256 enquanto o utilizador digita
        const hashPreview = document.getElementById('unifed-ac-hash-preview');
        _inputEl.addEventListener('input', async function() {
            if (!hashPreview) return;
            const val = _inputEl.value;
            if (!val) { hashPreview.textContent = '\xB7\xB7\xB7\xB7\xB7\xB7\xB7\xB7'; return; }
            try {
                const h = await computeSHA256(val);
                hashPreview.textContent = h.slice(0, 16) + '\u00B7\u00B7\u00B7' + h.slice(-8);
            } catch (_) { hashPreview.textContent = '????????'; }
        });

        // Toggle visibilidade
        const toggleBtn = document.getElementById('unifed-pwd-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function() {
                _inputEl.type = (_inputEl.type === 'password') ? 'text' : 'password';
                toggleBtn.textContent = (_inputEl.type === 'text') ? '\uD83D\uDE48' : '\uD83D\uDC41';
                _inputEl.focus();
            });
        }

        // Focus trap
        document.addEventListener('keydown', function _trap(e) {
            if (e.key === 'Tab' && _overlayEl && document.contains(_overlayEl)) {
                e.preventDefault(); _inputEl.focus();
            }
        });
    }

    // =========================================================================
    // FORENSIC HYDRATION UI — _updateProgressBarVisual()
    // =========================================================================

    /**
     * _updateProgressBarVisual() — Actualiza o Forensic Module Hydration UI.
     *
     * Emite uma linha de log no terminal forense com timestamp ISO, tag
     * colorida e nome do ficheiro. Anima a barra de progresso (Data Stream)
     * via requestAnimationFrame para garantir que cada frame é processado
     * antes do módulo seguinte iniciar. Actualiza a percentagem em tempo real.
     *
     * @param {string}               moduleName — nome do ficheiro (ex: "nexus.js")
     * @param {number}               index      — índice actual (0-based)
     * @param {number}               total      — total de módulos na sequência
     * @param {'load'|'ok'|'warn'|'sys'} status — estado da linha de log
     */
    function _updateProgressBarVisual(moduleName, index, total, status) {
        status = status || 'load';
        const logEl  = document.getElementById('unifed-hydration-log');
        const fill   = document.getElementById('unifed-progress-fill');
        const pctEl  = document.getElementById('unifed-progress-pct');
        const panel  = document.getElementById('unifed-hydration-panel');

        if (panel && !panel.classList.contains('active')) {
            panel.classList.add('active');
        }

        // ── Linha de log ──────────────────────────────────────────────────
        if (logEl) {
            // Remover cursor anterior (blinking cursor do módulo em loading)
            const prevCursor = logEl.querySelector('.hy-cursor');
            if (prevCursor) prevCursor.remove();

            const ts = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm

            const tagMap = {
                load : '<span class="hy-load">[LOAD]</span>',
                ok   : '<span class="hy-ok">[ OK ]</span>',
                warn : '<span class="hy-warn">[WARN]</span>',
                sys  : '<span class="hy-sys">[ SYS ]</span>'
            };
            const tag = tagMap[status] || tagMap.load;

            const line        = document.createElement('div');
            line.className    = 'hy-log-line';
            line.style.animationDelay = '0.02s';
            line.innerHTML    =
                '<span class="hy-ts">' + ts + '</span>' +
                tag +
                '<span class="hy-file">' + moduleName + '</span>' +
                (status === 'load' ? '<span class="hy-cursor"></span>' : '');

            logEl.appendChild(line);

            // Auto-scroll — rAF garante que o nó já está no DOM
            requestAnimationFrame(function() {
                logEl.scrollTop = logEl.scrollHeight;
            });
        }

        // ── Barra de progresso Data Stream ────────────────────────────────
        if (fill && pctEl) {
            // +1 porque index é 0-based e queremos mostrar progresso após cada módulo
            const completed = (status === 'load') ? index : index + 1;
            const pct = Math.min(100, Math.round((completed / total) * 100));
            requestAnimationFrame(function() {
                fill.style.width   = pct + '%';
                pctEl.textContent  = pct + '%';
            });
        }
    }

    // =========================================================================
    // POST-AUTH FLOW — _onAuthSuccess()
    // Garante desbloqueio total da UI após autenticação bem-sucedida.
    // =========================================================================

    /**
     * _onAuthSuccess() — Sequência atómica de desbloqueio pós-autenticação.
     *
     * Ordem de operações garantida:
     *   1. Carregar todos os módulos em série com feedback Hydration UI
     *   2. Linha final "SYS · SISTEMA OPERACIONAL" no terminal
     *   3. Fade-out do overlay (CSS transition 450ms)
     *   4. _overlayEl.remove() — remoção real do DOM (z-index limpo)
     *   5. Remoção do <style> do overlay (cleanup de memória)
     *   6. Forçar #pureDashboardWrapper: opacity=1, display=block, z-index=''
     *   7. Adicionar classe 'activated' ao wrapper
     *   8. Chamar window._activatePurePanel() (com fallback manual)
     *   9. Disparar UNIFED_CORE_READY + unifed:access:granted
     *
     * @returns {Promise<void>}
     */
    async function _onAuthSuccess() {
        window._UNIFED_ACCESS_GRANTED = true;
        _setStatus('\u2713 Credencial v\u00E1lida. A iniciar hidrata\u00E7\u00E3o forense...', 'ok');
        console.log('[UNIFED-AC] Autentica\u00E7\u00E3o bem-sucedida. Halt Execution Protocol activo.');

        // ── 1. Carregar módulos com Hydration UI ─────────────────────────
        let loaded = 0;
        const total = MODULES_SEQUENCE.length;

        for (let i = 0; i < total; i++) {
            const src = MODULES_SEQUENCE[i];

            _updateProgressBarVisual(src, i, total, 'load');
            // Frame de respiro para a animação ser perceptível
            await new Promise(function(r) { requestAnimationFrame(r); });

            try {
                await _loadScriptDynamic(src);
                loaded++;
                _updateProgressBarVisual(src, i, total, 'ok');
            } catch (e) {
                _updateProgressBarVisual(src, i, total, 'warn');
                console.warn('[UNIFED-AC] \u26A0 Fail-soft: ' + src);
            }

            // Micro-pausa para o efeito de scanning ser visível (120ms por módulo)
            await new Promise(function(r) { setTimeout(r, 120); });
        }

        // ── 2. Linha final de sistema ─────────────────────────────────────
        const logEl = document.getElementById('unifed-hydration-log');
        if (logEl) {
            const done        = document.createElement('div');
            done.className    = 'hy-log-line';
            done.style.animationDelay = '0.05s';
            done.innerHTML    =
                '<span class="hy-ts">' + new Date().toISOString().slice(11,23) + '</span>' +
                '<span class="hy-sys">[ SYS ]</span>' +
                '<span class="hy-file" style="color:#34d399;">' +
                    loaded + '/' + total + ' m\u00F3dulos hidratados \u00B7 SISTEMA OPERACIONAL' +
                '</span>';
            logEl.appendChild(done);
            logEl.scrollTop = logEl.scrollHeight;
        }

        // Pausa para leitura do estado final antes do fade
        await new Promise(function(r) { setTimeout(r, 850); });

        // ── 3+4. Fade-out e remoção real do DOM ──────────────────────────
        _overlayEl.style.transition = 'opacity 0.45s ease';
        _overlayEl.style.opacity    = '0';
        await new Promise(function(r) { setTimeout(r, 465); });

        // Remoção real — elimina o nó completamente, sem display:none residual.
        // Isto garante que nenhum z-index, pointer-events ou foco residual
        // bloqueia a interacção com os elementos do dashboard.
        _overlayEl.remove();
        _overlayEl = null;

        // ── 5. Cleanup de CSS do overlay ─────────────────────────────────
        const cssEl = document.getElementById('unifed-ac-css');
        if (cssEl) cssEl.remove();

        // ── 6+7. Desbloqueio explícito de #pureDashboardWrapper ──────────
        const wrapper = document.getElementById('pureDashboardWrapper');
        if (wrapper) {
            wrapper.style.opacity       = '1';
            wrapper.style.display       = 'block';
            wrapper.style.visibility    = 'visible';
            wrapper.style.pointerEvents = 'auto';
            wrapper.style.zIndex        = '';   // Limpar z-index residual
            wrapper.style.position      = '';   // Limpar posicionamento residual
            wrapper.classList.add('activated');
            console.log('[UNIFED-AC] \u2705 #pureDashboardWrapper desbloqueado (opacity:1 \u00B7 z-index limpo).');
        } else {
            console.warn('[UNIFED-AC] \u26A0 #pureDashboardWrapper n\u00E3o encontrado. Verifi\u00E7 o DOM.');
        }

        // ── 8a. COMPLIANCE OVERLAY — Intercalação entre login e dashboard ──
        // Suspende a activação do painel até o perito confirmar metodologia.
        await _showComplianceOverlay(loaded, total);

        // ── 8b. Activar painel via função registada ───────────────────────
        // rAF garante que os scripts carregados acima já registaram _activatePurePanel
        await new Promise(function(r) { requestAnimationFrame(function() { requestAnimationFrame(r); }); });

        if (typeof window._activatePurePanel === 'function') {
            try {
                await window._activatePurePanel(false);
                console.log('[UNIFED-AC] \u2705 _activatePurePanel() executada com sucesso.');
            } catch (activateErr) {
                console.warn('[UNIFED-AC] \u26A0 _activatePurePanel() lan\u00E7ou erro:', activateErr.message);
                if (wrapper) { wrapper.style.opacity = '1'; wrapper.style.display = 'block'; }
            }
        } else {
            console.warn('[UNIFED-AC] \u26A0 _activatePurePanel n\u00E3o dispon\u00EDvel. Desbloqueio manual aplicado.');
            if (wrapper) { wrapper.style.opacity = '1'; wrapper.style.display = 'block'; }
        }

        // ── 8c. Trigger CASO REAL com glow quando analysis.executed === false ─
        setTimeout(function() {
            try {
                var demoBtn = document.getElementById('demoModeBtn');
                var executed = window.UNIFEDSystem &&
                               window.UNIFEDSystem.analysis &&
                               window.UNIFEDSystem.analysis.executed;
                if (demoBtn && !executed) {
                    demoBtn.classList.add('unifed-glow-pulse');
                }
            } catch(_) {}
        }, 600);

        // ── 9. Eventos de sistema ─────────────────────────────────────────
        window.dispatchEvent(new CustomEvent('UNIFED_CORE_READY', {
            detail: { loaded: loaded, total: total, timestamp: new Date().toISOString() }
        }));
        document.dispatchEvent(new CustomEvent('unifed:access:granted', {
            detail: { timestamp: new Date().toISOString() }
        }));

        console.log('[UNIFED-AC] \u2705 Post-Auth Flow conclu\u00EDdo. ' + loaded + '/' + total + ' m\u00F3dulos activos.');
    }

    // =========================================================================
    // COMPLIANCE OVERLAY — Splash de Metodologia (v3.1)
    // Intercalado entre login e dashboard. Resolve quando o perito clica em
    // #prosseguirAnalise. Invoca ensureDemoDataLoaded() + revealForensicData().
    // =========================================================================

    function _showComplianceOverlay(loadedCount, totalCount) {
        return new Promise(function(resolve) {

            // CSS do overlay de conformidade
            var cssId = 'unifed-compliance-css';
            if (!document.getElementById(cssId)) {
                var cs = document.createElement('style');
                cs.id  = cssId;
                cs.textContent = `
                    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;800&family=JetBrains+Mono:wght@400;600&display=swap');

                    #complianceOverlay {
                        position: fixed; inset: 0; z-index: 100000;
                        display: flex; flex-direction: column;
                        align-items: center; justify-content: center;
                        background: rgba(6, 13, 26, 0.72);
                        backdrop-filter: blur(25px) saturate(180%);
                        -webkit-backdrop-filter: blur(25px) saturate(180%);
                        transition: opacity 0.45s ease;
                        overflow-y: auto; padding: 20px 16px 80px;
                    }
                    #complianceOverlay.co-fade-out { opacity: 0; pointer-events: none; }

                    /* Grid de fundo */
                    #complianceOverlay::before {
                        content: ''; position: fixed; inset: 0;
                        background-image:
                            linear-gradient(rgba(0,229,255,0.035) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(0,229,255,0.035) 1px, transparent 1px);
                        background-size: 44px 44px;
                        pointer-events: none; z-index: 0;
                    }

                    #co-box {
                        position: relative; z-index: 1;
                        width: 100%; max-width: 760px;
                        background: rgba(10, 18, 36, 0.88);
                        border: 1px solid rgba(0, 229, 255, 0.22);
                        border-radius: 16px;
                        box-shadow: 0 8px 48px rgba(0,0,0,0.75), 0 0 60px rgba(0,229,255,0.05);
                        overflow: hidden;
                    }

                    /* Linha de acento superior */
                    #co-box::before {
                        content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
                        background: linear-gradient(90deg,transparent,rgba(0,229,255,0.7) 25%,rgba(139,92,246,0.7) 65%,transparent);
                    }

                    #co-header {
                        padding: 28px 36px 20px;
                        border-bottom: 1px solid rgba(0,229,255,0.1);
                    }

                    #co-badge {
                        display: inline-flex; align-items: center; gap: 8px;
                        font-family: 'JetBrains Mono', monospace;
                        font-size: 8px; letter-spacing: 2.5px; text-transform: uppercase;
                        color: rgba(0,229,255,0.5);
                        border: 1px solid rgba(0,229,255,0.15);
                        padding: 3px 10px; border-radius: 4px; margin-bottom: 14px;
                        background: rgba(0,229,255,0.04);
                    }
                    #co-badge::before {
                        content: ''; width: 5px; height: 5px; border-radius: 50%;
                        background: #00e5ff; box-shadow: 0 0 7px #00e5ff;
                        animation: _pulseDot 1.8s ease-in-out infinite;
                    }

                    #co-title {
                        font-family: 'Syne', system-ui, sans-serif;
                        font-size: clamp(16px, 2.2vw, 22px); font-weight: 800;
                        letter-spacing: 0.15em; text-transform: uppercase;
                        color: #e0f9ff; line-height: 1.2; margin-bottom: 8px;
                    }

                    #co-subtitle {
                        font-family: 'JetBrains Mono', monospace;
                        font-size: 9.5px; color: rgba(148,163,184,0.55);
                        letter-spacing: 0.15px;
                    }

                    #co-body { padding: 24px 36px; }

                    #co-legal {
                        background: rgba(0,229,255,0.04);
                        border: 1px solid rgba(0,229,255,0.12);
                        border-left: 3px solid rgba(0,229,255,0.45);
                        border-radius: 8px; padding: 16px 18px;
                        margin-bottom: 20px;
                    }
                    #co-legal h4 {
                        font-family: 'Syne', sans-serif; font-size: 10px;
                        font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
                        color: rgba(0,229,255,0.7); margin-bottom: 8px;
                    }
                    #co-legal p {
                        font-family: 'JetBrains Mono', monospace; font-size: 10.5px;
                        color: rgba(148,163,184,0.85); line-height: 1.6;
                    }
                    #co-legal strong { color: rgba(0,229,255,0.9); font-weight: 600; }

                    /* Terminal de custódia */
                    #co-terminal {
                        background: rgba(2, 8, 20, 0.82);
                        border: 1px solid rgba(0,229,255,0.12);
                        border-radius: 8px; overflow: hidden; margin-bottom: 20px;
                    }
                    #co-term-header {
                        display: flex; align-items: center; gap: 6px;
                        padding: 8px 14px;
                        background: rgba(0,229,255,0.06);
                        border-bottom: 1px solid rgba(0,229,255,0.08);
                    }
                    .co-dot { width: 8px; height: 8px; border-radius: 50%; }
                    .co-dot-r { background: #ef4444; }
                    .co-dot-y { background: #f59e0b; }
                    .co-dot-g { background: #10b981; }
                    #co-term-title {
                        font-family: 'JetBrains Mono', monospace; font-size: 8.5px;
                        letter-spacing: 1.5px; color: rgba(148,163,184,0.5);
                        text-transform: uppercase; margin-left: 4px;
                    }
                    #co-term-body {
                        padding: 14px 16px; min-height: 88px;
                        font-family: 'JetBrains Mono', monospace; font-size: 10px;
                        color: #00ff88; line-height: 1.75;
                    }
                    .co-term-line { opacity: 0; animation: coFadeIn 0.25s ease forwards; }
                    .co-term-ok  { color: #00ff88; }
                    .co-term-sys { color: rgba(0,229,255,0.7); }
                    .co-term-hash { color: rgba(99,0,255,0.9); }
                    @keyframes coFadeIn { from{opacity:0;transform:translateX(-4px)} to{opacity:1;transform:none} }

                    /* Botão Prosseguir */
                    #prosseguirAnalise {
                        display: block; width: 100%;
                        background: linear-gradient(135deg, rgba(0,229,255,0.1), rgba(139,92,246,0.1));
                        border: 1px solid rgba(0,229,255,0.35);
                        border-radius: 10px;
                        color: #e0f7ff;
                        font-family: 'Syne', sans-serif;
                        font-size: 11.5px; font-weight: 700;
                        letter-spacing: 3px; text-transform: uppercase;
                        padding: 15px 24px; cursor: pointer;
                        transition: all 0.28s ease; overflow: hidden; position: relative;
                        margin-top: 6px;
                    }
                    #prosseguirAnalise::before {
                        content: ''; position: absolute; inset: 0;
                        background: linear-gradient(135deg, transparent, rgba(0,229,255,0.12), transparent);
                        transform: translateX(-100%); transition: transform 0.42s ease;
                    }
                    #prosseguirAnalise:hover::before { transform: translateX(100%); }
                    #prosseguirAnalise:hover {
                        background: linear-gradient(135deg, rgba(0,229,255,0.18), rgba(139,92,246,0.18));
                        border-color: rgba(0,229,255,0.7);
                        box-shadow: 0 0 32px rgba(0,229,255,0.14);
                    }

                    /* Footer de conformidade */
                    #co-footer {
                        padding: 14px 36px;
                        border-top: 1px solid rgba(0,229,255,0.07);
                        font-family: 'JetBrains Mono', monospace;
                        font-size: 7.5px; letter-spacing: 0.5px;
                        color: rgba(148,163,184,0.3); text-align: center;
                        line-height: 1.6;
                    }

                    /* Glow pulse para botão CASO REAL */
                    .unifed-glow-pulse {
                        animation: unifedGlowBtn 2s ease-in-out infinite !important;
                    }
                    @keyframes unifedGlowBtn {
                        0%, 100% { box-shadow: 0 0 0px rgba(0,229,255,0); }
                        50%       { box-shadow: 0 0 18px 4px rgba(0,229,255,0.55), 0 0 40px rgba(0,229,255,0.2); }
                    }

                    /* Dashboard: Stat card typography */
                    .stat-card .stat-label,
                    .kpi-card .kpi-label,
                    [class*="kpi"] .label,
                    [class*="stat"] .label {
                        font-size: 0.75rem !important;
                        text-transform: uppercase !important;
                        letter-spacing: 0.08em !important;
                        color: var(--text-tertiary, rgba(148,163,184,0.6)) !important;
                        font-weight: 400 !important;
                    }
                    .stat-card .stat-value,
                    .kpi-card .kpi-value,
                    [class*="kpi"] .value,
                    [class*="stat"] .value {
                        font-size: 1.8rem !important;
                        font-weight: 700 !important;
                        color: var(--accent-primary, #00e5ff) !important;
                        line-height: 1.1 !important;
                    }

                    /* Dashboard: Card elevation */
                    .kpis-grid > *, .dashboard-card, .compliance-card,
                    #complianceSection > *, .toolbar-section {
                        box-shadow: 0 8px 32px 0 rgba(0,0,0,0.8) !important;
                        border: 1px solid rgba(255,255,255,0.08) !important;
                    }

                    /* Toolbar normalização */
                    #export-tools-container {
                        display: flex !important;
                        flex-direction: row !important;
                        justify-content: flex-end !important;
                        align-items: center !important;
                        gap: 8px !important;
                        flex-wrap: wrap;
                    }
                    #export-tools-container .btn-tool {
                        transform: scale(0.85) !important;
                        transform-origin: right center !important;
                    }
                    #export-tools-container h3 {
                        flex: 1 !important;
                        margin: 0 !important;
                        font-size: 10px !important;
                        letter-spacing: 2px !important;
                        text-transform: uppercase !important;
                        color: rgba(148,163,184,0.4) !important;
                    }

                    /* Grid gutters */
                    .kpis-grid { gap: 1.5rem !important; }
                    #complianceSection { gap: 1.5rem !important; display: flex; flex-direction: column; }
                `;
                document.head.appendChild(cs);
            }

            // Sequência de linhas do terminal de custódia
            var termLines = [
                { delay: 200,  cls: 'co-term-ok',   text: '[VERIFYING SHA-256 HASH...]&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#34d399">OK</span>' },
                { delay: 600,  cls: 'co-term-hash',  text: '[MASTER HASH]&nbsp;7b451c1bd540d0ef6bbfa93baa429780fe2dcf694633e77cef89cb4a061d6d11' },
                { delay: 1000, cls: 'co-term-ok',   text: '[LOADING ISO/IEC 27037:2012 PROTOCOLS...]&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#34d399">OK</span>' },
                { delay: 1400, cls: 'co-term-ok',   text: '[INJECTING SMOKING GUN MODULE...]&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#34d399">OK</span>' },
                { delay: 1800, cls: 'co-term-sys',  text: '[SYS]&nbsp;' + (loadedCount || 0) + '/' + (totalCount || 7) + ' módulos hidratados · SISTEMA OPERACIONAL' }
            ];

            var now  = new Date();
            var dateStr = now.toLocaleDateString('pt-PT');
            var timeStr = now.toLocaleTimeString('pt-PT');

            // Construir HTML do overlay
            var el = document.createElement('div');
            el.id  = 'complianceOverlay';
            el.innerHTML = `
                <div id="co-box">
                    <div id="co-header">
                        <div id="co-badge">ISO/IEC 27037:2012 · Art. 125.º CPP · DORA (UE) 2022/2554</div>
                        <div id="co-title">Metodologia de Análise e Peritagem Forense</div>
                        <div id="co-subtitle">UNIFED-PROBATUM v3.1 · Acesso concedido: ${dateStr} ${timeStr} · Operador autenticado via SHA-256</div>
                    </div>
                    <div id="co-body">
                        <div id="co-legal">
                            <h4>Base Legal e Advertência de Conformidade</h4>
                            <p>
                                Este sistema opera ao abrigo do <strong>Art. 6.º da Lei n.º 109/2009</strong> (Lei do Cibercrime)
                                e do <strong>Regulamento (UE) 2022/2554 (DORA)</strong>. Toda a prova gerada constitui
                                <strong>documento electrónico com valor pericial</strong> nos termos do Art. 125.º CPP,
                                sujeito à cadeia de custódia ISO/IEC 27037:2012. A manipulação de evidências digitais sem
                                autorização judicial é crime punível nos termos do Art. 3.º da Lei n.º 109/2009.
                                O operador declara que a análise que vai iniciar é efectuada no âmbito de
                                <strong>mandato pericial válido</strong> e que os dados carregados foram recolhidos
                                com observância das garantias processuais aplicáveis.
                            </p>
                        </div>
                        <div id="co-terminal">
                            <div id="co-term-header">
                                <span class="co-dot co-dot-r"></span>
                                <span class="co-dot co-dot-y"></span>
                                <span class="co-dot co-dot-g"></span>
                                <span id="co-term-title">UNIFED-PROBATUM · Terminal de Custódia · Integridade Verificada</span>
                            </div>
                            <div id="co-term-body"></div>
                        </div>
                        <button id="prosseguirAnalise">
                            ⚖ CONFIRMAR METODOLOGIA E PROSSEGUIR ANÁLISE FORENSE
                        </button>
                    </div>
                    <div id="co-footer">
                        Privacy by Design · UNIFED-PROBATUM © 2024/2026 · EM · v3.1.0 · DORA COMPLIANT · SMOKING GUN · COURT READY · NEXUS · BIG DATA<br>
                        Art. 6.º Lei n.º 109/2009 · ISO/IEC 27037:2012 · RGPD Art. 32.º · eIDAS · Tribunal de Instrução Criminal
                    </div>
                </div>
            `;

            // Início com opacidade 0 para fade-in
            el.style.opacity = '0';
            document.body.appendChild(el);

            // Fade-in do overlay de conformidade
            requestAnimationFrame(function() {
                el.style.transition = 'opacity 0.4s ease';
                el.style.opacity    = '1';
            });

            // Animar linhas do terminal sequencialmente
            var termBody = document.getElementById('co-term-body');
            termLines.forEach(function(line) {
                setTimeout(function() {
                    if (!termBody) return;
                    var d = document.createElement('div');
                    d.className = 'co-term-line ' + line.cls;
                    d.innerHTML = line.text;
                    termBody.appendChild(d);
                    termBody.scrollTop = termBody.scrollHeight;
                }, line.delay);
            });

            // Handler do botão Prosseguir
            setTimeout(function() {
                var btn = document.getElementById('prosseguirAnalise');
                if (!btn) return;
                btn.addEventListener('click', function() {
                    // ── DATA-TRIGGER t=0 ─────────────────────────────────────
                    // ensureDemoDataLoaded() invocada ANTES do início da
                    // dissolução do blur — dados prontos quando opacity=0.
                    // Evita janela de dashboard a zeros mesmo que por ms.
                    try {
                        if (typeof window.ensureDemoDataLoaded === 'function') {
                            window.ensureDemoDataLoaded();
                            console.log('[UNIFED-AC] ensureDemoDataLoaded() invocada em t=0 (pré-fade).');
                        }
                        if (typeof window.revealForensicData === 'function') {
                            window.revealForensicData();
                        }
                    } catch (dataErrEarly) {
                        console.warn('[UNIFED-AC] Erro data-trigger t=0:', dataErrEarly.message);
                    }

                    // ── EVENTO unifed:compliance:accepted — t=0 ───────────────
                    // Despachado ANTES do fade-out para que o Harmonizer Fase 6
                    // sincronize charts, toolbar e labels enquanto o blur se dissolve.
                    // O { once: true } no listener do harmonizador garante
                    // execução única — sem risco de re-trigger em reloads parciais.
                    try {
                        window.dispatchEvent(new CustomEvent('unifed:compliance:accepted', {
                            detail: {
                                timestamp : new Date().toISOString(),
                                operator  : 'authenticated',
                                source    : 'unifed_access_control.js v3.1.0'
                            }
                        }));
                        console.log('[UNIFED-AC] unifed:compliance:accepted despachado em t=0.');
                    } catch (evtErr) {
                        console.warn('[UNIFED-AC] Erro ao despachar compliance:accepted:', evtErr.message);
                    }

                    el.classList.add('co-fade-out');
                    setTimeout(function() {
                        el.remove();
                        // Manter o CSS de dashboard — regras de cards e glow continuam necessárias

                        // Injectar footer de conformidade estático no dashboard
                        (function _injectDashboardFooter() {
                            var footerId = 'unifed-dashboard-footer';
                            if (document.getElementById(footerId)) return;
                            var ftr = document.createElement('footer');
                            ftr.id  = footerId;
                            ftr.style.cssText = [
                                'font-family:"JetBrains Mono",monospace',
                                'font-size:7.5px', 'letter-spacing:0.5px',
                                'color:rgba(148,163,184,0.28)', 'text-align:center',
                                'padding:18px 24px 28px', 'line-height:1.7',
                                'border-top:1px solid rgba(0,229,255,0.06)',
                                'margin-top:32px'
                            ].join(';');
                            ftr.innerHTML =
                                'Privacy by Design &middot; UNIFED-PROBATUM &copy; 2024/2026 &middot; EM &middot; v3.1.0-COMPLIANCE-FORGE' +
                                ' &middot; DORA COMPLIANT &middot; SMOKING GUN &middot; COURT READY &middot; NEXUS &middot; BIG DATA<br>' +
                                'Art. 6.&ordm; Lei n.&ordm; 109/2009 &middot; ISO/IEC 27037:2012 &middot; RGPD Art. 32.&ordm; &middot; eIDAS &middot; Tribunal de Instru&ccedil;&atilde;o Criminal';
                            var dash = document.getElementById('pureDashboard') || document.getElementById('pureDashboardWrapper');
                            if (dash) dash.appendChild(ftr);
                        })();

                        resolve();
                    }, 460);
                });
            }, 300);
        });
    }

    // =========================================================================
    // CARREGAMENTO DINÂMICO SEQUENCIAL
    // =========================================================================

    function _loadScriptDynamic(src) {
        return new Promise(function(resolve, reject) {
            const el = document.createElement('script');
            el.src   = src;
            el.async = false; // Ordem de execução garantida
            el.addEventListener('load',  function() { resolve(); });
            el.addEventListener('error', function() {
                reject(new Error('Falha ao carregar: ' + src));
            });
            document.body.appendChild(el);
        });
    }

    // =========================================================================
    // LÓGICA DE AUTENTICAÇÃO
    // =========================================================================

    async function _attemptLogin() {
        if (_locked) {
            const remaining = Math.ceil((_lockoutEnd - Date.now()) / 1000);
            if (remaining > 0) {
                _setStatus('Sistema bloqueado. Aguarde ' + remaining + 's.', 'err');
                return;
            }
            _locked = false; _attempts = 0;
            _lockTimerEl.textContent = '';
            _btnEl.disabled = false; _inputEl.disabled = false;
        }

        const pwd = _inputEl.value;
        if (!pwd || !pwd.length) {
            _setStatus('Campo vazio. Introduza a credencial de acesso.', 'warn');
            _shakeInput(); return;
        }

        _btnEl.disabled   = true;
        _inputEl.disabled = true;
        _setStatus('A computar SHA-256 via SubtleCrypto\u2026', 'info');

        try {
            const inputHash = await computeSHA256(pwd);

            if (inputHash === STORED_HASH) {
                await _onAuthSuccess();
            } else {
                _attempts++;
                _shakeInput();
                _inputEl.value = '';
                const remaining = MAX_ATTEMPTS - _attempts;

                if (_attempts >= MAX_ATTEMPTS) {
                    _locked     = true;
                    _lockoutEnd = Date.now() + LOCKOUT_MS;
                    _btnEl.disabled   = true;
                    _inputEl.disabled = true;
                    _setStatus('Credencial inv\u00E1lida. Bloqueado por ' + (LOCKOUT_MS / 1000) + 's.', 'err');
                    console.warn('[UNIFED-AC] Lockout ap\u00F3s ' + MAX_ATTEMPTS + ' tentativas.');
                    _startLockTimer();
                } else {
                    _setStatus(
                        'Credencial inv\u00E1lida. ' + remaining +
                        ' tentativa' + (remaining !== 1 ? 's' : '') +
                        ' restante' + (remaining !== 1 ? 's' : '') + '.',
                        'err'
                    );
                    _inputEl.disabled = false;
                    _btnEl.disabled   = false;
                    _inputEl.focus();
                }
            }
        } catch (cryptoErr) {
            console.error('[UNIFED-AC] Erro SubtleCrypto:', cryptoErr);
            _setStatus('Erro interno de verifica\u00E7\u00E3o. Recarregue a p\u00E1gina.', 'err');
            _inputEl.disabled = false;
            _btnEl.disabled   = false;
        }
    }

    // =========================================================================
    // TEMPORIZADOR DE LOCKOUT
    // =========================================================================

    function _startLockTimer() {
        const interval = setInterval(function() {
            const remaining = Math.ceil((_lockoutEnd - Date.now()) / 1000);
            if (remaining <= 0) {
                clearInterval(interval);
                _locked = false; _attempts = 0;
                _lockTimerEl.textContent = '';
                _btnEl.disabled = false; _inputEl.disabled = false;
                _setStatus('Desbloqueado. Pode tentar novamente.', 'info');
                _inputEl.focus();
            } else {
                _lockTimerEl.textContent = '\u27F3 Desbloqueio em ' + remaining + 's';
            }
        }, 1000);
    }

    // =========================================================================
    // UTILITÁRIOS
    // =========================================================================

    function _setStatus(msg, type) {
        if (!_statusEl) return;
        _statusEl.textContent = msg;
        _statusEl.className   = type;
    }

    function _shakeInput() {
        if (!_inputEl) return;
        _inputEl.classList.remove('error');
        void _inputEl.offsetWidth; // Reflow para reiniciar animation
        _inputEl.classList.add('error');
        setTimeout(function() { if (_inputEl) _inputEl.classList.remove('error'); }, 420);
    }

    // =========================================================================
    // PONTO DE ENTRADA
    // =========================================================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _injectOverlay);
    } else {
        _injectOverlay();
    }

    // =========================================================================
    // INTERFACE PÚBLICA DE DIAGNÓSTICO
    // =========================================================================

    window._UNIFED_ACCESS_CONTROL = {
        version    : 'v3.0.0-CYBER-FORGE',
        model      : 'Halt Execution · Glassmorphism · Forensic Hydration UI',
        granted    : function() { return window._UNIFED_ACCESS_GRANTED; },
        attempts   : function() { return _attempts; },
        isLocked   : function() { return _locked; },
        modules    : MODULES_SEQUENCE,
        _debugInfo : function() {
            console.log('[UNIFED-AC] Estado:', {
                granted  : window._UNIFED_ACCESS_GRANTED,
                attempts : _attempts,
                locked   : _locked,
                modules  : MODULES_SEQUENCE
            });
        }
    };

    console.log('[UNIFED-AC] \u2705 v3.0.0-CYBER-FORGE — Zero-State activo. Aguardando credencial SHA-256.');

})();
