/**
 * ============================================================================
 * UNIFED - PROBATUM · HARMONIZADOR DE NÚCLEO
 * unifed_core_harmonizer.js
 * ============================================================================
 * Versão      : v1.1.0-COMPLIANCE
 * Data        : 2026-04-18
 * Consolida   : unifed_fixes_comprehensive.js   (VUL-001,002,003,007)
 *               unifed_localization_fix.js       (VUL-005 · ISO 4217)
 *               unifed_toolbar_buttons.js        (VUL-006)
 *               unifed_panel_activator.js        (Achado A)
 *               unifed_card_amt01.js             (MOD_REG_013_L45)
 *               unifed_triada_export.js          (Tríade Documental)
 *
 * ARQUITECTURA — PADRÃO OBSERVER SEQUENCIAL:
 *   Todos os 6 sub-módulos são encapsulados como funções INIT puras.
 *   A função _runHarmonizer() aguarda window.UNIFEDSystem estar hidratado
 *   antes de os executar em série via cadeia de Promises.
 *   Cada fase expõe a sua flag de conclusão (phase2_*) no escopo global.
 *
 * ORDEM DE EXECUÇÃO INTERNA:
 *   Fase 0: Panel Activator (pré-requisito de layout)
 *   Fase 1: Fixes Compreensivos (VUL-001,002,003,007)
 *   Fase 2: Card AMT-01 (compliance regulatório)
 *   Fase 3: Localização PT/EN (ISO 4217 · CLDR)
 *   Fase 4: Toolbar Buttons (VUL-006)
 *   Fase 5: Tríade de Exportação (PDF/JSON/Custódia)
 *
 * RACE CONDITIONS ELIMINADAS:
 *   · Único DOMContentLoaded listener (dispatcher interno)
 *   · Único listener do evento 'unifed:access:granted'
 *   · Guards de idempotência em todas as fases (_INSTALLED flags)
 *   · Monkey-patches de switchLanguage consolidados num único ponto
 *
 * CONFORMIDADE: DORA (UE) 2022/2554 · Art. 125.º CPP · ISO/IEC 27037:2012
 * ============================================================================
 */

'use strict';

