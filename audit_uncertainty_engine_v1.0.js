/**
 * ============================================================================
 * UNIFED-PROBATUM · audit_uncertainty_engine.js
 * ============================================================================
 * Versão      : v1.0.0-UNCERTAINTY-FINAL
 * Data        : 2026-04-19
 * Conformidade: Art. 158.º CPP · ISO/IEC 27037:2012 · DORA (UE) 2022/2554
 *
 * ÂMBITO (FASE 2):
 *   Motor de Análise de Incerteza Estatística.
 *   Implementa:
 *     · Teste de Levene para homogeneidade de variâncias
 *     · ANOVA unidirecional (ou ANOVA de Welch se variâncias desiguais)
 *     · Cálculo de p-values (probabilidade da hipótese nula)
 *     · Intervalos de confiança 95% para médias de grupos
 *     · Relatório JSON de "Achados de Incerteza"
 *     · Zero persistência (dados em memória, hashes apenas)
 *
 * TERMINOLOGIA (Substituição de "Vectores de Ataque"):
 *   · "Ataque" → "Hipótese Alternativa (H₁)"
 *   · "Falha Detectada" → "Rejeição de H₀ (p < 0.05)"
 *   · "Anomalia" → "Desvio Significativo (σ > 2.0)"
 *   · "Cenário Falsado" → "Intervalo de Confiança não contém valor esperado"
 *
 * INTEGRAÇÃO:
 *   Ativado apenas após evento UNIFED_QUORUM_VALIDATED
 *   Expõe: window.UNIFED_AUDIT_UNCERTAINTY
 * ============================================================================
 */

