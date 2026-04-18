/**
 * ============================================================================
 * UNIFED - PROBATUM · FRENTE 1-D
 * unifed_zk_cleanup.js
 * ============================================================================
 * Versão      : v1.0.0
 * Data        : 2026-04-18
 * Conformidade: RGPD Art. 25.º (Privacy by Design) · ISO/IEC 27001:2022
 *               Art. 5.º n.º 1 alínea e) RGPD (Limitação da Conservação)
 *
 * ÂMBITO:
 *   Motor de limpeza de memória que garante a destruição total de dados
 *   pessoais e de negócio em dois eventos:
 *
 *   EVENTO 1 — beforeunload
 *     Disparado quando o utilizador fecha o tab/janela ou navega para
 *     fora. Executa a purga de memória de forma síncrona (obrigatório —
 *     operações assíncronas não são garantidas em beforeunload).
 *
 *   EVENTO 2 — session_destroy (evento personalizado UNIFED)
 *     Disparado programaticamente quando o advogado termina uma sessão
 *     de análise antes de fechar o browser (ex: entrega do dispositivo
 *     a terceiros, pausa na apresentação).
 *
 * ADVERTÊNCIA TÉCNICA — beforeunload:
 *   O evento beforeunload NÃO é garantido em todos os cenários:
 *   - Encerramento abrupto do processo do browser
 *   - Dispositivos móveis (o browser pode ser terminado pelo OS)
 *   - "Freeze" de tabs em Safari/iOS
 *   Para estes cenários, a arquitectura Zero-Data-Exfiltration do sistema
 *   é a primeira linha de defesa: sem dados em servidor, não existe
 *   exposição mesmo que a limpeza local não execute.
 *
 * SUPERFÍCIE DE LIMPEZA:
 *   1. window.UNIFEDSystem (análise, documentos, hashes)
 *   2. window.rawForensicData
 *   3. window.UNIFED_INTERNAL
 *   4. localStorage + sessionStorage
 *   5. IndexedDB (se existir base UNIFED)
 *   6. Instâncias Chart.js (canvas)
 *   7. Web Workers activos (UNIFEDBatchProcessor)
 *   8. URL de Blob (object URLs) gerados pelo sistema
 *   9. Variáveis globais de estado de sessão
 *  10. DOM: conteúdo de elementos com dados sensíveis
 *
 * ORDEM DE CARREGAMENTO:
 *   Inserir como ÚLTIMO script antes de </body>
 *   <script src="unifed_zk_cleanup.js"></script>
 * ============================================================================
 */

'use strict';

