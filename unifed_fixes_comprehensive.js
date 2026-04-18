/**
 * ============================================================================
 * UNIFED - PROBATUM · FASE II — FICHEIRO 1/5
 * unifed_fixes_comprehensive.js
 * ============================================================================
 * Versão      : v2.0.0-PHASE2-HARMONIZED
 * Data        : 2026-04-18
 * Perito      : Consultor Estratégico Independente
 * Finalidade  : Corrigir VUL-001, VUL-002, VUL-003, VUL-007
 *
 * VULNERABILIDADES CORRIGIDAS:
 *   ✓ VUL-001: openCustodyChainModal() com ID correto (#hashVerificationModal)
 *   ✓ VUL-002: renderDiscrepancyChart() com ID correto (#mainDiscrepancyChart)
 *   ✓ VUL-003: Gráficos revelados automaticamente (display: block; opacity: 1)
 *   ✓ VUL-007: #pureDashboardWrapper opacidade garantida = 1
 *
 * ORDEM DE CARREGAMENTO (CRÍTICA):
 *   1. unifed_panel_activator.js
 *   2. unifed_fixes_comprehensive.js        ← ESTE FICHEIRO
 *   3. script.js
 *   4. script_injection.js
 *   5. enrichment.js
 *   6. nexus.js
 *   7. unifed_card_amt01.js                ← Injeção de Card
 *   8. unifed_localization_fix.js          ← Localização PT/EN
 *   9. unifed_toolbar_buttons.js           ← Botões toolbar
 *   10. unifed_triada_export.js
 *
 * CONFORMIDADE: Art. 125.º CPP · ISO/IEC 27037:2012 · DORA 2022/2554
 * ============================================================================
 */

'use strict';

