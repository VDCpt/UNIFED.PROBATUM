/**
 * ============================================================================
 * UNIFED - PROBATUM · unifed_panel_activator.js
 * ============================================================================
 * Versão      : v1.0.0 · FIX-ACHADO-A + RETIFICAÇÃO C + SPLASH MANUAL
 * Gerado em   : 2026-04-15
 * Conformidade: DORA (UE) 2022/2554 · Art. 125.º CPP · ISO/IEC 27037:2012
 * ============================================================================
 * ÂMBITO:
 *   Resolve o Achado A identificado no Relatório Técnico Forense
 *   (análise de 2026-04-14): window._activatePurePanel estava referenciada
 *   em script.js (linhas 3277, 4095, 4101, 8269) e em script_injection.js
 *   (linhas 1020, 1052) mas nunca definida em nenhum ficheiro entregue.
 *
 *   Sem esta função, o fluxo "CASO REAL ANONIMIZADO" executava a hidratação
 *   de dados correctamente, mas o #pureDashboardWrapper permanecia com
 *   opacity: 0 (estado inicial em index.html:507), tornando os resultados
 *   invisíveis ao utilizador apesar de existirem no DOM.
 *
 * ORDEM DE CARREGAMENTO OBRIGATÓRIA:
 *   Inserir ANTES de script.js no index.html:
 *   <script src="unifed_panel_activator.js"></script>
 *   <script src="script.js"></script>
 *   <script src="enrichment.js"></script>
 *   <script src="nexus.js"></script>
 *   <script src="script_injection.js"></script>
 *   <script src="unifed_triada_export.js"></script>
 *
 * GARANTIA DE IDEMPOTÊNCIA:
 *   Guarda _PANEL_ACTIVATOR_INSTALLED previne re-execução em double-load.
 * ============================================================================
 */

(function _installPanelActivator() {
    'use strict';

    if (window._PANEL_ACTIVATOR_INSTALLED === true) {
        console.info('[UNIFED-ACTIVATOR] Módulo já instalado. Ignorando re-instalação.');
        return;
    }
    window._PANEL_ACTIVATOR_INSTALLED = true;

    window._activatePurePanel = async function _activatePurePanel(forceReset) {
        console.log('[UNIFED-ACTIVATOR] Invocando transição forçada...');

        const wrapper = document.getElementById('pureDashboardWrapper');
        const section = document.getElementById('pureDashboard');

        if (!wrapper && !section) {
            console.warn('[UNIFED-ACTIVATOR] #pureDashboardWrapper e #pureDashboard ausentes do DOM.');
            return;
        }

        if (section) {
            section.style.display    = 'block';
            section.style.visibility = 'visible';
        }

        if (!wrapper) {
            console.warn('[UNIFED-ACTIVATOR] #pureDashboardWrapper ausente; usando #pureDashboard directamente.');
            return;
        }

        if (forceReset === true) {
            wrapper.style.opacity    = '0';
            wrapper.style.transition = 'none';
            void wrapper.offsetHeight;
        }

        wrapper.style.display    = 'block';
        wrapper.style.visibility = 'visible';
        wrapper.style.height     = 'auto';
        wrapper.style.overflow   = 'visible';
        wrapper.style.transition = 'opacity 0.3s ease';

        await new Promise(resolve => requestAnimationFrame(resolve));
        wrapper.style.opacity = '1';
        await new Promise(resolve => setTimeout(resolve, 350));

        if (typeof window.forceFinalState === 'function') {
            await window.forceFinalState();
        } else {
            console.warn('[UNIFED-ACTIVATOR] forceFinalState não disponível. A transição pode estar incompleta.');
        }

        try {
            if (typeof window.ForensicLogger !== 'undefined' &&
                typeof window.ForensicLogger.addEntry === 'function') {
                window.ForensicLogger.addEntry('PANEL_ACTIVATED', {
                    wrapperId: 'pureDashboardWrapper',
                    forceReset: !!forceReset,
                    timestamp: new Date().toISOString()
                });
            }
            if (typeof window.logAudit === 'function') {
                window.logAudit('[UNIFED-ACTIVATOR] #pureDashboardWrapper activado com sucesso.', 'success');
            }
        } catch (_logErr) {}

        console.log('[UNIFED-ACTIVATOR] _activatePurePanel() concluída — painel visível.');
    };

    // ── CSS de segurança: impedir que regras externas escondam o wrapper ──────
    (function _injectActivatorCSS() {
        const STYLE_ID = 'unifed-activator-safety-css';
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            #pureDashboardWrapper.activated {
                display:    block    !important;
                opacity:    1        !important;
                height:     auto     !important;
                overflow:   visible  !important;
                visibility: visible  !important;
            }
            #pureDashboardWrapper {
                transition: opacity 0.3s ease;
            }
        `;
        const target = document.head || document.documentElement;
        target.appendChild(style);
    })();

    console.log('[UNIFED-ACTIVATOR] window._activatePurePanel registada (v1.0.0 · FIX-ACHADO-A + RETIFICAÇÃO C + SPLASH MANUAL).');
})();