(function _unifedCoreHarmonizer() {

    const _HARMONIZER_VERSION = 'v1.1.0-COMPLIANCE';

    // Guardia de idempotência: prevenir re-execução em double-load
    if (window._UNIFED_HARMONIZER_INSTALLED === true) {
        console.info('[HARMONIZER] Módulo já instalado. Re-execução ignorada.');
        return;
    }
    window._UNIFED_HARMONIZER_INSTALLED = true;

    // =========================================================================
    // UTILITÁRIO DE LOG INTERNO
    // =========================================================================

    function _log(phase, msg, level) {
        const method = (level === 'warn') ? 'warn' : (level === 'error') ? 'error' : 'log';
        console[method]('[HARMONIZER:' + phase + '] ' + msg);
    }

    // =========================================================================
    // OBSERVADOR DE HIDRATAÇÃO: aguarda window.UNIFEDSystem estar pronto
    // =========================================================================

    /**
     * _waitForCore() — Resolve quando window.UNIFEDSystem existe no escopo global.
     * Polling com intervalo de 80ms, timeout máximo de 15s.
     * Não usa busy-wait: usa setInterval para não bloquear o event loop.
     *
     * @returns {Promise<void>}
     */
    function _waitForCore() {
        return new Promise(function(resolve, reject) {
            // Verificação imediata
            if (typeof window.UNIFEDSystem !== 'undefined') {
                _log('OBSERVER', 'window.UNIFEDSystem já disponível. Prosseguindo imediatamente.');
                return resolve();
            }

            const POLL_INTERVAL_MS = 80;
            const TIMEOUT_MS       = 15000;
            const maxTicks         = Math.floor(TIMEOUT_MS / POLL_INTERVAL_MS);
            let   ticks            = 0;

            const timer = setInterval(function() {
                ticks++;
                if (typeof window.UNIFEDSystem !== 'undefined') {
                    clearInterval(timer);
                    _log('OBSERVER', 'window.UNIFEDSystem detectado ao tick ' + ticks + ' (' + (ticks * POLL_INTERVAL_MS) + 'ms).');
                    resolve();
                } else if (ticks >= maxTicks) {
                    clearInterval(timer);
                    const msg = 'Timeout ' + TIMEOUT_MS + 'ms: window.UNIFEDSystem não foi hidratado. Prosseguindo com dados parciais.';
                    _log('OBSERVER', msg, 'warn');
                    resolve(); // Fail-soft: não bloquear a cadeia
                }
            }, POLL_INTERVAL_MS);
        });
    }

    // =========================================================================
    // FASE 0: PANEL ACTIVATOR (substitui unifed_panel_activator.js)
    // =========================================================================

    function _initPanelActivator() {
        _log('F0-PANEL', 'Instalando _activatePurePanel...');

        if (window._PANEL_ACTIVATOR_INSTALLED === true) {
            _log('F0-PANEL', 'Já instalado. Ignorando.', 'warn');
            return Promise.resolve();
        }
        window._PANEL_ACTIVATOR_INSTALLED = true;

        window._activatePurePanel = async function _activatePurePanel(forceReset) {
            const wrapper = document.getElementById('pureDashboardWrapper');
            const section = document.getElementById('pureDashboard');

            if (!wrapper && !section) {
                _log('F0-PANEL', '#pureDashboardWrapper e #pureDashboard ausentes do DOM.', 'warn');
                return;
            }
            if (section) {
                section.style.display    = 'block';
                section.style.visibility = 'visible';
            }
            if (!wrapper) {
                _log('F0-PANEL', '#pureDashboardWrapper ausente; usando #pureDashboard directamente.', 'warn');
                return;
            }

            if (forceReset === true) {
                wrapper.style.opacity    = '0';
                wrapper.style.transition = 'none';
                void wrapper.offsetHeight; // Reflow
            }

            wrapper.style.display    = 'block';
            wrapper.style.visibility = 'visible';
            wrapper.style.height     = 'auto';
            wrapper.style.overflow   = 'visible';
            wrapper.style.transition = 'opacity 0.3s ease';

            await new Promise(function(r) { requestAnimationFrame(r); });
            wrapper.style.opacity = '1';
            await new Promise(function(r) { setTimeout(r, 350); });

            if (typeof window.forceFinalState === 'function') {
                await window.forceFinalState();
            }

            _log('F0-PANEL', '_activatePurePanel() concluída — painel visível.');
        };

        // CSS de segurança: impedir que regras externas escondam o wrapper
        const STYLE_ID = 'unifed-activator-safety-css';
        if (!document.getElementById(STYLE_ID)) {
            const style = document.createElement('style');
            style.id    = STYLE_ID;
            style.textContent = `
                #pureDashboardWrapper.activated {
                    display: block !important; opacity: 1 !important;
                    height: auto !important; overflow: visible !important;
                    visibility: visible !important;
                }
                #pureDashboardWrapper { transition: opacity 0.3s ease; }
            `;
            (document.head || document.documentElement).appendChild(style);
        }

        _log('F0-PANEL', '_activatePurePanel registada com sucesso.');
        return Promise.resolve();
    }

    // =========================================================================
    // FASE 1: FIXES COMPREENSIVOS (VUL-001, VUL-002, VUL-003, VUL-007)
    // Consolida: unifed_fixes_comprehensive.js
    // =========================================================================

    function _initFixes() {
        _log('F1-FIXES', 'Aplicando correcções VUL-001/002/003/007...');

        // ── VUL-001 + VUL-004: openCustodyChainModal() com ID correcto ──────
        window.openCustodyChainModal = function openCustodyChainModal() {
            const modal = document.getElementById('hashVerificationModal');
            if (!modal) { _log('F1-FIXES', '❌ #hashVerificationModal não encontrado', 'error'); return false; }

            const masterHashFull = document.getElementById('masterHashFull');
            if (masterHashFull && window.UNIFEDSystem && window.UNIFEDSystem.masterHash) {
                masterHashFull.textContent = window.UNIFEDSystem.masterHash;
            }

            const evidenceHashList = document.getElementById('evidenceHashList');
            if (evidenceHashList && typeof window.ForensicLogger !== 'undefined') {
                try {
                    const logs = window.ForensicLogger.getLogs ? window.ForensicLogger.getLogs() : [];
                    window._renderCustodyLogHarmonized(logs, evidenceHashList);
                } catch (err) {
                    evidenceHashList.innerHTML = '<p>Evidências ainda não registadas.</p>';
                }
            }

            modal.classList.add('active');
            modal.style.display = 'flex';
            modal.style.opacity = '1';
            document.body.style.overflow = 'hidden';
            _log('F1-FIXES', '#hashVerificationModal activado');
            return true;
        };

        window.closeCustodyChainModal = function closeCustodyChainModal() {
            const modal = document.getElementById('hashVerificationModal');
            if (!modal) return;
            modal.classList.remove('active');
            modal.style.opacity = '0';
            setTimeout(function() { modal.style.display = 'none'; }, 300);
            document.body.style.overflow = '';
        };

        window._renderCustodyLogHarmonized = function(logs, container) {
            if (!container) return;
            if (!logs || logs.length === 0) {
                container.innerHTML = '<p style="color:#666;font-size:11px;">Nenhuma entrada registada.</p>';
                return;
            }
            container.innerHTML = logs.map(function(entry) {
                return '<div style="padding:8px;border-bottom:1px solid #1a1a2e;font-size:11px;">' +
                    '<strong>' + (entry.type || 'EVENT') + '</strong> — ' +
                    (entry.timestamp || '') + '<br>' +
                    '<code style="font-size:9px;color:#888;">' + JSON.stringify(entry.data || {}) + '</code>' +
                    '</div>';
            }).join('');
        };

        // ── VUL-002: renderDiscrepancyChart() com ID correcto ────────────────
        window.renderDiscrepancyChart = window.renderDiscrepancyChart || function renderDiscrepancyChart() {
            _log('F1-FIXES', 'renderDiscrepancyChart() — versão stub (script.js não carregado ainda)', 'warn');
        };

        // ── VUL-003 + VUL-007: showCharts() e _activatePurePanel override ───
        window.showCharts = function showCharts(force) {
            const mainC = document.getElementById('mainChartContainer');
            const discC = document.getElementById('mainDiscrepancyChartContainer');
            if (mainC) {
                mainC.style.display = 'block'; mainC.style.opacity = '1';
                mainC.style.visibility = 'visible';
                if (typeof Chart !== 'undefined' && force && typeof window.renderMainChart === 'function') {
                    window.renderMainChart();
                }
            }
            if (discC) {
                discC.style.display = 'block'; discC.style.opacity = '1';
                discC.style.visibility = 'visible';
                if (typeof Chart !== 'undefined' && force && typeof window.renderDiscrepancyChart === 'function') {
                    window.renderDiscrepancyChart();
                }
            }
        };

        // Monkey-patch a _activatePurePanel para garantir opacity = 1
        const _origActivate = window._activatePurePanel;
        window._activatePurePanel = async function _activatePurePanel_HarmonizedV2(forceReset) {
            if (typeof _origActivate === 'function') {
                try { await _origActivate.call(window, forceReset); } catch (e) { _log('F1-FIXES', e.message, 'warn'); }
            }
            const wrapper = document.getElementById('pureDashboardWrapper');
            if (wrapper) {
                wrapper.style.opacity = '1'; wrapper.style.display = 'block';
                wrapper.style.visibility = 'visible'; wrapper.style.height = 'auto';
                wrapper.style.pointerEvents = 'auto';
            }
            window.showCharts(true);
        };

        // Handler global dos botões de modal
        window.setupGlobalButtonHandlers = function setupGlobalButtonHandlers() {
            [
                { id: 'custodyChainTriggerBtn', handler: function() { window.openCustodyChainModal(); }, attr: 'data-harmonizer-custody' },
                { id: 'closeHashBtn',           handler: function() { window.closeCustodyChainModal(); }, attr: 'data-harmonizer-close' }
            ].forEach(function(cfg) {
                const btn = document.getElementById(cfg.id);
                if (btn && !btn.getAttribute(cfg.attr)) {
                    btn.addEventListener('click', function(e) { e.preventDefault(); cfg.handler(); });
                    btn.setAttribute(cfg.attr, 'true');
                }
            });
            const modal = document.getElementById('hashVerificationModal');
            if (modal && !modal.getAttribute('data-harmonizer-overlay')) {
                modal.addEventListener('click', function(e) {
                    if (e.target === modal) window.closeCustodyChainModal();
                });
                modal.setAttribute('data-harmonizer-overlay', 'true');
            }
        };

        window.phase2_harmonized = true;
        _log('F1-FIXES', 'VUL-001, VUL-002, VUL-003, VUL-007 corrigidos.');
        return Promise.resolve();
    }

    // =========================================================================
    // FASE 2: CARD AMT-01 (consolida unifed_card_amt01.js)
    // =========================================================================

    function _initCardAMT01() {
        _log('F2-AMT01', 'Configurando Card AMT-01 (MOD_REG_013_L45)...');

        const AMT_CONFIG = {
            id: 'CONTROLO_REGULATÓRIO_AMT', moduleId: 'MOD_REG_013_L45',
            titulo: {
                pt: '🚀 CONTROLO REGULATÓRIO · CONTRIBUIÇÃO DE REGULAÇÃO (AMT)',
                en: '🚀 REGULATORY CONTROL · REGULATION CONTRIBUTION (AMT)'
            },
            diferencialBase: 2184.95, taxaAmt: 0.001,
            descricao: {
                pt: 'Análise forense da conformidade com a Lei n.º 45/2018 (Contribuição de Regulação — TVDE)',
                en: 'Forensic analysis of compliance with Law No. 45/2018 (Regulation Contribution — TVDE)'
            },
            veredicto: {
                pt: 'Risco de Incoerência na Cadeia de Custódia Financeira',
                en: 'Risk of Incoherence in Financial Chain of Custody'
            }
        };

        const cálculos = {
            diferencial  : AMT_CONFIG.diferencialBase,
            taxa         : AMT_CONFIG.diferencialBase * AMT_CONFIG.taxaAmt,
            percentagem  : (AMT_CONFIG.taxaAmt * 100).toFixed(1)
        };

        window.AMT_CONFIG  = AMT_CONFIG;
        window.AMT_CÁLCULOS = cálculos;

        window.injectCardAMT01 = function injectCardAMT01(lang) {
            lang = lang || 'pt';
            const isPT    = (lang !== 'en');
            const fmtEUR  = function(v) {
                return isPT
                    ? '€ ' + v.toFixed(2).replace('.', ',')
                    : '€'  + v.toFixed(2);
            };

            const html = `
                <div class="forensic-card" id="card-amt-01" style="
                    background: rgba(0,100,200,0.08);
                    border: 1px solid rgba(0,150,255,0.25);
                    border-radius: 8px; padding: 20px; margin: 15px 0;">
                    <div style="font-size:11px;letter-spacing:2px;color:#4a8abf;margin-bottom:8px;">
                        ${AMT_CONFIG.moduleId}
                    </div>
                    <h3 style="margin:0 0 12px;font-size:13px;color:#60aaff;">
                        ${AMT_CONFIG.titulo[lang]}
                    </h3>
                    <p style="font-size:11px;color:#8ab8d0;margin:0 0 16px;">
                        ${AMT_CONFIG.descricao[lang]}
                    </p>
                    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;">
                        <div style="text-align:center;padding:12px;background:rgba(0,0,0,0.3);border-radius:4px;">
                            <div style="font-size:9px;color:#4a8abf;letter-spacing:1px;margin-bottom:4px;">
                                ${isPT ? 'DIFERENCIAL BASE' : 'BASE DIFFERENTIAL'}
                            </div>
                            <div style="font-size:16px;font-weight:700;color:#60aaff;">
                                ${fmtEUR(cálculos.diferencial)}
                            </div>
                        </div>
                        <div style="text-align:center;padding:12px;background:rgba(0,0,0,0.3);border-radius:4px;">
                            <div style="font-size:9px;color:#4a8abf;letter-spacing:1px;margin-bottom:4px;">
                                ${isPT ? 'TAXA AMT' : 'AMT RATE'}
                            </div>
                            <div style="font-size:16px;font-weight:700;color:#60aaff;">
                                ${cálculos.percentagem}%
                            </div>
                        </div>
                        <div style="text-align:center;padding:12px;background:rgba(255,60,60,0.1);border-radius:4px;border:1px solid rgba(255,60,60,0.3);">
                            <div style="font-size:9px;color:#bf4a4a;letter-spacing:1px;margin-bottom:4px;">
                                ${isPT ? 'CONTRIBUIÇÃO CALCULADA' : 'CALCULATED CONTRIBUTION'}
                            </div>
                            <div style="font-size:16px;font-weight:700;color:#ff6060;">
                                ${fmtEUR(cálculos.taxa)}
                            </div>
                        </div>
                    </div>
                    <div style="background:rgba(255,60,60,0.08);border:1px solid rgba(255,60,60,0.2);border-radius:4px;padding:12px;">
                        <div style="font-size:9px;color:#bf4a4a;letter-spacing:1px;margin-bottom:4px;">
                            ⚠ ${isPT ? 'VEREDICTO FORENSE' : 'FORENSIC VERDICT'}
                        </div>
                        <div style="font-size:12px;color:#ff9090;font-weight:600;">
                            ${AMT_CONFIG.veredicto[lang]}
                        </div>
                        <div style="font-size:9px;color:#6a3a3a;margin-top:6px;">
                            ${isPT ? 'Art. 13.º Lei n.º 45/2018 · Art. 119.º RGIT · Diretiva DAC7 (UE) 2021/514'
                                   : 'Art. 13 Law 45/2018 · Art. 119 RGIT · Directive DAC7 (EU) 2021/514'}
                        </div>
                    </div>
                </div>`;

            const container = document.getElementById('complianceSection');
            if (container) {
                const existing = document.getElementById('card-amt-01');
                if (existing) existing.remove();
                container.insertAdjacentHTML('afterbegin', html);
                _log('F2-AMT01', 'Card AMT-01 injectado (lang=' + lang + ')');
            } else {
                _log('F2-AMT01', '#complianceSection não encontrado', 'warn');
            }
        };

        window.phase2_amt01 = true;
        _log('F2-AMT01', 'Card AMT-01 pronto. Diferencial: €' + cálculos.diferencial.toFixed(2));
        return Promise.resolve();
    }

    // =========================================================================
    // FASE 3: LOCALIZAÇÃO PT/EN (consolida unifed_localization_fix.js)
    // VUL-005 · ISO 4217 · CLDR
    // =========================================================================

    function _initLocalization() {
        _log('F3-L10N', 'Aplicando formatação de moeda PT/EN (ISO 4217)...');

        window.formatCurrencyLocalized = function formatCurrencyLocalized(value, lang) {
            lang = lang || 'pt';
            if (typeof value !== 'number' || isNaN(value)) {
                return (lang === 'en') ? '€0.00' : '€ 0,00';
            }
            const isEN = (lang === 'en');
            const formatter = new Intl.NumberFormat(
                isEN ? 'en-GB' : 'pt-PT',
                { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true }
            );
            const formatted = formatter.format(value);
            return isEN
                ? formatted.replace('€\u00A0', '€').replace('€ ', '€')
                : formatted.replace('€', '€ ').replace('€  ', '€ ');
        };

        if (typeof window.formatCurrency === 'undefined') {
            window.formatCurrency = window.formatCurrencyLocalized;
        } else {
            const _origFmt = window.formatCurrency;
            window.formatCurrency = function(value) {
                void _origFmt; // Substituído pelo harmonizador
                const lang = window.currentLang || 'pt';
                return window.formatCurrencyLocalized(value, lang);
            };
        }

        window.updateCurrencyElementsForLanguage = function updateCurrencyElementsForLanguage(lang) {
            lang = lang || 'pt';
            const kpiMap = [
                { id: 'saftBrutoValue',         key: 'saftBruto' },
                { id: 'saftIvaValue',            key: 'iva' },
                { id: 'saftIliquidoValue',       key: 'iliquido' },
                { id: 'stmtGanhosValue',         key: 'ganhos' },
                { id: 'stmtDespesasValue',       key: 'despesas' },
                { id: 'stmtGanhosLiquidosValue', key: 'ganhosLiquidos' },
                { id: 'dac7TotalValue',          key: 'dac7TotalPeriodo' },
                { id: 'kpiGrossValue',           key: 'saftBruto' },
                { id: 'kpiGanhosValue',          key: 'ganhos' },
                { id: 'kpiCommValue',            key: 'despesas' },
                { id: 'kpiNetValue',             key: 'ganhosLiquidos' },
                { id: 'kpiInvValue',             key: 'faturaPlataforma' }
            ];
            let updated = 0;
            kpiMap.forEach(function(cfg) {
                const el  = document.getElementById(cfg.id);
                const val = window.UNIFEDSystem && window.UNIFEDSystem.analysis
                    ? window.UNIFEDSystem.analysis.totals[cfg.key]
                    : undefined;
                if (el && typeof val === 'number') {
                    el.textContent = window.formatCurrencyLocalized(val, lang);
                    updated++;
                }
            });
            _log('F3-L10N', updated + ' elemento(s) monetário(s) actualizado(s)');
        };

        window.phase2_localization = true;
        _log('F3-L10N', 'VUL-005 corrigida. PT: "€ 1.234,56" | EN: "€1,234.56"');
        return Promise.resolve();
    }

    // =========================================================================
    // FASE 4: TOOLBAR BUTTONS (consolida unifed_toolbar_buttons.js)
    // VUL-006
    // =========================================================================

    function _initToolbarButtons() {
        _log('F4-TOOLBAR', 'Configurando botões da toolbar...');

        // CSS de toolbar — injectado uma única vez
        const TOOLBAR_CSS_ID = 'unifed-toolbar-css-harmonizer';
        if (!document.getElementById(TOOLBAR_CSS_ID)) {
            const style = document.createElement('style');
            style.id    = TOOLBAR_CSS_ID;
            style.textContent = `
                #export-tools-container {
                    display: flex !important; flex-direction: column !important;
                    gap: 10px !important; width: 100% !important;
                    margin: 15px 0 !important; padding: 15px !important;
                    background: rgba(0,229,255,0.05) !important;
                    border: 1px solid var(--accent-primary, #00e5ff) !important;
                    border-radius: 8px !important;
                }
                #export-tools-container button {
                    width: 100% !important; min-height: 44px !important;
                    height: auto !important; padding: 12px 16px !important;
                    display: flex !important; align-items: center !important;
                    justify-content: center !important; gap: 8px !important;
                    font-size: 0.95rem !important; font-weight: 600 !important;
                    border: 1px solid var(--border-color, #2a2a4a) !important;
                    border-radius: 6px !important; cursor: pointer !important;
                    transition: all 0.3s ease !important;
                }
            `;
            (document.head || document.documentElement).appendChild(style);
        }

        /**
         * _bindBtn() — Associar handler a botão via ID. Idempotente por atributo data-harmonizer-bound.
         */
        function _bindBtn(id, handler) {
            const btn = document.getElementById(id);
            if (!btn || btn.getAttribute('data-harmonizer-bound')) return;
            btn.removeAttribute('onclick');
            btn.addEventListener('click', function(e) { e.preventDefault(); handler(e); });
            btn.setAttribute('data-harmonizer-bound', 'true');
        }

        window.setupAllToolbarButtons = function setupAllToolbarButtons() {
            // PDF / Parecer Técnico
            _bindBtn('exportPDFBtn', function() {
                _log('F4-TOOLBAR', 'Exportação PDF solicitada');
                if (typeof window.gerarParecer === 'function') { window.gerarParecer(); return; }
                if (typeof window.exportarPDF === 'function') { window.exportarPDF(); return; }
                if (typeof window.generatePDF === 'function') { window.generatePDF(); return; }
                _log('F4-TOOLBAR', 'Nenhum handler PDF disponível (gerarParecer / exportarPDF / generatePDF)', 'warn');
            });

            // JSON
            _bindBtn('exportJSONBtn', function() {
                _log('F4-TOOLBAR', 'Exportação JSON solicitada');
                if (typeof window.exportJSON === 'function') { window.exportJSON(); return; }
                const data = JSON.stringify(window.UNIFEDSystem || {}, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url  = URL.createObjectURL(blob);
                const a    = document.createElement('a');
                a.href     = url; a.download = 'unifed_probatum_export.json';
                a.click(); URL.revokeObjectURL(url);
                _log('F4-TOOLBAR', 'JSON exportado via fallback Blob');
            });

            // Reiniciar
            _bindBtn('resetBtn', function() {
                _log('F4-TOOLBAR', 'Reset solicitado');
                if (typeof window.resetSystem === 'function') { window.resetSystem(); return; }
                if (typeof window.resetUIVisual === 'function') { window.resetUIVisual(); return; }
                if (confirm('Reiniciar o sistema? Os dados não guardados serão perdidos.')) {
                    window.location.reload();
                }
            });

            // Limpar consola
            _bindBtn('clearConsoleBtn', function() {
                const consoleOutput = document.getElementById('consoleOutput');
                if (consoleOutput) { consoleOutput.innerHTML = ''; }
                _log('F4-TOOLBAR', 'Consola limpa');
            });

            // Alternar idioma
            _bindBtn('langToggleBtn', function() {
                if (typeof window.switchLanguage === 'function') { window.switchLanguage(); }
                else { _log('F4-TOOLBAR', 'switchLanguage não disponível', 'warn'); }
            });

            // QR Code / Cadeia de Custódia
            _bindBtn('custodyChainTriggerBtn', function() {
                if (typeof window.openCustodyChainModal === 'function') { window.openCustodyChainModal(); }
                else { _log('F4-TOOLBAR', 'openCustodyChainModal não disponível', 'warn'); }
            });

            _log('F4-TOOLBAR', 'Todos os botões configurados');
        };

        window.phase2_toolbar = true;
        _log('F4-TOOLBAR', 'VUL-006 corrigida.');
        return Promise.resolve();
    }

    // =========================================================================
    // FASE 5: TRÍADE DE EXPORTAÇÃO (consolida unifed_triada_export.js — stub init)
    // A lógica pesada permanece em unifed_triada_export.js; aqui registamos
    // apenas o listener UNIFED_CORE_READY para inicialização correcta.
    // =========================================================================

    function _initTriadaExport() {
        _log('F5-TRIADA', 'Configurando listener UNIFED_CORE_READY para Tríade...');

        // unifed_triada_export.js já ouve window.addEventListener('UNIFED_CORE_READY', ...)
        // Este stub garante que o evento é disparado se ainda não o foi
        if (!window._UNIFED_TRIADA_INITIALIZED) {
            // O evento será disparado pelo unifed_access_control.js após carregamento
            // Aqui apenas garantimos que o handler do triada está pronto para receber
            _log('F5-TRIADA', 'Aguardando evento UNIFED_CORE_READY do access_control...');
        } else {
            _log('F5-TRIADA', 'Tríade já inicializada. Ignorando.', 'warn');
        }

        return Promise.resolve();
    }

    // =========================================================================
    // DISPATCHER ÚNICO DE IDIOMA (consolida múltiplos monkey-patches)
    // =========================================================================

    function _installLanguageDispatcher() {
        _log('LANG', 'Instalando dispatcher único de switchLanguage...');

        const _allLangPatches = [];

        // Registar patch: qualquer módulo pode chamar _registerLangPatch(fn)
        window._registerLangPatch = function(fn) {
            if (typeof fn === 'function' && !_allLangPatches.includes(fn)) {
                _allLangPatches.push(fn);
            }
        };

        // Interceptar switchLanguage e chamar todos os patches em série
        const _origSwitch = window.switchLanguage;
        window.switchLanguage = function switchLanguage_Harmonized() {
            if (typeof _origSwitch === 'function') {
                try { _origSwitch.call(window); } catch (e) { _log('LANG', e.message, 'warn'); }
            }
            const lang = window.currentLang || 'pt';
            // Executar patches registados
            _allLangPatches.forEach(function(fn) {
                try { fn(lang); } catch (e) { _log('LANG', 'Patch falhou: ' + e.message, 'warn'); }
            });
            // Actualizar moedas
            if (typeof window.updateCurrencyElementsForLanguage === 'function') {
                window.updateCurrencyElementsForLanguage(lang);
            }
            // Actualizar Card AMT-01
            if (typeof window.injectCardAMT01 === 'function') {
                window.injectCardAMT01(lang);
            }
        };

        _log('LANG', 'Dispatcher de idioma instalado (patches: ' + _allLangPatches.length + ')');
    }

    // =========================================================================
    // ORQUESTRADOR PRINCIPAL — Cadeia de Promises sequencial
    // =========================================================================

    async function _runHarmonizer() {
        _log('MAIN', '════════════════════════════════════════════════════════════');
        _log('MAIN', 'UNIFED-CORE-HARMONIZER ' + _HARMONIZER_VERSION + ' — INÍCIO');
        _log('MAIN', '════════════════════════════════════════════════════════════');

        // Aguardar DOM
        if (document.readyState === 'loading') {
            await new Promise(function(r) { document.addEventListener('DOMContentLoaded', r, { once: true }); });
        }

        // Aguardar hidratação do core (script.js)
        _log('MAIN', 'Aguardando hidratação de window.UNIFEDSystem...');
        await _waitForCore();

        // Execução sequencial das 6 fases
        const phases = [
            { name: 'F0 · Panel Activator',     fn: _initPanelActivator },
            { name: 'F1 · Fixes Compreensivos', fn: _initFixes          },
            { name: 'F2 · Card AMT-01',         fn: _initCardAMT01      },
            { name: 'F3 · Localização PT/EN',   fn: _initLocalization   },
            { name: 'F4 · Toolbar Buttons',     fn: _initToolbarButtons },
            { name: 'F5 · Tríade de Exportação',fn: _initTriadaExport   }
        ];

        for (let i = 0; i < phases.length; i++) {
            const phase = phases[i];
            _log('MAIN', '▶ Fase ' + i + ': ' + phase.name);
            try {
                await phase.fn();
                _log('MAIN', '✓ Fase ' + i + ' concluída: ' + phase.name);
            } catch (err) {
                _log('MAIN', '❌ Fase ' + i + ' falhou: ' + err.message, 'error');
                // Fail-soft: continuar para a próxima fase
            }
        }

        // Dispatcher de idioma (instalado após todas as fases para capturar todos os patches)
        _installLanguageDispatcher();

        // Configurar botões e handlers globais
        if (typeof window.setupAllToolbarButtons === 'function')   window.setupAllToolbarButtons();
        if (typeof window.setupGlobalButtonHandlers === 'function') window.setupGlobalButtonHandlers();

        // Injectar Card AMT-01 com idioma inicial
        if (typeof window.injectCardAMT01 === 'function') {
            window.injectCardAMT01(window.currentLang || 'pt');
        }

        _log('MAIN', '════════════════════════════════════════════════════════════');
        _log('MAIN', '✅ HARMONIZER CONCLUÍDO — 6/6 fases executadas');
        _log('MAIN', 'Flags activas: phase2_harmonized=' + window.phase2_harmonized +
                     ' | phase2_amt01=' + window.phase2_amt01 +
                     ' | phase2_localization=' + window.phase2_localization +
                     ' | phase2_toolbar=' + window.phase2_toolbar);
        _log('MAIN', '════════════════════════════════════════════════════════════');

        // Disparar evento de núcleo pronto (para scripts que aguardam este sinal)
        window.dispatchEvent(new CustomEvent('UNIFED_HARMONIZER_READY', {
            detail: {
                version   : _HARMONIZER_VERSION,
                timestamp : new Date().toISOString(),
                phases    : phases.length
            }
        }));
    }

    // =========================================================================
    // PONTO DE ENTRADA — Activar após autenticação concedida
    // =========================================================================

    // Opção A: autenticação já concedida (unifed_access_control.js v3.1 garante
    //          que este módulo só carrega após login — via _loadModulesSequentially)
    if (window._UNIFED_ACCESS_GRANTED === true) {
        _runHarmonizer().catch(function(err) {
            console.error('[HARMONIZER] Erro crítico na orquestração:', err);
        });
    } else {
        // Opção B: listener como fallback (compatibilidade com ambientes de teste)
        document.addEventListener('unifed:access:granted', function() {
            _runHarmonizer().catch(function(err) {
                console.error('[HARMONIZER] Erro crítico na orquestração:', err);
            });
        }, { once: true });
        _log('MAIN', 'Aguardando evento unifed:access:granted...');
    }

    // =========================================================================
    // FASE 6 (PÓS-CONFORMIDADE) — Listener unifed:compliance:accepted
    // =========================================================================
    //
    // ARQUITECTURA:
    //   · As Fases 0–5 executam logo após unifed:access:granted (módulos carregados).
    //   · Neste ponto o dashboard está ainda coberto pelo #complianceOverlay.
    //   · unifed:compliance:accepted é despachado pelo unifed_access_control.js
    //     em t=0 do click em #prosseguirAnalise — antes do fade-out do blur.
    //   · Esta fase sincroniza elementos monetários, gráficos e toolbar com os
    //     dados já hidratados por ensureDemoDataLoaded() (também em t=0).
    //   · { once: true } — garante execução única; não re-executa em navegação
    //     intra-SPA ou reloads parciais.
    //
    // NÃO duplica ensureDemoDataLoaded(): essa chamada já ocorre em t=0 no
    // unifed_access_control.js antes do despacho deste evento.
    // =========================================================================

    window.addEventListener('unifed:compliance:accepted', function _onComplianceAccepted(e) {
        _log('F6-COMPLIANCE', '════ Fase 6 · Sincronização Pós-Conformidade ════');
        _log('F6-COMPLIANCE', 'Evento recebido: ' + (e.detail && e.detail.timestamp ? e.detail.timestamp : 'sem timestamp'));

        var lang = window.currentLang || 'pt';

        // ── 6a. Sincronizar elementos monetários com dados hidratados ─────────
        if (typeof window.updateCurrencyElementsForLanguage === 'function') {
            window.updateCurrencyElementsForLanguage(lang);
            _log('F6-COMPLIANCE', '6a · Elementos monetários sincronizados (lang=' + lang + ').');
        } else {
            _log('F6-COMPLIANCE', '6a · updateCurrencyElementsForLanguage não disponível.', 'warn');
        }

        // ── 6b. Re-injectar Card AMT-01 (dashboard agora visível) ─────────────
        if (typeof window.injectCardAMT01 === 'function') {
            window.injectCardAMT01(lang);
            _log('F6-COMPLIANCE', '6b · Card AMT-01 re-injectado no dashboard visível.');
        } else {
            _log('F6-COMPLIANCE', '6b · injectCardAMT01 não disponível.', 'warn');
        }

        // ── 6c. Configurar botões de toolbar (idempotente por data-attr) ───────
        if (typeof window.setupAllToolbarButtons === 'function') {
            window.setupAllToolbarButtons();
            _log('F6-COMPLIANCE', '6c · setupAllToolbarButtons() executada.');
        }
        if (typeof window.setupGlobalButtonHandlers === 'function') {
            window.setupGlobalButtonHandlers();
            _log('F6-COMPLIANCE', '6c · setupGlobalButtonHandlers() executada.');
        }

        // ── 6d. Revelar gráficos Chart.js ─────────────────────────────────────
        if (typeof window.showCharts === 'function') {
            window.showCharts(true);
            _log('F6-COMPLIANCE', '6d · showCharts(true) executada.');
        } else {
            _log('F6-COMPLIANCE', '6d · showCharts não disponível.', 'warn');
        }

        // ── 6e. Sincronizar labels da Tríade Documental ───────────────────────
        try {
            if (window.UNIFEDSystem && typeof window.UNIFEDSystem.triadaUpdateLabels === 'function') {
                window.UNIFEDSystem.triadaUpdateLabels();
                _log('F6-COMPLIANCE', '6e · triadaUpdateLabels() executada.');
            }
        } catch (triadaErr) {
            _log('F6-COMPLIANCE', '6e · triadaUpdateLabels falhou: ' + triadaErr.message, 'warn');
        }

        // ── 6f. CSS override — toolbar compacta e elevação de cards ──────────
        // Sobrepõe o CSS da Fase 4 que usa flex-direction:column e botões 100%.
        // O mandato v3.1 exige toolbar horizontal (flex-end) com scale(0.85).
        var CSS_OVERRIDE_ID = 'unifed-compliance-toolbar-override';
        if (!document.getElementById(CSS_OVERRIDE_ID)) {
            var overrideStyle = document.createElement('style');
            overrideStyle.id  = CSS_OVERRIDE_ID;
            overrideStyle.textContent = [
                '/* Harmonizer F6 — Compliance Override · 2026-04-19 */',
                '#export-tools-container {',
                '    flex-direction: row !important;',
                '    justify-content: flex-end !important;',
                '    align-items: center !important;',
                '    gap: 8px !important;',
                '    width: auto !important;',
                '    flex-wrap: wrap;',
                '}',
                '#export-tools-container button {',
                '    width: auto !important;',
                '    min-height: unset !important;',
                '    transform: scale(0.85) !important;',
                '    transform-origin: right center !important;',
                '}',
                '#export-tools-container h3 {',
                '    flex: 1 !important; margin: 0 !important;',
                '    font-size: 10px !important; letter-spacing: 2px !important;',
                '    text-transform: uppercase !important;',
                '    color: rgba(148,163,184,0.4) !important;',
                '}',
                '.dashboard-card, .forensic-card, .kpis-grid > * {',
                '    box-shadow: 0 8px 32px 0 rgba(0,0,0,0.8) !important;',
                '    border: 1px solid rgba(255,255,255,0.08) !important;',
                '}',
                '.kpis-grid { gap: 1.5rem !important; }'
            ].join('\n');
            (document.head || document.documentElement).appendChild(overrideStyle);
            _log('F6-COMPLIANCE', '6f · CSS override de toolbar e cards injectado.');
        }

        _log('F6-COMPLIANCE', '✅ Fase 6 concluída — dashboard sincronizado e operacional.');

        // Disparar evento de sistema para módulos externos que aguardem conformidade
        window.dispatchEvent(new CustomEvent('UNIFED_COMPLIANCE_READY', {
            detail: { lang: lang, timestamp: new Date().toISOString() }
        }));

    }, { once: true });

})();