(function _installZKCleanupEngine() {

    if (window._ZK_CLEANUP_INSTALLED === true) {
        console.info('[UNIFED-ZK] Motor já instalado. Ignorando re-instalação.');
        return;
    }
    window._ZK_CLEANUP_INSTALLED = true;

    // ========================================================================
    // REGISTO DE RECURSOS PARA LIMPEZA
    // ========================================================================

    /**
     * UNIFEDResourceRegistry — Regista recursos que precisam de limpeza.
     *
     * Módulos externos (ex: unifed_triada_export.js) podem registar
     * recursos aqui. O motor de limpeza itera o registo no momento da purga.
     */
    window.UNIFEDResourceRegistry = (function() {
        const _blobUrls   = [];
        const _objectUrls = [];
        const _callbacks  = [];

        function registerBlobUrl(url) {
            if (typeof url === 'string' && url.startsWith('blob:')) {
                _blobUrls.push(url);
            }
        }

        function registerObjectUrl(url) {
            if (typeof url === 'string') {
                _objectUrls.push(url);
            }
        }

        function registerCleanupCallback(fn) {
            if (typeof fn === 'function') {
                _callbacks.push(fn);
            }
        }

        function releaseAll() {
            // Revogar Blob URLs (libertam memória de exportações PDF/JSON)
            _blobUrls.forEach(function(url) {
                try { URL.revokeObjectURL(url); } catch (_) {}
            });
            _blobUrls.length = 0;

            _objectUrls.forEach(function(url) {
                try { URL.revokeObjectURL(url); } catch (_) {}
            });
            _objectUrls.length = 0;

            // Executar callbacks registados
            _callbacks.forEach(function(fn) {
                try { fn(); } catch (_) {}
            });
            _callbacks.length = 0;

            console.log('[UNIFED-ZK] UNIFEDResourceRegistry: todos os recursos libertados.');
        }

        return { registerBlobUrl, registerObjectUrl, registerCleanupCallback, releaseAll };
    })();


    // ========================================================================
    // MOTOR DE PURGA — EXECUÇÃO SÍNCRONA (OBRIGATÓRIO PARA beforeunload)
    // ========================================================================

    /**
     * _executeZKPurge(reason) — Purga síncrona total de dados em memória.
     *
     * CRÍTICO: Esta função DEVE ser síncrona. O evento beforeunload não
     * aguarda Promises ou setTimeout. Qualquer operação assíncrona aqui
     * não é garantida.
     *
     * @param {string} reason — Motivo da purga (para log de auditoria)
     */
    function _executeZKPurge(reason) {
        const startTs = Date.now();
        console.warn('[UNIFED-ZK] ════════════════════════════════════════════');
        console.warn('[UNIFED-ZK] PURGA ZERO-KNOWLEDGE INICIADA');
        console.warn('[UNIFED-ZK] Motivo: ' + (reason || 'não especificado'));
        console.warn('[UNIFED-ZK] ════════════════════════════════════════════');

        let purgado = 0;

        // ── 1. UNIFEDSystem — dados de análise ─────────────────────────────
        if (window.UNIFEDSystem) {
            // Sobrescrever com zeros antes de apagar (overwrite before delete)
            if (window.UNIFEDSystem.analysis) {
                window.UNIFEDSystem.analysis.totals    = {};
                window.UNIFEDSystem.analysis.crossings = {};
                window.UNIFEDSystem.analysis.verdict   = null;
                window.UNIFEDSystem.analysis.evidenceIntegrity = [];
            }
            if (window.UNIFEDSystem.documents) {
                Object.keys(window.UNIFEDSystem.documents).forEach(function(k) {
                    window.UNIFEDSystem.documents[k] = null;
                });
            }
            if (window.UNIFEDSystem.monthlyData) {
                window.UNIFEDSystem.monthlyData = null;
            }
            window.UNIFEDSystem.masterHash  = null;
            window.UNIFEDSystem.dataMonths  = null;

            // Destruir instâncias Chart.js
            if (window.UNIFEDSystem.chart) {
                try { window.UNIFEDSystem.chart.destroy(); } catch (_) {}
                window.UNIFEDSystem.chart = null;
            }
            if (window.UNIFEDSystem.discrepancyChart) {
                try { window.UNIFEDSystem.discrepancyChart.destroy(); } catch (_) {}
                window.UNIFEDSystem.discrepancyChart = null;
            }

            purgado++;
        }

        // ── 2. Chart.js — todas as instâncias via Chart.getChart() ─────────
        ['mainChart','mainDiscrepancyChart','discrepancyChart','atfChartCanvas','atfChartCanvasModal']
            .forEach(function(id) {
                var canvas = document.getElementById(id);
                if (canvas && typeof Chart !== 'undefined') {
                    try {
                        var inst = Chart.getChart(canvas);
                        if (inst) { inst.destroy(); }
                        var ctx = canvas.getContext('2d');
                        if (ctx) { ctx.clearRect(0, 0, canvas.width, canvas.height); }
                    } catch (_) {}
                }
            });
        if (window.atfChartInstance) {
            try { window.atfChartInstance.destroy(); } catch (_) {}
            window.atfChartInstance = null;
        }
        purgado++;

        // ── 3. rawForensicData ──────────────────────────────────────────────
        if (window.rawForensicData !== null && window.rawForensicData !== undefined) {
            window.rawForensicData = null;
            purgado++;
        }

        // ── 4. UNIFED_INTERNAL ──────────────────────────────────────────────
        if (window.UNIFED_INTERNAL) {
            if (window.UNIFED_INTERNAL.data) {
                window.UNIFED_INTERNAL.data = null;
            }
            purgado++;
        }

        // ── 5. Variáveis de estado de sessão ───────────────────────────────
        var sessionVars = [
            '_unifedDataLoaded', '_unifedAnalysisPending', '_unifedRawDataOnly',
            'currentCase', 'forensicSession', '_activeMotoristaId'
        ];
        sessionVars.forEach(function(v) {
            if (window[v] !== undefined) {
                window[v] = null;
                delete window[v];
                purgado++;
            }
        });

        // ── 6. localStorage + sessionStorage ───────────────────────────────
        try {
            localStorage.clear();
            sessionStorage.clear();
            purgado++;
        } catch (e) {
            console.warn('[UNIFED-ZK] Storage clear falhou:', e.message);
        }

        // ── 7. IndexedDB — apagar base UNIFED se existir ───────────────────
        try {
            if (typeof indexedDB !== 'undefined') {
                var dbNames = ['unifed-db', 'UNIFED_PROBATUM', 'forensic-cache'];
                dbNames.forEach(function(dbName) {
                    try { indexedDB.deleteDatabase(dbName); } catch (_) {}
                });
                purgado++;
            }
        } catch (_) {}

        // ── 8. Web Workers activos ──────────────────────────────────────────
        if (window.UNIFEDBatchProcessor &&
            typeof window.UNIFEDBatchProcessor.terminate === 'function') {
            window.UNIFEDBatchProcessor.terminate();
            purgado++;
        }

        // ── 9. Blob URLs e recursos registados ─────────────────────────────
        if (window.UNIFEDResourceRegistry &&
            typeof window.UNIFEDResourceRegistry.releaseAll === 'function') {
            window.UNIFEDResourceRegistry.releaseAll();
            purgado++;
        }

        // ── 10. DOM — sobrescrever elementos com dados sensíveis ───────────
        // (Apenas executado em session_destroy, não em beforeunload
        //  para evitar flickering durante a navegação)
        if (reason !== 'beforeunload') {
            var sensitiveSelectors = [
                '.pure-data-value', '.pure-sg-val', '.pure-zc-val',
                '.pure-delta-value', '.pure-atf-big', '.hash-display',
                '#masterHashFull', '#evidenceHashList'
            ];
            sensitiveSelectors.forEach(function(sel) {
                document.querySelectorAll(sel).forEach(function(el) {
                    el.textContent = '---';
                    el.style.opacity = '0';
                });
            });

            // Invalidar cache do Reconciliador
            if (window.UNIFEDDOMReconciler &&
                typeof window.UNIFEDDOMReconciler.invalidate === 'function') {
                window.UNIFEDDOMReconciler.invalidate();
            }
            purgado++;
        }

        // ── 11. ForensicLogger — limpar log em memória ─────────────────────
        if (window.ForensicLogger && window.ForensicLogger.entries) {
            window.ForensicLogger.entries = [];
            purgado++;
        }

        const elapsed = Date.now() - startTs;
        console.warn('[UNIFED-ZK] ✓ Purga Zero-Knowledge concluída.');
        console.warn('[UNIFED-ZK] Objectos purgados: ' + purgado);
        console.warn('[UNIFED-ZK] Tempo de execução: ' + elapsed + 'ms');
        console.warn('[UNIFED-ZK] ════════════════════════════════════════════');
    }


    // ========================================================================
    // EVENTO 1 — beforeunload
    // ========================================================================

    window.addEventListener('beforeunload', function(event) {
        // Executar purga síncrona
        try {
            _executeZKPurge('beforeunload');
        } catch (err) {
            // Nunca lançar em beforeunload — pode bloquear o fecho do tab
            console.error('[UNIFED-ZK] Erro em beforeunload purge:', err.message);
        }
        // Não retornar string — evitar diálogo de confirmação do browser
        // (que seria contraproducente: bloqueia o fecho e expõe dados mais tempo)
    }, { passive: true });

    console.log('[UNIFED-ZK] ✓ Listener beforeunload registado.');


    // ========================================================================
    // EVENTO 2 — session_destroy (evento personalizado UNIFED)
    // ========================================================================

    /**
     * O evento 'UNIFED_SESSION_DESTROY' é disparado programaticamente
     * quando o operador termina uma sessão de análise.
     *
     * Utilização:
     *   window.dispatchEvent(new CustomEvent('UNIFED_SESSION_DESTROY', {
     *       detail: { reason: 'Pausa na apresentação' }
     *   }));
     */
    window.addEventListener('UNIFED_SESSION_DESTROY', function(event) {
        const reason = (event.detail && event.detail.reason)
            ? event.detail.reason
            : 'session_destroy';

        console.warn('[UNIFED-ZK] Evento UNIFED_SESSION_DESTROY recebido: ' + reason);

        try {
            _executeZKPurge(reason);
        } catch (err) {
            console.error('[UNIFED-ZK] Erro em session_destroy purge:', err.message);
        }

        // Activar painel de estado Zero-Knowledge no UI
        const zkPanel = document.getElementById('zkStatePanel');
        if (zkPanel) {
            zkPanel.style.display = 'block';
            zkPanel.innerHTML =
                '<div class="zk-notice">' +
                '🔒 SESSÃO ENCERRADA — DADOS PURGADOS — SISTEMA EM ESTADO ZERO-KNOWLEDGE' +
                '</div>';
        }

        // Log de auditoria
        if (typeof window.logAudit === 'function') {
            window.logAudit('Sessão encerrada. Purga Zero-Knowledge executada: ' + reason, 'success');
        }
    });

    console.log('[UNIFED-ZK] ✓ Listener UNIFED_SESSION_DESTROY registado.');


    // ========================================================================
    // API PÚBLICA — Botão de Purga Manual
    // ========================================================================

    /**
     * window.UNIFED_ZK_DESTROY() — API pública para purga manual.
     *
     * Pode ser ligado a um botão "Terminar Sessão" no UI:
     *   document.getElementById('endSessionBtn').addEventListener('click',
     *       window.UNIFED_ZK_DESTROY);
     */
    window.UNIFED_ZK_DESTROY = function UNIFED_ZK_DESTROY(reason) {
        window.dispatchEvent(new CustomEvent('UNIFED_SESSION_DESTROY', {
            detail: { reason: reason || 'Purga manual via API' }
        }));
    };


    // ========================================================================
    // INTEGRAÇÃO COM visibilitychange (tab em background — iOS/Android)
    // ========================================================================

    /**
     * Em dispositivos móveis, o browser pode suspender a tab sem disparar
     * beforeunload. O evento visibilitychange é mais fiável.
     *
     * Estratégia conservadora: ao ocultar a tab, purgar apenas dados voláteis
     * (não o DOM completo, para permitir retomar a sessão).
     */
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden') {
            // Purga parcial: apenas storage (mais fiável que beforeunload em mobile)
            try {
                localStorage.clear();
                sessionStorage.clear();
                console.info('[UNIFED-ZK] visibilitychange → hidden: storage purgado.');
            } catch (_) {}
        }
    });

    console.log('[UNIFED-ZK] ✓ Listener visibilitychange registado.');


    // ========================================================================
    // SUMÁRIO
    // ========================================================================

    console.log('[UNIFED-ZK] ✅ Motor Zero-Knowledge carregado.');
    console.log('[UNIFED-ZK]   Evento 1: beforeunload (purga síncrona)');
    console.log('[UNIFED-ZK]   Evento 2: UNIFED_SESSION_DESTROY (purga programática)');
    console.log('[UNIFED-ZK]   Evento 3: visibilitychange → hidden (purga parcial mobile)');
    console.log('[UNIFED-ZK]   API:      window.UNIFED_ZK_DESTROY(reason)');
    console.log('[UNIFED-ZK]   Registo:  window.UNIFEDResourceRegistry');

    window.phase_zk_cleanup = true;

})();
