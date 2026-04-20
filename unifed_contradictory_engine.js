/**
 * ============================================================================
 * UNIFED-PROBATUM · unifed_contradictory_engine.js
 * ============================================================================
 * Versão      : v1.0.0-CONTRADICTORY
 * Gerado em   : 2026-04-19
 * Conformidade: DORA (UE) 2022/2554 · Art. 125.º CPP · ISO/IEC 27037:2012
 *               Lei n.º 45/2018 (AMT) · DAC7 (UE) 2021/514 · Art. 74 LGT
 *
 * ÂMBITO (FASE 2):
 *   Motor Algorítmico de Contraditório e Auto-Reconciliação Forense.
 *   Implementa:
 *     · Simulador de Contraditório (árvore de decisão binária)
 *     · Detector de Silêncio Algorítmico (anomalias temporais em time-series)
 *     · Gerador de 5 Vectores de Ataque Dialéctico
 *     · Matriz de Complexidade DAC7 (Níveis 1-5)
 *     · Módulo de Auto-Reconciliação com instigação forense LGT
 *
 * DEPENDÊNCIAS:
 *   · window.UNIFED_CUSTODY (FASE 1) — deve estar instalado previamente.
 *
 * ARQUITECTURA:
 *   Zero poluição do escopo global. Expõe apenas:
 *     · window.UNIFED_CONTRADICTORY — namespace selado (Object.freeze)
 *   Modo Read-Only absoluto — nenhuma API externa é consultada.
 * ============================================================================
 */