(function _harmonizedFixes() {
    console.log('[UNIFED-PHASE2] 🚀 Iniciando FASE II - Harmonização de IDs...');

    // ========================================================================
    // SECÇÃO 1: FUNÇÕES PÚBLICAS PARA GESTÃO DE MODAIS E GRÁFICOS
    // ========================================================================

    /**
     * openCustodyChainModal() — VUL-001 + VUL-004
     * Corrige referência de ID de 'custodyModal' para 'hashVerificationModal'
     */
    window.openCustodyChainModal = function openCustodyChainModal() {
        console.log('[UNIFED-PHASE2] openCustodyChainModal() — versão harmonizada invocada');
        
        const modal = document.getElementById('hashVerificationModal');
        if (!modal) {
            console.error('[UNIFED-PHASE2] ❌ Modal #hashVerificationModal não encontrado');
            return false;
        }

        // Preencher Master Hash
        const masterHashFull = document.getElementById('masterHashFull');
        if (masterHashFull && typeof window.UNIFEDSystem !== 'undefined' && window.UNIFEDSystem.masterHash) {
            masterHashFull.textContent = window.UNIFEDSystem.masterHash;
            console.log('[UNIFED-PHASE2] ✓ Master Hash SHA-256 populado');
        }

        // Preencher lista de evidências
        const evidenceHashList = document.getElementById('evidenceHashList');
        if (evidenceHashList && typeof window.ForensicLogger !== 'undefined') {
            try {
                const logs = window.ForensicLogger.getLogs ? window.ForensicLogger.getLogs() : [];
                window._renderCustodyLogHarmonized(logs, evidenceHashList);
                console.log('[UNIFED-PHASE2] ✓ Lista de evidências renderizada');
            } catch (err) {
                console.warn('[UNIFED-PHASE2] ⚠ Erro ao renderizar logs:', err.message);
                evidenceHashList.innerHTML = '<p>Evidências ainda não registadas.</p>';
            }
        }

        // Ativar modal com transição suave
        modal.classList.add('active');
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        document.body.style.overflow = 'hidden';
        
        console.log('[UNIFED-PHASE2] ✓ Modal #hashVerificationModal ativado');
        return true;
    };

    /**
     * closeCustodyChainModal() — Fechar modal de custódia
     */
    window.closeCustodyChainModal = function closeCustodyChainModal() {
        const modal = document.getElementById('hashVerificationModal');
        if (!modal) return;
        modal.classList.remove('active');
        modal.style.opacity = '0';
        setTimeout(() => { modal.style.display = 'none'; }, 300);
        document.body.style.overflow = '';
        console.log('[UNIFED-PHASE2] Modal fechado');
    };

    /**
     * _renderCustodyLogHarmonized() — Renderizar logs de custódia
     */
    window._renderCustodyLogHarmonized = function _renderCustodyLogHarmonized(logs, container) {
        if (!container) return;

        if (!logs || logs.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">Sem eventos registados.</p>';
            return;
        }

        const sorted = [...logs].reverse();
        container.innerHTML = sorted.map((entry, idx) => {
            const d = entry.data || {};
            const hash = d.hash || '—';
            const fname = d.fileName || d.filename || '—';
            const ts = entry.timestamp ? entry.timestamp.replace('T', ' ').replace(/\.\d+Z$/, ' UTC') : '—';
            const hasHash = hash && hash.length === 64;

            return `
                <div style="margin-bottom: 10px; padding: 8px; border-left: 3px solid var(--accent-cyan); background: rgba(0,229,255,0.05); border-radius: 4px; font-size: 0.85rem;">
                    <p style="margin: 3px 0;"><strong>EVENTO:</strong> ${entry.action || 'N/D'}</p>
                    <p style="margin: 3px 0;"><strong>FICHEIRO:</strong> ${fname}</p>
                    <p style="margin: 3px 0;"><strong>TIMESTAMP:</strong> ${ts}</p>
                    ${hasHash ? `<p style="margin: 3px 0; font-size: 0.75rem;"><strong>HASH:</strong> <code style="color: var(--success-primary); word-break: break-all;">${hash}</code></p>` : ''}
                </div>`;
        }).join('');

        console.log(`[UNIFED-PHASE2] ✓ ${logs.length} evento(s) renderizado(s)`);
    };

    // ========================================================================
    // SECÇÃO 2: FUNÇÕES DE GRÁFICOS COM IDs HARMONIZADOS
    // ========================================================================

    /**
     * renderMainChart() — VUL-002 corrigido
     * Renderiza gráfico principal com ID '#mainChart'
     */
    window.renderMainChart = function renderMainChart() {
        console.log('[UNIFED-PHASE2] renderMainChart() — versão harmonizada invocada');
        
        const ctx = document.getElementById('mainChart');
        if (!ctx) {
            console.error('[UNIFED-PHASE2] ❌ Canvas #mainChart não encontrado');
            return;
        }

        // Destruir gráfico anterior se existir
        if (window.UNIFEDSystem && window.UNIFEDSystem.chart) {
            window.UNIFEDSystem.chart.destroy();
        }

        const totals = (window.UNIFEDSystem && window.UNIFEDSystem.analysis) 
            ? window.UNIFEDSystem.analysis.totals 
            : {};
        const currentLang = window.currentLang || 'pt';
        const translations = window.translations || {};
        const t = translations[currentLang] || translations.pt || {};

        const data = [
            totals.saftBruto || 0,
            totals.ganhos || 0,
            totals.despesas || 0,
            totals.ganhosLiquidos || 0,
            totals.faturaPlataforma || 0,
            totals.dac7TotalPeriodo || 0
        ];

        const labels = [
            t.saftBruto || 'SAF-T Bruto',
            t.stmtGanhos || 'Ganhos',
            t.stmtDespesas || 'Despesas/Comissões',
            t.stmtGanhosLiquidos || 'Líquido',
            t.kpiInvText || 'Faturado',
            'DAC7'
        ];

        try {
            window.UNIFEDSystem = window.UNIFEDSystem || {};
            window.UNIFEDSystem.chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: currentLang === 'pt' ? 'Valor (€)' : 'Amount (€)',
                        data: data,
                        backgroundColor: ['#0ea5e9', '#10b981', '#ef4444', '#8b5cf6', '#6366f1', '#f59e0b'],
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.2)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            padding: 10,
                            borderColor: 'rgba(0,229,255,0.5)',
                            borderWidth: 1
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(255,255,255,0.1)' },
                            ticks: {
                                color: '#b8c6e0',
                                callback: (v) => {
                                    return new Intl.NumberFormat(
                                        currentLang === 'pt' ? 'pt-PT' : 'en-GB',
                                        { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }
                                    ).format(v);
                                }
                            }
                        },
                        x: {
                            grid: { color: 'rgba(255,255,255,0.05)' },
                            ticks: { color: '#b8c6e0' }
                        }
                    }
                }
            });
            console.log('[UNIFED-PHASE2] ✓ Gráfico principal renderizado');
        } catch (err) {
            console.error('[UNIFED-PHASE2] ❌ Erro ao renderizar gráfico:', err.message);
        }
    };

    /**
     * renderDiscrepancyChart() — VUL-002 corrigido
     * Renderiza gráfico de discrepâncias com ID '#mainDiscrepancyChart'
     */
    window.renderDiscrepancyChart = function renderDiscrepancyChart() {
        console.log('[UNIFED-PHASE2] renderDiscrepancyChart() — versão harmonizada invocada');
        
        // *** CORREÇÃO CRÍTICA: usar 'mainDiscrepancyChart' em vez de 'discrepancyChart' ***
        const ctx = document.getElementById('mainDiscrepancyChart');
        if (!ctx) {
            console.error('[UNIFED-PHASE2] ❌ Canvas #mainDiscrepancyChart não encontrado');
            return;
        }

        // Destruir gráfico anterior
        if (window.UNIFEDSystem && window.UNIFEDSystem.discrepancyChart) {
            window.UNIFEDSystem.discrepancyChart.destroy();
        }

        const cross = (window.UNIFEDSystem && window.UNIFEDSystem.analysis && window.UNIFEDSystem.analysis.crossings)
            ? window.UNIFEDSystem.analysis.crossings
            : {};
        const currentLang = window.currentLang || 'pt';

        // Valores com fallback para DEMO
        const discrepanciaCritica = cross.discrepanciaCritica !== undefined ? cross.discrepanciaCritica : 2184.95;
        const discrepanciaSaftVsDac7 = cross.discrepanciaSaftVsDac7 !== undefined ? cross.discrepanciaSaftVsDac7 : 451.15;

        try {
            window.UNIFEDSystem = window.UNIFEDSystem || {};
            window.UNIFEDSystem.discrepancyChart = new Chart(ctx, {
                type: 'scatter',
                data: {
                    datasets: [{
                        label: currentLang === 'pt' 
                            ? 'Despesas/Comissões vs Faturas' 
                            : 'Expenses/Commissions vs Invoices',
                        data: [{ x: 1, y: discrepanciaCritica }],
                        backgroundColor: '#ef4444',
                        borderColor: '#dc2626',
                        borderWidth: 2,
                        pointRadius: 12,
                        pointHoverRadius: 15,
                        pointBorderWidth: 2,
                        pointBorderColor: '#fff'
                    }, {
                        label: currentLang === 'pt' 
                            ? 'SAF-T vs DAC7' 
                            : 'SAF-T vs DAC7',
                        data: [{ x: 2, y: discrepanciaSaftVsDac7 }],
                        backgroundColor: '#f59e0b',
                        borderColor: '#d97706',
                        borderWidth: 2,
                        pointRadius: 12,
                        pointHoverRadius: 15,
                        pointBorderWidth: 2,
                        pointBorderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { 
                            display: true, 
                            labels: { 
                                color: '#b8c6e0',
                                padding: 15,
                                font: { size: 11 }
                            } 
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            padding: 10,
                            borderColor: 'rgba(255,165,0,0.5)',
                            borderWidth: 1,
                            callbacks: {
                                label: (context) => {
                                    const formatter = new Intl.NumberFormat(
                                        currentLang === 'pt' ? 'pt-PT' : 'en-GB',
                                        { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }
                                    );
                                    return context.dataset.label + ': ' + formatter.format(context.raw.y);
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            type: 'category',
                            labels: ['', 
                                currentLang === 'pt' ? 'Despesas/Comissões' : 'Expenses/Commissions', 
                                'SAF-T/DAC7', 
                                ''],
                            grid: { color: 'rgba(255,255,255,0.1)' },
                            ticks: { color: '#b8c6e0' }
                        },
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(255,255,255,0.1)' },
                            ticks: {
                                color: '#b8c6e0',
                                callback: (v) => {
                                    return new Intl.NumberFormat(
                                        currentLang === 'pt' ? 'pt-PT' : 'en-GB',
                                        { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }
                                    ).format(v);
                                }
                            }
                        }
                    }
                }
            });
            console.log('[UNIFED-PHASE2] ✓ Gráfico de discrepâncias renderizado');
        } catch (err) {
            console.error('[UNIFED-PHASE2] ❌ Erro ao renderizar gráfico de discrepâncias:', err.message);
        }
    };

    /**
     * showCharts() — VUL-003 corrigido
     * Força visibilidade dos gráficos (display: block; opacity: 1)
     */
    window.showCharts = function showCharts(force = true) {
        console.log('[UNIFED-PHASE2] showCharts() — revelando gráficos');
        
        const mainChartContainer = document.getElementById('mainChartContainer');
        const discrepancyChartContainer = document.getElementById('mainDiscrepancyChartContainer');

        if (mainChartContainer) {
            mainChartContainer.style.display = 'block';
            mainChartContainer.style.opacity = '1';
            mainChartContainer.style.visibility = 'visible';
            mainChartContainer.style.pointerEvents = 'auto';
            console.log('[UNIFED-PHASE2] ✓ #mainChartContainer visível');
            
            // Renderizar se Chart.js está disponível
            if (typeof Chart !== 'undefined' && force) {
                window.renderMainChart();
            }
        }

        if (discrepancyChartContainer) {
            discrepancyChartContainer.style.display = 'block';
            discrepancyChartContainer.style.opacity = '1';
            discrepancyChartContainer.style.visibility = 'visible';
            discrepancyChartContainer.style.pointerEvents = 'auto';
            console.log('[UNIFED-PHASE2] ✓ #mainDiscrepancyChartContainer visível');
            
            // Renderizar se Chart.js está disponível
            if (typeof Chart !== 'undefined' && force) {
                window.renderDiscrepancyChart();
            }
        }
    };

    // ========================================================================
    // SECÇÃO 3: GARANTIR VISIBILIDADE DO DASHBOARD (VUL-007)
    // ========================================================================

    /**
     * Monkey-patch ao _activatePurePanel para garantir opacidade = 1
     */
    const originalActivatePurePanel = window._activatePurePanel;
    window._activatePurePanel = async function _activatePurePanel_Enhanced(forceReset) {
        console.log('[UNIFED-PHASE2] _activatePurePanel_Enhanced() invocada');
        
        // Chamar original se existir
        if (typeof originalActivatePurePanel === 'function') {
            try {
                await originalActivatePurePanel.call(window, forceReset);
            } catch (err) {
                console.warn('[UNIFED-PHASE2] ⚠ Erro no originalActivatePurePanel:', err.message);
            }
        }

        // Garantir opacidade e visibilidade
        const wrapper = document.getElementById('pureDashboardWrapper');
        if (wrapper) {
            wrapper.style.opacity = '1';
            wrapper.style.display = 'block';
            wrapper.style.visibility = 'visible';
            wrapper.style.height = 'auto';
            wrapper.style.pointerEvents = 'auto';
            console.log('[UNIFED-PHASE2] ✓ #pureDashboardWrapper opacity = 1 (garantido)');
        }

        // Revelar gráficos
        window.showCharts(true);
    };

    // ========================================================================
    // SECÇÃO 4: HANDLERS DE BOTÕES GLOBAIS
    // ========================================================================

    /**
     * setupGlobalButtonHandlers() — Configurar handlers dos botões críticos
     */
    window.setupGlobalButtonHandlers = function setupGlobalButtonHandlers() {
        console.log('[UNIFED-PHASE2] setupGlobalButtonHandlers() — configurando handlers');

        // Botão: CADEIA DE CUSTÓDIA
        const custodyBtn = document.getElementById('custodyChainTriggerBtn');
        if (custodyBtn && !custodyBtn.getAttribute('data-phase2-listener')) {
            custodyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.openCustodyChainModal();
            });
            custodyBtn.setAttribute('data-phase2-listener', 'true');
            console.log('[UNIFED-PHASE2] ✓ Handler do botão CADEIA DE CUSTÓDIA configurado');
        }

        // Botão: FECHAR MODAL (hash)
        const closeHashBtn = document.getElementById('closeHashBtn');
        if (closeHashBtn && !closeHashBtn.getAttribute('data-phase2-listener')) {
            closeHashBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.closeCustodyChainModal();
            });
            closeHashBtn.setAttribute('data-phase2-listener', 'true');
            console.log('[UNIFED-PHASE2] ✓ Handler do botão FECHAR MODAL (hash) configurado');
        }

        // Clique fora do modal para fechar
        const hashVerificationModal = document.getElementById('hashVerificationModal');
        if (hashVerificationModal && !hashVerificationModal.getAttribute('data-phase2-overlay')) {
            hashVerificationModal.addEventListener('click', (e) => {
                if (e.target === hashVerificationModal) {
                    window.closeCustodyChainModal();
                }
            });
            hashVerificationModal.setAttribute('data-phase2-overlay', 'true');
        }
    };

    // ========================================================================
    // SECÇÃO 5: INICIALIZAÇÃO AUTOMÁTICA
    // ========================================================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.setupGlobalButtonHandlers();
            console.log('[UNIFED-PHASE2] ✓ Handlers globais configurados (DOMContentLoaded)');
        });
    } else {
        window.setupGlobalButtonHandlers();
        console.log('[UNIFED-PHASE2] ✓ Handlers globais configurados (imediato)');
    }

    // ========================================================================
    // RESUMO FINAL
    // ========================================================================

    console.log('[UNIFED-PHASE2] ✅ FICHEIRO 1/5 CARREGADO');
    console.log('[UNIFED-PHASE2] Vulnerabilidades corrigidas: VUL-001, VUL-002, VUL-003, VUL-007');
    console.log('[UNIFED-PHASE2] Funções públicas expostas: openCustodyChainModal, renderDiscrepancyChart, showCharts, _activatePurePanel');
    
    window.phase2_harmonized = true;
})();
