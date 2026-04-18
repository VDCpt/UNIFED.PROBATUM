/**
 * ============================================================================
 * UNIFED - PROBATUM · FASE II — FICHEIRO 4/5
 * unifed_toolbar_buttons.js
 * ============================================================================
 * Versão      : v1.0.0-TOOLBAR-FIX
 * Data        : 2026-04-18
 * Perito      : Consultor Estratégico Independente
 * Finalidade  : Garantir funcionalidade de botões da toolbar
 *
 * BOTÕES CORRIGIDOS:
 *   ✓ PARECER TÉCNICO (btnPDF) → Exportar PDF
 *   ✓ EXPORTAR JSON (exportJSONBtn) → Exportar JSON
 *   ✓ REINICIAR (resetBtn/btnRestart) → Reset do sistema
 *   ✓ LIMPAR CONSOLE (clearConsoleBtn) → Limpar logs
 *   ✓ EN/PT (langToggleBtn) → Alternar idioma
 *   ✓ QR CODE → Verificar cadeia de custódia
 *
 * CONFORMIDADE: CSS Flexbox · Acessibilidade · WCAG 2.1 AA
 * ============================================================================
 */

'use strict';

(function _toolbarButtonsFix() {
    console.log('[UNIFED-TOOLBAR] 🔧 Iniciando configuração de botões da toolbar...');

    // ========================================================================
    // SECÇÃO 1: INJEÇÃO DE CSS PARA ALINHAMENTO
    // ========================================================================

    /**
     * injectToolbarCSS() — Injetar estilos CSS para largura total dos botões
     */
    function injectToolbarCSS() {
        const STYLE_ID = 'unifed-toolbar-css-fix';
        
        // Verificar se já está injetado
        if (document.getElementById(STYLE_ID)) {
            console.log('[UNIFED-TOOLBAR] CSS já injetado. Ignorando re-injeção.');
            return;
        }

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            /* ================================================================ */
            /* UNIFED TOOLBAR — CSS FIXES FASE II                             */
            /* ================================================================ */

            /* Container de ferramentas: flex, largura 100% */
            #export-tools-container {
                display: flex !important;
                flex-direction: column !important;
                gap: 10px !important;
                width: 100% !important;
                margin: 15px 0 !important;
                padding: 15px !important;
                background: rgba(0, 229, 255, 0.05) !important;
                border: 1px solid var(--accent-primary) !important;
                border-radius: 8px !important;
            }

            /* Botões individuais: largura total, altura uniforme */
            #export-tools-container .export-btn,
            #export-tools-container button {
                width: 100% !important;
                min-height: 44px !important;
                height: auto !important;
                padding: 12px 16px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 8px !important;
                font-size: 0.95rem !important;
                font-weight: 600 !important;
                border: 1px solid var(--border-color) !important;
                border-radius: 6px !important;
                cursor: pointer !important;
                transition: all 0.3s ease !important;
                text-transform: uppercase !important;
                letter-spacing: 0.5px !important;
            }

            /* Estado padrão */
            #export-tools-container button {
                background: linear-gradient(135deg, rgba(0, 229, 255, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%) !important;
                color: var(--accent-primary) !important;
                border-color: var(--accent-primary) !important;
            }

            /* Hover */
            #export-tools-container button:hover:not(:disabled) {
                background: linear-gradient(135deg, rgba(0, 229, 255, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%) !important;
                box-shadow: 0 0 15px rgba(0, 229, 255, 0.3) !important;
                transform: translateY(-2px) !important;
            }

            /* Active/Pressed */
            #export-tools-container button:active:not(:disabled) {
                transform: translateY(0px) !important;
            }

            /* Disabled state */
            #export-tools-container button:disabled {
                opacity: 0.5 !important;
                cursor: not-allowed !important;
                background: rgba(128, 128, 128, 0.1) !important;
                color: var(--text-secondary) !important;
                border-color: var(--border-color) !important;
            }

            /* Ícones dentro dos botões */
            #export-tools-container button i {
                font-size: 1.1em !important;
            }

            /* Botões específicos com cores temáticas */
            #exportPDFBtn {
                background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%) !important;
                color: #ef4444 !important;
                border-color: #ef4444 !important;
            }

            #exportPDFBtn:hover:not(:disabled) {
                background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.2) 100%) !important;
                box-shadow: 0 0 15px rgba(239, 68, 68, 0.3) !important;
            }

            #exportJSONBtn {
                background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.1) 100%) !important;
                color: #22c55e !important;
                border-color: #22c55e !important;
            }

            #exportJSONBtn:hover:not(:disabled) {
                background: linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.2) 100%) !important;
                box-shadow: 0 0 15px rgba(34, 197, 94, 0.3) !important;
            }

            #resetBtn, #btnRestart {
                background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(109, 40, 217, 0.1) 100%) !important;
                color: #8b5cf6 !important;
                border-color: #8b5cf6 !important;
            }

            #resetBtn:hover:not(:disabled), #btnRestart:hover:not(:disabled) {
                background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(109, 40, 217, 0.2) 100%) !important;
                box-shadow: 0 0 15px rgba(139, 92, 246, 0.3) !important;
            }

            #clearConsoleBtn {
                background: linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%) !important;
                color: #f59e0b !important;
                border-color: #f59e0b !important;
            }

            #clearConsoleBtn:hover:not(:disabled) {
                background: linear-gradient(135deg, rgba(249, 115, 22, 0.2) 0%, rgba(217, 119, 6, 0.2) 100%) !important;
                box-shadow: 0 0 15px rgba(249, 115, 22, 0.3) !important;
            }

            /* ================================================================ */
            /* FIX PARA HEADER BUTTONS (langToggleBtn, etc)                    */
            /* ================================================================ */

            .btn-lang-toggle,
            .btn-tool {
                min-width: 44px !important;
                min-height: 44px !important;
                padding: 8px 12px !important;
                border-radius: 6px !important;
                transition: all 0.3s ease !important;
                cursor: pointer !important;
            }

            .btn-lang-toggle:hover,
            .btn-tool:hover {
                background: rgba(0, 229, 255, 0.2) !important;
                transform: scale(1.05) !important;
            }

            /* ================================================================ */
            /* RESPONSIVE: Small screens                                       */
            /* ================================================================ */

            @media (max-width: 768px) {
                #export-tools-container {
                    padding: 10px !important;
                    gap: 8px !important;
                }

                #export-tools-container button {
                    min-height: 40px !important;
                    font-size: 0.9rem !important;
                    padding: 10px 12px !important;
                }
            }
        `;

        const target = document.head || document.documentElement;
        target.appendChild(style);
        console.log('[UNIFED-TOOLBAR] ✓ CSS injetado com sucesso');
    }

    // ========================================================================
    // SECÇÃO 2: SETUP DOS BOTÕES COM EVENT LISTENERS
    // ========================================================================

    /**
     * setupExportPDFButton() — Botão PARECER TÉCNICO
     */
    function setupExportPDFButton() {
        const btn = document.getElementById('exportPDFBtn') || document.getElementById('btnPDF');
        if (!btn || btn.getAttribute('data-phase2-setup')) return;

        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log('[UNIFED-TOOLBAR] Botão EXPORTAR PDF clicado');
            
            if (typeof window.exportPDF === 'function') {
                try {
                    await window.exportPDF();
                    console.log('[UNIFED-TOOLBAR] ✓ Exportação PDF concluída');
                } catch (err) {
                    console.error('[UNIFED-TOOLBAR] ❌ Erro ao exportar PDF:', err.message);
                    if (typeof window.showToast === 'function') {
                        window.showToast('Erro ao gerar PDF. Verifique a consola.', 'error');
                    }
                }
            } else {
                console.warn('[UNIFED-TOOLBAR] ⚠ exportPDF não disponível');
                if (typeof window.showToast === 'function') {
                    const lang = window.currentLang || 'pt';
                    window.showToast(
                        lang === 'pt' ? 'Função de exportação não disponível.' : 'Export function not available.',
                        'warning'
                    );
                }
            }
        });
        
        btn.setAttribute('data-phase2-setup', 'true');
        console.log('[UNIFED-TOOLBAR] ✓ Botão EXPORTAR PDF configurado');
    }

    /**
     * setupExportJSONButton() — Botão EXPORTAR JSON
     */
    function setupExportJSONButton() {
        const btn = document.getElementById('exportJSONBtn');
        if (!btn || btn.getAttribute('data-phase2-setup')) return;

        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log('[UNIFED-TOOLBAR] Botão EXPORTAR JSON clicado');
            
            if (typeof window.exportDataJSON === 'function') {
                try {
                    await window.exportDataJSON();
                    console.log('[UNIFED-TOOLBAR] ✓ Exportação JSON concluída');
                } catch (err) {
                    console.error('[UNIFED-TOOLBAR] ❌ Erro ao exportar JSON:', err.message);
                    if (typeof window.showToast === 'function') {
                        window.showToast('Erro ao gerar JSON. Verifique a consola.', 'error');
                    }
                }
            } else {
                console.warn('[UNIFED-TOOLBAR] ⚠ exportDataJSON não disponível');
                if (typeof window.showToast === 'function') {
                    const lang = window.currentLang || 'pt';
                    window.showToast(
                        lang === 'pt' ? 'Função de exportação não disponível.' : 'Export function not available.',
                        'warning'
                    );
                }
            }
        });
        
        btn.setAttribute('data-phase2-setup', 'true');
        console.log('[UNIFED-TOOLBAR] ✓ Botão EXPORTAR JSON configurado');
    }

    /**
     * setupResetButton() — Botão REINICIAR
     */
    function setupResetButton() {
        const btn = document.getElementById('resetBtn') || document.getElementById('btnRestart');
        if (!btn || btn.getAttribute('data-phase2-setup')) return;

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('[UNIFED-TOOLBAR] Botão REINICIAR clicado');
            
            const lang = window.currentLang || 'pt';
            const confirmMsg = lang === 'pt' 
                ? 'Reiniciar o sistema irá apagar todas as evidências e análises. Continuar?' 
                : 'Resetting the system will delete all evidence and analysis. Continue?';
            
            if (confirm(confirmMsg)) {
                if (typeof window.resetUIVisual === 'function') {
                    window.resetUIVisual();
                    console.log('[UNIFED-TOOLBAR] ✓ Sistema reiniciado');
                    if (typeof window.showToast === 'function') {
                        window.showToast(
                            lang === 'pt' ? 'Sistema reiniciado com sucesso.' : 'System reset successfully.',
                            'success'
                        );
                    }
                } else {
                    console.warn('[UNIFED-TOOLBAR] ⚠ resetUIVisual não disponível');
                }
            }
        });
        
        btn.setAttribute('data-phase2-setup', 'true');
        console.log('[UNIFED-TOOLBAR] ✓ Botão REINICIAR configurado');
    }

    /**
     * setupClearConsoleButton() — Botão LIMPAR CONSOLE
     */
    function setupClearConsoleButton() {
        const btn = document.getElementById('clearConsoleBtn');
        if (!btn || btn.getAttribute('data-phase2-setup')) return;

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('[UNIFED-TOOLBAR] Botão LIMPAR CONSOLE clicado');
            
            const consoleOutput = document.getElementById('consoleOutput');
            if (consoleOutput) {
                consoleOutput.innerHTML = '';
                console.log('[UNIFED-TOOLBAR] ✓ Console limpo');
                if (typeof window.showToast === 'function') {
                    const lang = window.currentLang || 'pt';
                    window.showToast(
                        lang === 'pt' ? 'Console limpo.' : 'Console cleared.',
                        'success'
                    );
                }
            }
        });
        
        btn.setAttribute('data-phase2-setup', 'true');
        console.log('[UNIFED-TOOLBAR] ✓ Botão LIMPAR CONSOLE configurado');
    }

    /**
     * setupLanguageToggleButton() — Botão EN/PT
     */
    function setupLanguageToggleButton() {
        const btn = document.getElementById('langToggleBtn');
        if (!btn || btn.getAttribute('data-phase2-setup')) return;

        // Remover onclick inline se existir
        btn.removeAttribute('onclick');
        
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('[UNIFED-TOOLBAR] Botão ALTERNAR IDIOMA clicado');
            
            if (typeof window.switchLanguage === 'function') {
                window.switchLanguage();
                console.log('[UNIFED-TOOLBAR] ✓ Idioma alterado');
            } else {
                console.warn('[UNIFED-TOOLBAR] ⚠ switchLanguage não disponível');
            }
        });
        
        btn.setAttribute('data-phase2-setup', 'true');
        console.log('[UNIFED-TOOLBAR] ✓ Botão ALTERNAR IDIOMA configurado');
    }

    /**
     * setupCustodyChainButton() — Botão CADEIA DE CUSTÓDIA / QR CODE
     */
    function setupCustodyChainButton() {
        const btn = document.getElementById('custodyChainTriggerBtn');
        if (!btn || btn.getAttribute('data-phase2-setup')) return;

        // Remover onclick inline se existir
        btn.removeAttribute('onclick');
        
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('[UNIFED-TOOLBAR] Botão CADEIA DE CUSTÓDIA clicado');
            
            if (typeof window.openCustodyChainModal === 'function') {
                window.openCustodyChainModal();
                console.log('[UNIFED-TOOLBAR] ✓ Modal de custódia aberto');
            } else {
                console.warn('[UNIFED-TOOLBAR] ⚠ openCustodyChainModal não disponível');
            }
        });
        
        btn.setAttribute('data-phase2-setup', 'true');
        console.log('[UNIFED-TOOLBAR] ✓ Botão CADEIA DE CUSTÓDIA configurado');
    }

    // ========================================================================
    // SECÇÃO 3: INICIALIZAÇÃO CENTRAL
    // ========================================================================

    /**
     * setupAllToolbarButtons() — Configurar todos os botões
     */
    window.setupAllToolbarButtons = function setupAllToolbarButtons() {
        console.log('[UNIFED-TOOLBAR] setupAllToolbarButtons() invocada');
        
        injectToolbarCSS();
        setupExportPDFButton();
        setupExportJSONButton();
        setupResetButton();
        setupClearConsoleButton();
        setupLanguageToggleButton();
        setupCustodyChainButton();
        
        console.log('[UNIFED-TOOLBAR] ✓ Todos os botões configurados');
    };

    // ========================================================================
    // INICIALIZAÇÃO AUTOMÁTICA
    // ========================================================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.setupAllToolbarButtons();
            console.log('[UNIFED-TOOLBAR] ✓ Botões configurados (DOMContentLoaded)');
        });
    } else {
        window.setupAllToolbarButtons();
        console.log('[UNIFED-TOOLBAR] ✓ Botões configurados (imediato)');
    }

    // Reconfigurar após reset
    const originalResetUIVisual = window.resetUIVisual;
    window.resetUIVisual = function resetUIVisual_Enhanced() {
        if (typeof originalResetUIVisual === 'function') {
            originalResetUIVisual.call(window);
        }
        // Reconfigurar botões após reset
        setTimeout(() => {
            window.setupAllToolbarButtons();
            console.log('[UNIFED-TOOLBAR] ✓ Botões reconfigurados após reset');
        }, 500);
    };

    // ========================================================================
    // RESUMO FINAL
    // ========================================================================

    console.log('[UNIFED-TOOLBAR] ✅ FICHEIRO 4/5 CARREGADO');
    console.log('[UNIFED-TOOLBAR] Vulnerabilidade corrigida: VUL-006');
    console.log('[UNIFED-TOOLBAR] Botões configurados: PDF, JSON, RESET, CONSOLE, LANG, CUSTODY');
    
    window.phase2_toolbar = true;
})();