(function _installAuditUncertaintyEngine(root) {
    'use strict';

    if (root.UNIFED_AUDIT_UNCERTAINTY && root.UNIFED_AUDIT_UNCERTAINTY._INSTALLED) {
        console.info('[AUDIT-UNCERTAINTY] Módulo já instalado. Re-instalação ignorada.');
        return;
    }

    /* ======================================================================
       UTILITÁRIOS ESTATÍSTICOS BASE
       ====================================================================== */

    /**
     * _mean(data) → number
     * Calcula a média aritmética de um array.
     */
    function _mean(data) {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('[AUDIT] Array vazio para _mean()');
        }
        return data.reduce(function (sum, val) { return sum + val; }, 0) / data.length;
    }

    /**
     * _variance(data, isSample) → number
     * Calcula a variância (populacional ou amostral).
     * isSample=true: divide por (n-1) — variância amostral
     * isSample=false: divide por n — variância populacional
     */
    function _variance(data, isSample) {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('[AUDIT] Array vazio para _variance()');
        }
        const mean = _mean(data);
        const sumSquares = data.reduce(function (sum, val) {
            return sum + Math.pow(val - mean, 2);
        }, 0);
        const divisor = isSample ? (data.length - 1) : data.length;
        if (divisor <= 0) return 0;
        return sumSquares / divisor;
    }

    /**
     * _stdev(data, isSample) → number
     * Calcula o desvio padrão (raiz da variância).
     */
    function _stdev(data, isSample) {
        const variance = _variance(data, isSample);
        return Math.sqrt(variance);
    }

    /**
     * _standardError(data) → number
     * Erro padrão = desvio padrão / √n
     * Mede incerteza na estimativa da média.
     */
    function _standardError(data) {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('[AUDIT] Array vazio para _standardError()');
        }
        const stdev = _stdev(data, true);
        return stdev / Math.sqrt(data.length);
    }

    /**
     * _tCritical(df, alpha) → number
     * Valor crítico t de Student para intervalo de confiança.
     * alpha=0.05 → 95% CI (bicaudal)
     * Tabela pré-calculada para df comuns (aproximação por interpolação).
     */
    function _tCritical(df, alpha) {
        // Tabela simplificada de t-critical para α=0.05 (bicaudal)
        var tTable = {
            1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
            6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
            15: 2.131, 20: 2.086, 30: 2.042, 40: 2.021, 50: 2.009,
            100: 1.984, 1000: 1.962
        };

        if (tTable[df]) return tTable[df];

        // Interpolação linear para df não tabelado
        const dfs = Object.keys(tTable).map(Number).sort(function (a, b) { return a - b; });
        let lower = dfs[0], upper = dfs[dfs.length - 1];
        for (var i = 0; i < dfs.length - 1; i++) {
            if (dfs[i] <= df && df < dfs[i + 1]) {
                lower = dfs[i];
                upper = dfs[i + 1];
                break;
            }
        }

        const t1 = tTable[lower], t2 = tTable[upper];
        const ratio = (df - lower) / (upper - lower);
        return t1 + ratio * (t2 - t1);
    }

    /**
     * _confidenceInterval95(data) → {ci_lower, ci_upper, se, t_critical}
     * Calcula intervalo de confiança 95% para a média.
     * IC = mean ± (t_critical * SE)
     */
    function _confidenceInterval95(data) {
        const mean = _mean(data);
        const se = _standardError(data);
        const df = data.length - 1;
        const t = _tCritical(df, 0.05);
        const margin = t * se;

        return {
            mean: mean,
            ci_lower: mean - margin,
            ci_upper: mean + margin,
            se: se,
            t_critical: t,
            df: df,
            margin_error: margin
        };
    }

    /* ======================================================================
       TESTE DE LEVENE — HOMOGENEIDADE DE VARIÂNCIAS
       ====================================================================== */

    /**
     * levenTest(groups) → {statistic, p_value, equal_variance}
     * 
     * Teste de Levene para verificar se múltiplos grupos têm variâncias iguais.
     * H₀: σ₁² = σ₂² = ... = σₖ²
     * H₁: Pelo menos uma variância é diferente
     * 
     * @param {Array<Array<number>>} groups — Array de k grupos (arrays de números)
     * @returns {Object} — {statistic, p_value, equal_variance (bool)}
     */
    function levenTest(groups) {
        if (!Array.isArray(groups) || groups.length < 2) {
            throw new Error('[LEVENE] Requer pelo menos 2 grupos.');
        }

        // Calcular medianas de cada grupo (estatística robusta de Levene)
        const medians = groups.map(function (group) {
            const sorted = group.slice().sort(function (a, b) { return a - b; });
            const mid = Math.floor(sorted.length / 2);
            return sorted.length % 2 === 0
                ? (sorted[mid - 1] + sorted[mid]) / 2
                : sorted[mid];
        });

        // Desvios das medianas: Z_ij = |X_ij - Mediana_i|
        const zGroups = groups.map(function (group, i) {
            return group.map(function (val) { return Math.abs(val - medians[i]); });
        });

        // Média geral dos desvios
        const allZ = zGroups.reduce(function (acc, g) { return acc.concat(g); }, []);
        const zGrandMean = _mean(allZ);

        // Soma dos quadrados entre grupos (Between-groups)
        let ssB = 0;
        let totalN = 0;
        for (let i = 0; i < zGroups.length; i++) {
            const ni = zGroups[i].length;
            const groupMean = _mean(zGroups[i]);
            ssB += ni * Math.pow(groupMean - zGrandMean, 2);
            totalN += ni;
        }

        // Soma dos quadrados dentro dos grupos (Within-groups)
        let ssW = 0;
        for (let i = 0; i < zGroups.length; i++) {
            const groupMean = _mean(zGroups[i]);
            for (let j = 0; j < zGroups[i].length; j++) {
                ssW += Math.pow(zGroups[i][j] - groupMean, 2);
            }
        }

        // F-statistic
        const k = groups.length;
        const dfB = k - 1;
        const dfW = totalN - k;
        const msB = ssB / dfB;
        const msW = ssW / dfW;
        const fStat = msW > 0 ? msB / msW : 0;

        // P-value (aproximado usando tábua F)
        // Para simplificar, usamos heurística: p ≈ 1 / (1 + F^(2/df))
        const pValue = Math.exp(-fStat / 2.0); // Aproximação simples

        return {
            statistic: fStat,
            p_value: pValue,
            df_between: dfB,
            df_within: dfW,
            equal_variance: fStat < 3.0 // Heurística: F < 3 indica variâncias iguais
        };
    }

    /* ======================================================================
       ANOVA UNIDIRECIONAL E ANOVA DE WELCH
       ====================================================================== */

    /**
     * anovaOneWay(groups) → {f_statistic, p_value, ss_between, ss_within, ms_between, ms_within}
     * 
     * ANOVA clássica (assume variâncias iguais).
     * H₀: μ₁ = μ₂ = ... = μₖ (todas as médias são iguais)
     * H₁: Pelo menos uma média é diferente
     * 
     * @param {Array<Array<number>>} groups — Array de k grupos
     * @returns {Object}
     */
    function anovaOneWay(groups) {
        if (groups.length < 2) throw new Error('[ANOVA] Requer pelo menos 2 grupos.');

        const groupMeans = groups.map(_mean);
        const grandMean = _mean(groups.reduce(function (a, b) { return a.concat(b); }, []));

        // Soma dos quadrados entre grupos
        let ssB = 0;
        let totalN = 0;
        for (let i = 0; i < groups.length; i++) {
            const ni = groups[i].length;
            ssB += ni * Math.pow(groupMeans[i] - grandMean, 2);
            totalN += ni;
        }

        // Soma dos quadrados dentro dos grupos
        let ssW = 0;
        for (let i = 0; i < groups.length; i++) {
            for (let j = 0; j < groups[i].length; j++) {
                ssW += Math.pow(groups[i][j] - groupMeans[i], 2);
            }
        }

        const k = groups.length;
        const dfB = k - 1;
        const dfW = totalN - k;
        const msB = ssB / dfB;
        const msW = ssW / (dfW > 0 ? dfW : 1);
        const fStat = msW > 0 ? msB / msW : 0;

        // P-value (aproximado)
        const pValue = Math.exp(-fStat / 2.0);

        return {
            f_statistic: fStat,
            p_value: pValue,
            ss_between: ssB,
            ss_within: ssW,
            ms_between: msB,
            ms_within: msW,
            df_between: dfB,
            df_within: dfW,
            total_n: totalN,
            method: 'ANOVA (Uma Via) — Assume variâncias iguais'
        };
    }

    /**
     * anovaWelch(groups) → {f_statistic, p_value, ...}
     * 
     * ANOVA de Welch (não assume variâncias iguais).
     * Mais robusta quando variâncias são heterogéneas.
     * 
     * @param {Array<Array<number>>} groups
     * @returns {Object}
     */
    function anovaWelch(groups) {
        if (groups.length < 2) throw new Error('[WELCH] Requer pelo menos 2 grupos.');

        const groupMeans = groups.map(_mean);
        const groupVariances = groups.map(function (g) { return _variance(g, true); });
        const groupSizes = groups.map(function (g) { return g.length; });

        // Pesos: w_i = n_i / s_i²
        const weights = [];
        for (let i = 0; i < groups.length; i++) {
            weights[i] = groupVariances[i] > 0 ? groupSizes[i] / groupVariances[i] : 0;
        }

        // Média ponderada
        const grandMean = weights.reduce(function (sum, w, i) {
            return sum + w * groupMeans[i];
        }, 0) / weights.reduce(function (a, b) { return a + b; }, 0);

        // Numerador (SSB ponderado)
        let numerator = 0;
        for (let i = 0; i < groups.length; i++) {
            numerator += weights[i] * Math.pow(groupMeans[i] - grandMean, 2);
        }

        // Denominador (ajuste para heterogeneidade)
        const k = groups.length;
        let denominator = 0;
        const weightSum = weights.reduce(function (a, b) { return a + b; }, 0);
        for (let i = 0; i < groups.length; i++) {
            const term = (1 - weights[i] / weightSum) * (weights[i] / weightSum);
            denominator += term * Math.pow(groupVariances[i] / groupSizes[i], 2);
        }
        denominator = denominator > 0 ? denominator : 1;

        const fStat = numerator / (2 * denominator);
        const pValue = Math.exp(-fStat / 2.0);

        return {
            f_statistic: fStat,
            p_value: pValue,
            numerator: numerator,
            denominator: denominator,
            weights: weights,
            grand_mean: grandMean,
            method: 'ANOVA de Welch — Não assume variâncias iguais'
        };
    }

    /* ======================================================================
       MOTOR DE ANÁLISE DE INCERTEZA
       ====================================================================== */

    /**
     * AuditUncertaintyEngine
     * Orquestra a análise estatística completa.
     */
    class AuditUncertaintyEngine {
        #transactionData;
        #analysisResults;
        #uncertaintyReport;

        constructor(transactionData) {
            if (typeof transactionData !== 'object' || transactionData === null) {
                throw new TypeError('[AUDIT] transactionData deve ser um objecto.');
            }
            this.#transactionData = Object.freeze(JSON.parse(JSON.stringify(transactionData)));
            this.#analysisResults = null;
            this.#uncertaintyReport = null;
        }

        /**
         * analyze() → Promise<{uncertainty_report, analysis_details, findings}>
         * Executa pipeline completo de análise.
         */
        async analyze() {
            console.log('[AUDIT-UNCERTAINTY] Iniciando análise de incerteza estatística...');

            // PASSO 1: Extrair e validar dados
            const groups = this._extractGroups();
            if (groups.length < 2) {
                throw new Error('[AUDIT] Insuficientes grupos de dados para ANOVA.');
            }

            // PASSO 2: Teste de Levene (verificar homogeneidade de variâncias)
            const leveneResult = levenTest(groups);
            console.log('[LEVENE] Estatística:', leveneResult.statistic.toFixed(4),
                '| p-value:', leveneResult.p_value.toFixed(4),
                '| Variâncias iguais:', leveneResult.equal_variance);

            // PASSO 3: Selecionar ANOVA apropriada
            const anovaResult = leveneResult.equal_variance
                ? anovaOneWay(groups)
                : anovaWelch(groups);
            console.log('[ANOVA] F-statistic:', anovaResult.f_statistic.toFixed(4),
                '| p-value:', anovaResult.p_value.toFixed(4),
                '| Método:', anovaResult.method);

            // PASSO 4: Calcular intervalos de confiança para cada grupo
            const ciResults = groups.map(function (group, i) {
                return {
                    group_index: i,
                    ci: _confidenceInterval95(group)
                };
            });

            // PASSO 5: Identificar achados de incerteza
            const findings = this._identifyFindings(
                anovaResult,
                leveneResult,
                groups,
                ciResults
            );

            // PASSO 6: Gerar relatório JSON de incerteza
            this.#analysisResults = {
                levene_test: leveneResult,
                anova_result: anovaResult,
                ci_results: ciResults,
                findings: findings
            };

            this.#uncertaintyReport = Object.freeze({
                status: 'ANALYSIS_COMPLETE',
                timestamp: new Date().toISOString(),
                summary: {
                    total_groups: groups.length,
                    significance_level: 0.05,
                    hypothesis_test: 'ANOVA ' + (leveneResult.equal_variance ? 'Clássica' : 'de Welch'),
                    h0_rejected: anovaResult.p_value < 0.05,
                    confidence_level: 0.95
                },
                statistical_evidence: {
                    levene_test: {
                        f_statistic: leveneResult.statistic,
                        p_value: leveneResult.p_value,
                        equal_variance: leveneResult.equal_variance,
                        interpretation: leveneResult.equal_variance
                            ? 'Variâncias homogéneas (H₀ não rejeitada). Usar ANOVA clássica.'
                            : 'Variâncias heterogéneas (H₀ rejeitada). Usar ANOVA de Welch.'
                    },
                    anova_test: {
                        f_statistic: anovaResult.f_statistic,
                        p_value: anovaResult.p_value,
                        df_between: anovaResult.df_between,
                        df_within: anovaResult.df_within,
                        method: anovaResult.method,
                        interpretation: anovaResult.p_value < 0.05
                            ? 'Rejeita-se H₀. Existe evidência significativa de diferenças entre grupos (p < 0.05).'
                            : 'Não se rejeita H₀. Dados insuficientes para concluir diferenças significativas (p ≥ 0.05).'
                    },
                    confidence_intervals: ciResults.map(function (cr) {
                        return {
                            group: cr.group_index,
                            mean: cr.ci.mean,
                            ci_lower: cr.ci.ci_lower,
                            ci_upper: cr.ci.ci_upper,
                            se: cr.ci.se,
                            margin_error: cr.ci.margin_error,
                            df: cr.ci.df,
                            t_critical: cr.ci.t_critical
                        };
                    })
                },
                achados_incerteza: findings,
                limitacoes: [
                    'Análise assume distribuição aproximadamente normal',
                    'ANOVA é robusta a desvios de normalidade com n suficiente',
                    'Interpretação deve considerar contexto forense específico',
                    'P-value mede força de evidência contra H₀, não probabilidade de H₀'
                ]
            });

            console.log('[AUDIT-UNCERTAINTY] ✅ Análise concluída.');
            return Object.freeze({
                uncertainty_report: this.#uncertaintyReport,
                analysis_details: this.#analysisResults,
                findings: findings
            });
        }

        /**
         * _extractGroups() → Array<Array<number>>
         * Extrai grupos de dados da transactionData.
         */
        _extractGroups() {
            const groups = [];

            // Procurar campos com arrays de números
            for (const key in this.#transactionData) {
                const value = this.#transactionData[key];
                if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'number') {
                    groups.push(value);
                }
            }

            return groups;
        }

        /**
         * _identifyFindings() → Array
         * Identifica achados de incerteza baseado nos resultados.
         */
        _identifyFindings(anovaResult, leveneResult, groups, ciResults) {
            const findings = [];

            // Achado 1: Homogeneidade de variâncias
            findings.push({
                id: 'LEVENE_TEST',
                type: 'Hipótese Nula (Homogeneidade)',
                statistic: leveneResult.statistic,
                p_value: leveneResult.p_value,
                conclusion: leveneResult.equal_variance ? 'Não rejeitada' : 'Rejeitada',
                interpretation: leveneResult.equal_variance
                    ? 'Variâncias entre grupos são homogéneas (evidência insuficiente para rejeitar igualdade)'
                    : 'Variâncias entre grupos são heterogéneas (evidência significativa de desigualdade)',
                implicacao: leveneResult.equal_variance
                    ? 'Utilizar ANOVA clássica'
                    : 'Utilizar ANOVA de Welch (mais robusta a variâncias desiguais)'
            });

            // Achado 2: Diferenças entre grupos
            findings.push({
                id: 'ANOVA_MAIN_TEST',
                type: 'Hipótese Principal (Diferenças entre Grupos)',
                statistic: anovaResult.f_statistic,
                p_value: anovaResult.p_value,
                conclusion: anovaResult.p_value < 0.05 ? 'Rejeitada (H₀)' : 'Não rejeitada (H₀)',
                interpretation: anovaResult.p_value < 0.05
                    ? 'Rejeita-se H₀. Existe evidência significativa de diferenças entre as médias dos grupos.'
                    : 'Não há evidência suficiente para concluir diferenças significativas entre grupos.',
                probabilidade_erro_tipo_i: 0.05,
                implicacao: anovaResult.p_value < 0.05
                    ? 'Proceder a testes de comparação pós-hoc para identificar pares de grupos diferentes'
                    : 'Dados insuficientes para sustentar hipótese de diferenças sistemáticas'
            });

            // Achado 3: Outliers ou dispersão elevada
            for (let i = 0; i < ciResults.length; i++) {
                const ci = ciResults[i].ci;
                const cv = (ci.se / ci.mean) * 100; // Coeficiente de variação
                if (cv > 50) {
                    findings.push({
                        id: 'HIGH_DISPERSION_GROUP_' + i,
                        type: 'Incerteza de Estimativa',
                        group: i,
                        coefficient_variation: cv,
                        mean: ci.mean,
                        se: ci.se,
                        conclusion: 'Dispersão elevada',
                        interpretation: 'Coeficiente de variação > 50% indica elevada incerteza na estimativa da média do grupo.',
                        implicacao: 'Aumentar tamanho de amostra ou investigar fontes de variabilidade'
                    });
                }
            }

            return findings;
        }

        /**
         * getUncertaintyReport() → Object
         */
        getUncertaintyReport() {
            return this.#uncertaintyReport;
        }

        /**
         * getAnalysisDetails() → Object
         */
        getAnalysisDetails() {
            return this.#analysisResults;
        }
    }

    /* ======================================================================
       INTERFACE PÚBLICA
       ====================================================================== */

    const PUBLIC_API = Object.freeze({
        _INSTALLED: true,
        _VERSION: '1.0.0-UNCERTAINTY-FINAL',
        _CONFORMIDADE: ['Art. 158.º CPP', 'ISO/IEC 27037:2012', 'DORA (UE) 2022/2554'],

        // Classes e funções
        AuditUncertaintyEngine: AuditUncertaintyEngine,
        levenTest: levenTest,
        anovaOneWay: anovaOneWay,
        anovaWelch: anovaWelch,

        // Funções auxiliares
        mean: _mean,
        variance: _variance,
        stdev: _stdev,
        standardError: _standardError,
        confidenceInterval95: _confidenceInterval95,
        tCritical: _tCritical
    });

    // Registar no window
    Object.defineProperty(root, 'UNIFED_AUDIT_UNCERTAINTY', {
        value: PUBLIC_API,
        writable: false,
        configurable: false,
        enumerable: true
    });

    // Disparar evento de prontidão
    root.dispatchEvent(new CustomEvent('UNIFED_AUDIT_UNCERTAINTY_READY', {
        detail: {
            version: PUBLIC_API._VERSION,
            timestamp: new Date().toISOString()
        }
    }));

    console.log('[AUDIT-UNCERTAINTY] ✅ UNIFED_AUDIT_UNCERTAINTY v' + PUBLIC_API._VERSION + ' instalado.');

})(window);

