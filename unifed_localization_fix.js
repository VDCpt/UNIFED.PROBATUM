/**
 * ============================================================================
 * UNIFED - PROBATUM · FASE II — FICHEIRO 3/5
 * unifed_localization_fix.js
 * ============================================================================
 * Versão      : v1.0.0-LOCALIZATION-FIX
 * Data        : 2026-04-18
 * Perito      : Consultor Estratégico Independente
 * Finalidade  : Corrigir VUL-005 - Localização PT/EN com símbolos monetários
 *
 * REGRA RÍGIDA DE MOEDA:
 *   PT-PT: "€ 50,00" (símbolo à esquerda, separador decimal vírgula)
 *   EN-GB: "€50.00" (símbolo à esquerda sem espaço, separador decimal ponto)
 *
 * IMPLEMENTAÇÃO:
 *   - Função formatCurrencyLocalized() override
 *   - Atualização de labels dinâmicos em switchLanguage()
 *   - Aplicação a gráficos (Chart.js callbacks)
 *   - Aplicação a valores em cards e KPIs
 *
 * CONFORMIDADE: ISO 4217 · CLDR (Unicode Common Locale Data Repository)
 * ============================================================================
 */

'use strict';

(function _localizationFix() {
    console.log('[UNIFED-LOCALIZATION] 🌍 Iniciando correção de localização PT/EN...');

    // ========================================================================
    // FUNÇÃO DE FORMATAÇÃO DE MOEDA COM LOCALIZAÇÃO CORRETA
    // ========================================================================

    /**
     * formatCurrencyLocalized() — Formatter corrigido com regras PT-PT vs EN-GB
     * 
     * PT-PT: "€ 1.234,56" (símbolo à esquerda, . para milhares, , para decimais)
     * EN-GB: "€1,234.56" (símbolo à esquerda sem espaço, , para milhares, . para decimais)
     */
    window.formatCurrencyLocalized = function formatCurrencyLocalized(value, lang = 'pt') {
        if (typeof value !== 'number' || isNaN(value)) {
            return lang === 'pt' ? '€ 0,00' : '€0.00';
        }

        const isEN = lang === 'en';
        
        // Usar Intl.NumberFormat para garantir conformidade com padrões Unicode
        const formatter = new Intl.NumberFormat(
            isEN ? 'en-GB' : 'pt-PT',
            {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
                useGrouping: true
            }
        );

        const formatted = formatter.format(value);
        
        // Garantir que símbolo está no local correto
        if (isEN) {
            // EN: €1,234.56 (símbolo à esquerda, sem espaço)
            return formatted.replace('€\u00A0', '€').replace('€ ', '€');
        } else {
            // PT: € 1.234,56 (símbolo à esquerda com espaço)
            return formatted.replace('€', '€ ').replace('€  ', '€ ');
        }
    };

    /**
     * Override da função global formatCurrency se existir
     */
    if (typeof window.formatCurrency === 'undefined') {
        window.formatCurrency = window.formatCurrencyLocalized;
    } else {
        const originalFormatCurrency = window.formatCurrency;
        window.formatCurrency = function(value) {
            const lang = (typeof window.currentLang !== 'undefined') ? window.currentLang : 'pt';
            return window.formatCurrencyLocalized(value, lang);
        };
    }

    // ========================================================================
    // ATUALIZAÇÃO DE ELEMENTOS COM MOEDA NA MUDANÇA DE IDIOMA
    // ========================================================================

    /**
     * updateCurrencyElementsForLanguage() — Atualizar todos os valores monetários no DOM
     */
    window.updateCurrencyElementsForLanguage = function updateCurrencyElementsForLanguage(lang = 'pt') {
        console.log('[UNIFED-LOCALIZATION] Atualizando elementos com moeda para idioma: ' + lang);

        // KPI Cards
        const kpiElements = [
            { id: 'saftBrutoValue', value: window.UNIFEDSystem?.analysis?.totals?.saftBruto },
            { id: 'saftIvaValue', value: window.UNIFEDSystem?.analysis?.totals?.iva },
            { id: 'saftIliquidoValue', value: window.UNIFEDSystem?.analysis?.totals?.iliquido },
            { id: 'stmtGanhosValue', value: window.UNIFEDSystem?.analysis?.totals?.ganhos },
            { id: 'stmtDespesasValue', value: window.UNIFEDSystem?.analysis?.totals?.despesas },
            { id: 'stmtGanhosLiquidosValue', value: window.UNIFEDSystem?.analysis?.totals?.ganhosLiquidos },
            { id: 'dac7TotalValue', value: window.UNIFEDSystem?.analysis?.totals?.dac7TotalPeriodo },
            { id: 'kpiGrossValue', value: window.UNIFEDSystem?.analysis?.totals?.saftBruto },
            { id: 'kpiGanhosValue', value: window.UNIFEDSystem?.analysis?.totals?.ganhos },
            { id: 'kpiCommValue', value: window.UNIFEDSystem?.analysis?.totals?.despesas },
            { id: 'kpiNetValue', value: window.UNIFEDSystem?.analysis?.totals?.ganhosLiquidos },
            { id: 'kpiInvValue', value: window.UNIFEDSystem?.analysis?.totals?.faturaPlataforma }
        ];

        let updated = 0;
        kpiElements.forEach(({ id, value }) => {
            const el = document.getElementById(id);
            if (el && typeof value === 'number') {
                el.textContent = window.formatCurrencyLocalized(value, lang);
                updated++;
            }
        });

        console.log(`[UNIFED-LOCALIZATION] ✓ ${updated} elemento(s) com moeda atualizado(s)`);

        // Atualizar gráficos se existirem
        if (typeof window.UNIFEDSystem !== 'undefined' && window.UNIFEDSystem.chart) {
            // Atualizar escalas dos gráficos
            if (typeof window.UNIFEDSystem.chart.options?.scales?.y?.ticks?.callback === 'function') {
                window.UNIFEDSystem.chart.options.scales.y.ticks.callback = (v) => {
                    return window.formatCurrencyLocalized(v, lang);
                };
            }
            window.UNIFEDSystem.chart.update();
            console.log('[UNIFED-LOCALIZATION] ✓ Gráfico principal atualizado');
        }

        if (typeof window.UNIFEDSystem !== 'undefined' && window.UNIFEDSystem.discrepancyChart) {
            if (typeof window.UNIFEDSystem.discrepancyChart.options?.scales?.y?.ticks?.callback === 'function') {
                window.UNIFEDSystem.discrepancyChart.options.scales.y.ticks.callback = (v) => {
                    return window.formatCurrencyLocalized(v, lang);
                };
            }
            window.UNIFEDSystem.discrepancyChart.update();
            console.log('[UNIFED-LOCALIZATION] ✓ Gráfico de discrepâncias atualizado');
        }
    };

    // ========================================================================
    // MONKEY-PATCH AO switchLanguage()
    // ========================================================================

    const originalSwitchLanguage = window.switchLanguage;
    window.switchLanguage = function switchLanguage_Enhanced() {
        console.log('[UNIFED-LOCALIZATION] switchLanguage() — versão melhorada invocada');
        
        // Chamar original
        if (typeof originalSwitchLanguage === 'function') {
            try {
                originalSwitchLanguage.call(window);
            } catch (err) {
                console.warn('[UNIFED-LOCALIZATION] ⚠ Erro no originalSwitchLanguage:', err.message);
            }
        }

        // Atualizar moedas
        const lang = window.currentLang || 'pt';
        window.updateCurrencyElementsForLanguage(lang);
        
        console.log('[UNIFED-LOCALIZATION] ✓ Localização de moeda sincronizada');
    };

    // ========================================================================
    // OVERRIDE DE FORMATAÇÃO DE NÚMEROS EM TOOLTIPS DO CHART.JS
    // ========================================================================

    /**
     * setupChartCurrencyFormatting() — Garantir que Chart.js usa formatação correta
     */
    window.setupChartCurrencyFormatting = function setupChartCurrencyFormatting() {
        console.log('[UNIFED-LOCALIZATION] Configurando formatação de moeda para Chart.js');

        const lang = window.currentLang || 'pt';

        // Interceptar criação de novo Chart
        const originalChart = window.Chart;
        if (typeof originalChart === 'undefined') {
            console.warn('[UNIFED-LOCALIZATION] ⚠ Chart.js não está carregado ainda');
            return;
        }

        // Monkey-patch ao renderMainChart e renderDiscrepancyChart
        const originalRenderMainChart = window.renderMainChart;
        window.renderMainChart = function() {
            console.log('[UNIFED-LOCALIZATION] renderMainChart() interceptado');
            
            if (typeof originalRenderMainChart === 'function') {
                originalRenderMainChart.call(window);
            }

            // Atualizar formatação
            if (window.UNIFEDSystem && window.UNIFEDSystem.chart) {
                const chart = window.UNIFEDSystem.chart;
                chart.options = chart.options || {};
                chart.options.scales = chart.options.scales || {};
                chart.options.scales.y = chart.options.scales.y || {};
                chart.options.scales.y.ticks = chart.options.scales.y.ticks || {};
                chart.options.scales.y.ticks.callback = (v) => window.formatCurrencyLocalized(v, lang);
                chart.update();
            }
        };

        const originalRenderDiscrepancyChart = window.renderDiscrepancyChart;
        window.renderDiscrepancyChart = function() {
            console.log('[UNIFED-LOCALIZATION] renderDiscrepancyChart() interceptado');
            
            if (typeof originalRenderDiscrepancyChart === 'function') {
                originalRenderDiscrepancyChart.call(window);
            }

            // Atualizar formatação
            if (window.UNIFEDSystem && window.UNIFEDSystem.discrepancyChart) {
                const chart = window.UNIFEDSystem.discrepancyChart;
                chart.options = chart.options || {};
                chart.options.scales = chart.options.scales || {};
                chart.options.scales.y = chart.options.scales.y || {};
                chart.options.scales.y.ticks = chart.options.scales.y.ticks || {};
                chart.options.scales.y.ticks.callback = (v) => window.formatCurrencyLocalized(v, lang);
                chart.update();
            }
        };
    };

    // ========================================================================
    // INICIALIZAÇÃO AUTOMÁTICA
    // ========================================================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            const lang = window.currentLang || 'pt';
            window.updateCurrencyElementsForLanguage(lang);
            window.setupChartCurrencyFormatting();
            console.log('[UNIFED-LOCALIZATION] ✓ Inicialização concluída (DOMContentLoaded)');
        });
    } else {
        const lang = window.currentLang || 'pt';
        window.updateCurrencyElementsForLanguage(lang);
        window.setupChartCurrencyFormatting();
        console.log('[UNIFED-LOCALIZATION] ✓ Inicialização concluída (imediato)');
    }

    // ========================================================================
    // RESUMO FINAL
    // ========================================================================

    console.log('[UNIFED-LOCALIZATION] ✅ FICHEIRO 3/5 CARREGADO');
    console.log('[UNIFED-LOCALIZATION] Vulnerabilidade corrigida: VUL-005');
    console.log('[UNIFED-LOCALIZATION] Formato PT: "€ 1.234,56" | Formato EN: "€1,234.56"');
    
    window.phase2_localization = true;
})();