(function _installContradictoryEngine(root) {
    'use strict';

    /* ── Guarda de idempotência ─────────────────────────────────────────── */
    if (root.UNIFED_CONTRADICTORY && root.UNIFED_CONTRADICTORY._INSTALLED === true) {
        console.info('[CONTRADICTORY] Módulo já instalado. Ignorando.');
        return;
    }

    /* ── Verificação de dependência (FASE 1) ────────────────────────────── */
    function _waitForCustody(callback) {
        if (root.UNIFED_CUSTODY && root.UNIFED_CUSTODY._INSTALLED) {
            callback();
        } else {
            root.addEventListener('UNIFED_CUSTODY_READY', callback, { once: true });
        }
    }

    /* ======================================================================
       SECÇÃO 1 — DETECTOR DE SILÊNCIO ALGORÍTMICO
       ====================================================================== */

    /**
     * SilenceAlgorithmDetector
     * Detecta padrões de silêncio (interrupções anómalas) em séries temporais
     * de transacções financeiras.
     *
     * DEFINIÇÃO DE SILÊNCIO ALGORÍTMICO:
     *   Gap temporal ≥ μ + k·σ onde:
     *     μ = média dos intervalos inter-evento
     *     σ = desvio padrão
     *     k = factor de sensibilidade (default k=2.576 → p=0.01)
     */
    class SilenceAlgorithmDetector {
        #_series;
        #_k;

        constructor(timeSeries, sensitivityK = 2.576) {
            if (!Array.isArray(timeSeries) || timeSeries.length < 3) {
                throw new RangeError('[SILENCE] Série temporal requer mínimo de 3 eventos.');
            }
            /* Ordenar por timestamp (epoch ms) */
            this.#_series = timeSeries
                .map(function (ev) {
                    const ts = typeof ev.timestamp === 'string'
                        ? new Date(ev.timestamp).getTime()
                        : Number(ev.timestamp);
                    return { ...ev, _epoch: ts };
                })
                .sort(function (a, b) { return a._epoch - b._epoch; });
            this.#_k = sensitivityK;
        }

        /**
         * _computeIntervals() → Array<number>
         * Retorna intervalos em milissegundos entre eventos consecutivos.
         */
        #_computeIntervals() {
            const intervals = [];
            for (let i = 1; i < this.#_series.length; i++) {
                intervals.push(this.#_series[i]._epoch - this.#_series[i - 1]._epoch);
            }
            return intervals;
        }

        /**
         * _stats(arr) → {mean, std, min, max}
         */
        #_stats(arr) {
            const n    = arr.length;
            const mean = arr.reduce(function (s, v) { return s + v; }, 0) / n;
            const variance = arr.reduce(function (s, v) { return s + Math.pow(v - mean, 2); }, 0) / n;
            const std  = Math.sqrt(variance);
            return {
                mean:   Math.round(mean),
                std:    Math.round(std),
                min:    Math.min(...arr),
                max:    Math.max(...arr),
                n
            };
        }

        /**
         * detect() → SilenceReport
         * Identifica todos os gaps ≥ μ + k·σ e classifica a sua gravidade forense.
         * @returns {Object}
         */
        detect() {
            const intervals = this.#_computeIntervals();
            const stats     = this.#_stats(intervals);
            const threshold = stats.mean + this.#_k * stats.std;

            const anomalies = [];
            for (let i = 0; i < intervals.length; i++) {
                if (intervals[i] >= threshold) {
                    const beforeEvent = this.#_series[i];
                    const afterEvent  = this.#_series[i + 1];
                    const gapHours    = intervals[i] / 3_600_000;
                    const zScore      = (intervals[i] - stats.mean) / (stats.std || 1);

                    anomalies.push(Object.freeze({
                        seq:            i + 1,
                        gap_ms:         intervals[i],
                        gap_hours:      Math.round(gapHours * 100) / 100,
                        z_score:        Math.round(zScore * 1000) / 1000,
                        before_ts:      beforeEvent.timestamp || new Date(beforeEvent._epoch).toISOString(),
                        after_ts:       afterEvent.timestamp  || new Date(afterEvent._epoch).toISOString(),
                        before_amount:  beforeEvent.amount  || null,
                        after_amount:   afterEvent.amount   || null,
                        severity:       zScore > 4 ? 'CRÍTICO' : zScore > 3 ? 'ALTO' : 'MODERADO',
                        forensic_flag:  'SILÊNCIO_ALGORÍTMICO_' + (i + 1).toString().padStart(3, '0')
                    }));
                }
            }

            return Object.freeze({
                total_events:      this.#_series.length,
                total_intervals:   intervals.length,
                threshold_ms:      Math.round(threshold),
                threshold_hours:   Math.round(threshold / 3_600_000 * 100) / 100,
                stats,
                anomalies_count:   anomalies.length,
                anomalies,
                timestamp:         new Date().toISOString()
            });
        }
    }

    /* ======================================================================
       SECÇÃO 2 — ÁRVORE DE DECISÃO PARA CONTRADITÓRIO
       ====================================================================== */

    /**
     * DecisionNode
     * Nó interno da árvore de decisão binária.
     * Cada nó avalia um predicado sobre o estado forense.
     */
    class DecisionNode {
        constructor(id, predicate, trueChild, falseChild, label) {
            this.id          = id;
            this.predicate   = predicate;   // function(state) → boolean
            this.trueChild   = trueChild;   // DecisionNode | LeafNode
            this.falseChild  = falseChild;  // DecisionNode | LeafNode
            this.label       = label;
        }

        evaluate(state) {
            const result = this.predicate(state);
            const next   = result ? this.trueChild : this.falseChild;
            return next ? next.evaluate(state) : { node: this.id, result };
        }
    }

    /**
     * LeafNode
     * Folha da árvore — contém o vetor de ataque dialéctico.
     */
    class LeafNode {
        constructor(id, vector) {
            this.id     = id;
            this.vector = vector; // AttackVector
        }

        evaluate(_state) {
            return { node: this.id, vector: this.vector };
        }
    }

    /* ======================================================================
       SECÇÃO 3 — SIMULADOR DE CONTRADITÓRIO
       ====================================================================== */

    /**
     * ContradictorySimulator
     * Ingere o estado forense, executa a árvore de decisão e
     * retorna os 5 vectores de ataque dialéctico mais relevantes.
     */
    class ContradictorySimulator {
        #_tree;
        #_vectorLibrary;

        constructor() {
            this.#_vectorLibrary = _buildVectorLibrary();
            this.#_tree          = _buildDecisionTree(this.#_vectorLibrary);
        }

        /**
         * simulate(forensicState) → Promise<SimulationResult>
         * @param {Object} forensicState — estado normalizado do caso
         * @returns {Promise<Object>}
         */
        async simulate(forensicState) {
            if (!forensicState || typeof forensicState !== 'object') {
                throw new TypeError('[CONTRADICTORY] forensicState inválido.');
            }

            const normalised = _normaliseState(forensicState);
            const topVectors = _rankVectors(normalised, this.#_vectorLibrary);
            const treeResult = this.#_tree.evaluate(normalised);

            /* Análise de silêncio se time-series disponível */
            let silenceReport = null;
            if (Array.isArray(normalised.timeSeries) && normalised.timeSeries.length >= 3) {
                const detector = new SilenceAlgorithmDetector(normalised.timeSeries);
                silenceReport  = detector.detect();
            }

            return Object.freeze({
                vectores_ataque:     topVectors.slice(0, 5),
                tree_path:           treeResult,
                silence_report:      silenceReport,
                estado_normalizado:  { ...normalised, timeSeries: undefined }, // omitir dados brutos
                timestamp:           new Date().toISOString()
            });
        }
    }

    /**
     * _normaliseState(raw) → NormalisedState
     * Normaliza o estado bruto extraindo métricas quantitativas relevantes.
     */
    function _normaliseState(raw) {
        return {
            discrepanciaTotal:    Number(raw.discrepanciaTotal   || raw.gap_total   || 0),
            discrepanciaPct:      Number(raw.discrepanciaPct     || raw.gap_pct     || 0),
            transacoesTotal:      Number(raw.transacoesTotal     || raw.tx_count    || 0),
            periodoMeses:         Number(raw.periodoMeses        || raw.period_months || 12),
            plataformasCount:     Number(raw.plataformasCount    || raw.platforms    || 1),
            categoriasCount:      Number(raw.categoriasCount     || raw.categories   || 1),
            temSilencioAnomalo:   Boolean(raw.temSilencioAnomalo || false),
            timeSeries:           Array.isArray(raw.timeSeries) ? raw.timeSeries : [],
            normaAplicavel:       String(raw.normaAplicavel      || 'DAC7'),
            valorReferenciaEur:   Number(raw.valorReferenciaEur  || 2_000)
        };
    }

    /**
     * _buildVectorLibrary() → Array<AttackVector>
     * Biblioteca de vectores de ataque dialéctico pré-compilados.
     */
    function _buildVectorLibrary() {
        return [
            {
                id:         'VEC-DISC-01',
                titulo:     'Discrepância Quantitativa DAC7 vs. Declaração Espontânea',
                descricao:  'Questionar o arguido sobre a omissão de rendimentos digitais face ao limiar DAC7 (€ 2.000/ano ou ≥ 30 transacções). Solicitar reconciliação item-a-item.',
                norma:      'Art. 74 LGT · Directiva DAC7 (UE) 2021/514 · Art. 63.º-D CPPT',
                predicado:  function (s) { return s.discrepanciaTotal > 0; },
                peso:       function (s) { return Math.min(s.discrepanciaPct / 10, 10); }
            },
            {
                id:         'VEC-SILE-02',
                titulo:     'Silêncio Algorítmico e Interrupção Dolosa da Cadeia Temporal',
                descricao:  'Os gaps temporais identificados (Z-score > 2.576) configuram interrupção estatisticamente anómala. O contraditório deve incidir sobre a causa documentada dos hiatos.',
                norma:      'Art. 125.º CPP · Art. 116.º RGIT (Fraude Fiscal)',
                predicado:  function (s) { return s.temSilencioAnomalo; },
                peso:       function (s) { return s.temSilencioAnomalo ? 9 : 1; }
            },
            {
                id:         'VEC-PLAT-03',
                titulo:     'Dispersão de Plataformas como Mecanismo de Fragmentação',
                descricao:  'A distribuição de actividade por múltiplas plataformas (n=' + '#{n}' + ') configura potencial estratégia de fragmentação deliberada para evitar o reporting automático DAC7.',
                norma:      'Art. 87.º-A LGT (Manifestações de Fortuna) · DAC7 Art. 8ac.º',
                predicado:  function (s) { return s.plataformasCount >= 3; },
                peso:       function (s) { return Math.min(s.plataformasCount * 1.5, 10); }
            },
            {
                id:         'VEC-CATG-04',
                titulo:     'Classificação Categorial Inconsistente com Natureza Económica',
                descricao:  'O número de categorias distintas (n=' + '#{n}' + ') indica actividade económica estruturada incompatível com rendimento ocasional (categoria H vs. categoria B IRS).',
                norma:      'Art. 3.º CIRS (Rendimentos Empresariais) · Art. 28.º CIRS',
                predicado:  function (s) { return s.categoriasCount >= 4; },
                peso:       function (s) { return Math.min(s.categoriasCount * 1.2, 10); }
            },
            {
                id:         'VEC-PERI-05',
                titulo:     'Validação do Vector BTOR perante Período Temporal Estendido',
                descricao:  'A análise abrange ' + '#{n}' + ' meses consecutivos. O vector BTOR (Base-To-Outcome Ratio) indica padrão sistemático incompatível com actividade fortuita. Solicitar extractos bancários do período.',
                norma:      'Art. 74 LGT · Art. 89.º-A LGT · Art. 75.º LGT (Inversão do Ónus)',
                predicado:  function (s) { return s.periodoMeses >= 12 && s.transacoesTotal >= 30; },
                peso:       function (s) {
                    const btor = s.periodoMeses > 0 ? s.transacoesTotal / s.periodoMeses : 0;
                    return Math.min(btor * 0.5, 10);
                }
            }
        ];
    }

    /**
     * _rankVectors(state, library) → Array<RankedVector>
     * Ordena os vectores por peso decrescente dado o estado actual.
     */
    function _rankVectors(state, library) {
        return library
            .map(function (v) {
                const score = v.predicado(state) ? v.peso(state) : v.peso(state) * 0.3;
                const descricaoFormatada = v.descricao
                    .replace('#{n}', String(state.plataformasCount || state.categoriasCount || state.periodoMeses));
                return {
                    id:           v.id,
                    titulo:       v.titulo,
                    descricao:    descricaoFormatada,
                    norma:        v.norma,
                    score:        Math.round(score * 100) / 100,
                    activado:     v.predicado(state)
                };
            })
            .sort(function (a, b) { return b.score - a.score; });
    }

    /**
     * _buildDecisionTree(vectors) → DecisionNode (root)
     * Constrói a árvore de decisão binária para navegação dialéctica.
     */
    function _buildDecisionTree(vectors) {
        /* Folhas */
        const leaf_disc  = new LeafNode('LEAF-DISC',  vectors[0]);
        const leaf_sile  = new LeafNode('LEAF-SILE',  vectors[1]);
        const leaf_plat  = new LeafNode('LEAF-PLAT',  vectors[2]);
        const leaf_catg  = new LeafNode('LEAF-CATG',  vectors[3]);
        const leaf_btor  = new LeafNode('LEAF-BTOR',  vectors[4]);

        /* Nível 3 */
        const node_catg = new DecisionNode(
            'NODE-CATG',
            function (s) { return s.categoriasCount >= 4; },
            leaf_catg, leaf_btor,
            'Categorias ≥ 4?'
        );

        /* Nível 2 */
        const node_plat = new DecisionNode(
            'NODE-PLAT',
            function (s) { return s.plataformasCount >= 3; },
            leaf_plat, node_catg,
            'Plataformas ≥ 3?'
        );
        const node_sile = new DecisionNode(
            'NODE-SILE',
            function (s) { return s.temSilencioAnomalo; },
            leaf_sile, node_plat,
            'Silêncio Anómalo?'
        );

        /* Nível 1 (root) */
        const root_node = new DecisionNode(
            'NODE-ROOT',
            function (s) { return s.discrepanciaTotal > 500; },
            node_sile, leaf_disc,
            'Discrepância > € 500?'
        );

        return root_node;
    }

    /* ======================================================================
       SECÇÃO 4 — MÓDULO DE AUTO-RECONCILIAÇÃO DAC7
       ====================================================================== */

    /**
     * DAC7Reconciler
     * Implementa a matriz de complexidade de features DAC7 (Níveis 1-5)
     * e gera instigações forenses para cada discrepância identificada.
     */
    class DAC7Reconciler {
        #_discrepancias;
        #_matrix;

        constructor(discrepancias) {
            if (!Array.isArray(discrepancias)) {
                throw new TypeError('[DAC7] discrepancias deve ser array de objectos de discrepância.');
            }
            this.#_discrepancias = discrepancias;
            this.#_matrix        = _buildComplexityMatrix();
        }

        /**
         * reconcile() → Promise<ReconciliationReport>
         * Itera sobre discrepâncias, classifica por nível de complexidade
         * e gera instigações forenses.
         * @returns {Promise<Array<string>>} — array estrito de strings forenses
         */
        async reconcile() {
            const instigacoes = [];

            for (const disc of this.#_discrepancias) {
                const nivel = _classifyComplexity(disc, this.#_matrix);
                const str   = _generateInstigacaoForense(disc, nivel);
                instigacoes.push(str);
            }

            /* Instigação global de reconciliação */
            const totalDisc = this.#_discrepancias
                .reduce(function (s, d) { return s + (Number(d.montante) || 0); }, 0);

            if (totalDisc > 0) {
                instigacoes.push(
                    'Reconciliação Global DAC7: montante total de discrepância = € ' +
                    totalDisc.toFixed(2) +
                    ' excede o limiar de reporte automático. ' +
                    'Validar perante Art. 8ac.º DAC7 e Art. 74.º LGT.'
                );
            }

            return Object.freeze(instigacoes);
        }

        /**
         * getMatrix() → ComplexityMatrix
         * Expõe a matriz de complexidade (Read-Only).
         */
        getMatrix() { return Object.freeze(this.#_matrix); }
    }

    /**
     * _buildComplexityMatrix() → Array<ComplexityLevel>
     * Define os 5 níveis de complexidade DAC7.
     */
    function _buildComplexityMatrix() {
        return [
            {
                nivel: 1,
                label: 'SIMPLES',
                descricao: 'Transacção única, plataforma única, categoria única, sem cruzamento de dados.',
                criterios: { montante_max: 200, plataformas_max: 1, categorias_max: 1 },
                norma: 'DAC7 Art. 8ac.º § 1'
            },
            {
                nivel: 2,
                label: 'MODERADO',
                descricao: 'Múltiplas transacções, plataforma única, até 2 categorias.',
                criterios: { montante_max: 1_000, plataformas_max: 1, categorias_max: 2 },
                norma: 'DAC7 Art. 8ac.º § 2 · Art. 74.º LGT'
            },
            {
                nivel: 3,
                label: 'COMPLEXO',
                descricao: 'Múltiplas plataformas (2-3), múltiplas categorias, possível actividade estruturada.',
                criterios: { montante_max: 5_000, plataformas_max: 3, categorias_max: 4 },
                norma: 'Art. 74.º LGT · Art. 87.º-A LGT · DAC7 § 3'
            },
            {
                nivel: 4,
                label: 'CRÍTICO',
                descricao: 'Dispersão > 3 plataformas, gaps temporais anómalos, categorias heterogéneas.',
                criterios: { montante_max: 20_000, plataformas_max: 5, categorias_max: 8 },
                norma: 'Art. 89.º-A LGT (Métodos Indirectos) · Art. 116.º RGIT'
            },
            {
                nivel: 5,
                label: 'SISTÉMICO',
                descricao: 'Actividade económica estruturada com indícios de organização deliberada e omissão continuada.',
                criterios: { montante_max: Infinity, plataformas_max: Infinity, categorias_max: Infinity },
                norma: 'Art. 103.º CPP (Busca e Apreensão) · Art. 257.º CP (Falsificação) · RGIT Art. 103.º'
            }
        ];
    }

    /**
     * _classifyComplexity(discrepancia, matrix) → ComplexityLevel
     */
    function _classifyComplexity(disc, matrix) {
        const montante    = Number(disc.montante    || 0);
        const plataformas = Number(disc.plataformas || 1);
        const categorias  = Number(disc.categorias  || 1);

        for (let i = matrix.length - 1; i >= 0; i--) {
            const crit = matrix[i].criterios;
            if (montante    <= crit.montante_max &&
                plataformas <= crit.plataformas_max &&
                categorias  <= crit.categorias_max) {
                return matrix[i];
            }
        }
        return matrix[matrix.length - 1]; // fallback: SISTÉMICO
    }

    /**
     * _generateInstigacaoForense(disc, nivel) → string
     * Gera string de instigação forense estrita para junção aos autos.
     */
    function _generateInstigacaoForense(disc, nivel) {
        const id  = disc.id        || 'DISC-' + String(Math.random()).slice(2, 7);
        const val = Number(disc.montante || 0).toFixed(2);
        const src = disc.fonte     || 'Fonte não especificada';
        const prd = disc.periodo   || 'Período não especificado';

        const templates = {
            1: 'Verificação de declaração espontânea [{id}]: montante € {val} (fonte: {src}, período: {prd}). Solicitar comprovativos de pagamento (Art. 74 LGT).',
            2: 'Reconciliação DAC7 [{id}]: discrepância de € {val} em {src} ({prd}). Validação do vector BTOR perante Art. 74 LGT. Requerer extractos de plataforma certificados.',
            3: 'Análise de dispersão [{id}]: € {val} distribuídos por múltiplas plataformas ({src}). Verificar limiar agregado DAC7 (€ 2.000/anuais). Norma: DAC7 Art. 8ac.º · Art. 87.º-A LGT.',
            4: 'Indício de fragmentação estruturada [{id}]: € {val} com padrão de dispersão anómalo ({src}, {prd}). Aplicar Art. 89.º-A LGT (avaliação indirecta). Considerar reporte AT/DCIAP.',
            5: 'Actividade económica sistémica [{id}]: € {val} — configuração de omissão continuada ({src}). Instaurar procedimento de inspecção tributária. Norma: Art. 103.º RGIT · Art. 103.º CPP.'
        };

        return templates[nivel.nivel]
            .replace('{id}',  id)
            .replace('{val}', val)
            .replace('{src}', src)
            .replace('{prd}', prd)
            + ' [NÍVEL-' + nivel.nivel + ': ' + nivel.label + ' · ' + nivel.norma + ']';
    }

    /* ======================================================================
       SECÇÃO 5 — TIME-SERIES ANALYSER (6-month projection)
       ====================================================================== */

    /**
     * TimeSeriesAnalyser
     * Analisa uma série temporal financeira e projecta os próximos 6 meses
     * usando regressão linear simples (OLS).
     */
    class TimeSeriesAnalyser {
        #_data;

        constructor(monthlyData) {
            /* monthlyData: Array<{month: string, amount: number}> */
            if (!Array.isArray(monthlyData) || monthlyData.length < 2) {
                throw new RangeError('[TIMESERIES] Mínimo de 2 pontos mensais necessários.');
            }
            this.#_data = monthlyData.slice();
        }

        /**
         * _olsRegression(x, y) → {slope, intercept, r2}
         * Regressão linear OLS (Ordinary Least Squares).
         */
        #_olsRegression(x, y) {
            const n     = x.length;
            const sumX  = x.reduce(function (s, v) { return s + v; }, 0);
            const sumY  = y.reduce(function (s, v) { return s + v; }, 0);
            const sumXY = x.reduce(function (s, v, i) { return s + v * y[i]; }, 0);
            const sumX2 = x.reduce(function (s, v) { return s + v * v; }, 0);

            const slope     = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
            const intercept = (sumY - slope * sumX) / n;

            /* R² */
            const yMean = sumY / n;
            const ssTot = y.reduce(function (s, v) { return s + Math.pow(v - yMean, 2); }, 0);
            const ssRes = x.reduce(function (s, v, i) { return s + Math.pow(y[i] - (slope * v + intercept), 2); }, 0);
            const r2    = ssTot > 0 ? 1 - ssRes / ssTot : 1;

            return { slope: Math.round(slope * 100) / 100, intercept: Math.round(intercept * 100) / 100, r2: Math.round(r2 * 10000) / 10000 };
        }

        /**
         * analyse() → TimeSeriesReport
         * @returns {Object}
         */
        analyse() {
            const amounts = this.#_data.map(function (d) { return Number(d.amount || 0); });
            const x       = amounts.map(function (_, i) { return i; });
            const reg     = this.#_olsRegression(x, amounts);

            /* Projecção 6 meses */
            const n     = amounts.length;
            const projection = [];
            for (let i = 1; i <= 6; i++) {
                projection.push({
                    month_offset:   '+' + i,
                    predicted_eur:  Math.round(Math.max(0, reg.slope * (n + i - 1) + reg.intercept) * 100) / 100,
                    confidence:     'OLS-R²=' + reg.r2
                });
            }

            const total = amounts.reduce(function (s, v) { return s + v; }, 0);

            return Object.freeze({
                n_months:    n,
                total_eur:   Math.round(total * 100) / 100,
                mean_monthly: Math.round(total / n * 100) / 100,
                regression:  reg,
                trend:       reg.slope > 0 ? 'CRESCENTE' : reg.slope < 0 ? 'DECRESCENTE' : 'ESTACIONÁRIA',
                projection_6m: projection,
                projected_6m_total: Math.round(projection.reduce(function (s, p) { return s + p.predicted_eur; }, 0) * 100) / 100,
                forensic_note: reg.r2 > 0.8
                    ? 'Correlação temporal forte (R²=' + reg.r2 + '): padrão sistemático evidenciado.'
                    : 'Correlação temporal fraca (R²=' + reg.r2 + '): actividade irregular — requer investigação adicional.'
            });
        }
    }

    /* ======================================================================
       SECÇÃO 6 — INTERFACE PÚBLICA (NAMESPACE SELADO)
       ====================================================================== */

    _waitForCustody(function () {
        const PUBLIC_API = Object.freeze({
            _INSTALLED:              true,
            _VERSION:                '1.0.0-CONTRADICTORY',
            _CONFORMIDADE:           ['Art. 125.º CPP', 'DAC7 (UE) 2021/514', 'Art. 74 LGT', 'ISO/IEC 27037:2012'],

            ContradictorySimulator:  ContradictorySimulator,
            SilenceAlgorithmDetector: SilenceAlgorithmDetector,
            DAC7Reconciler:          DAC7Reconciler,
            TimeSeriesAnalyser:      TimeSeriesAnalyser,

            /**
             * runFullAnalysis(forensicState, discrepancias, timeSeries) → Promise<FullAnalysisResult>
             * Ponto de entrada consolidado para análise completa.
             */
            runFullAnalysis: async function (forensicState, discrepancias, timeSeries) {
                const simulator  = new ContradictorySimulator();
                const reconciler = new DAC7Reconciler(discrepancias || []);
                const tsData     = Array.isArray(timeSeries) && timeSeries.length >= 2
                    ? new TimeSeriesAnalyser(timeSeries)
                    : null;

                const [simResult, instigacoes, tsReport] = await Promise.all([
                    simulator.simulate({ ...forensicState, timeSeries: timeSeries || [] }),
                    reconciler.reconcile(),
                    tsData ? Promise.resolve(tsData.analyse()) : Promise.resolve(null)
                ]);

                return Object.freeze({
                    simulacao_contraditorio: simResult,
                    instigacoes_dac7:        instigacoes,
                    analise_timeseries:      tsReport,
                    timestamp:               new Date().toISOString()
                });
            }
        });

        Object.defineProperty(root, 'UNIFED_CONTRADICTORY', {
            value:        PUBLIC_API,
            writable:     false,
            configurable: false,
            enumerable:   true
        });

        root.dispatchEvent(new CustomEvent('UNIFED_CONTRADICTORY_READY', {
            detail: { version: PUBLIC_API._VERSION, timestamp: new Date().toISOString() }
        }));

        console.log('[CONTRADICTORY] ✅ UNIFED_CONTRADICTORY v' + PUBLIC_API._VERSION + ' instalado e selado.');
    });

})(window);