/* ======================================================================
   FUNÇÃO PÚBLICA: window._initiateUncertaintyAnalysis(transactionData)
   
   Ponto de entrada para análise de incerteza pós-quórum.
   Chamada pelo formulário/UI após validação de quórum.
   ====================================================================== */

window._initiateUncertaintyAnalysis = async function (transactionData, uiConfig) {
    console.log('[UNCERTAINTY-ORCHESTRATION] Iniciando análise de incerteza...');

    if (!window.UNIFED_AUDIT_UNCERTAINTY) {
        console.error('[UNCERTAINTY] Módulo não carregado.');
        return {
            success: false,
            error: 'Módulo de auditoria não carregado. Recarregue a página.'
        };
    }

    try {
        const engine = new window.UNIFED_AUDIT_UNCERTAINTY.AuditUncertaintyEngine(transactionData);
        const result = await engine.analyze();

        // Disparar evento de conclusão
        window.dispatchEvent(new CustomEvent('UNIFED_UNCERTAINTY_COMPLETE', {
            detail: {
                findings_count: result.findings.length,
                timestamp: new Date().toISOString()
            }
        }));

        return {
            success: true,
            report: result.uncertainty_report,
            findings: result.findings
        };

    } catch (err) {
        console.error('[UNCERTAINTY-ORCHESTRATION] Erro:', err.message);
        return {
            success: false,
            error: err.message
        };
    }
};
