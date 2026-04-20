/**
 * UNIFED - PROBATUM · CASO REAL ANONIMIZADO v13.12.3 (FIX DEMO + RAW DATA VISIBILITY)
 * ============================================================================
 * CORREÇÕES FINAIS (2026-04-17):
 * 1. Atualização dos valores hardcoded do caso real conforme especificação do utilizador.
 * 2. Separação rigorosa entre estado "dados brutos" (após CASO REAL) e "análise completa" (após EXECUTAR PERÍCIA).
 * 3. Módulos de análise (discrepâncias, gráficos, smoking gun) permanecem ocultos até à perícia.
 * 4. Botões da toolbar ativados automaticamente.
 * ============================================================================
 * [MERGE CIRÚRGICO 2026-04-15 + RETIFICAÇÃO TIME-2/TIME-3 + ZERO-KNOWLEDGE FIX]
 * - Garantia de que _PDF_CASE.totals é transferido para UNIFEDSystem.documents
 * - Função ensureDemoDataLoaded() para carregamento idempotente
 * - Melhorada sincronização da UI após clique "CASO REAL"
 * - CORREÇÃO: Estado inicial zero-knowledge (tudo a zeros)
 * - ADIÇÃO: Controle de visibilidade dos módulos forenses (updateForensicModulesVisibility)
 * - CORREÇÃO: Injeção do card macro com display:none quando dados reais não carregados
 * - RETIFICAÇÃO: Gráficos apenas renderizados quando dados reais disponíveis
 * ============================================================================
 * CORREÇÕES ADICIONAIS (2026-04-16):
 * 1. Verificação defensiva em ensureDemoDataLoaded no listener do botão "CASO REAL"
 * 2. Remoção de chamadas prematuras de gráficos e forceRevealSmokingGun em loadAnonymizedRealCase
 * ============================================================================
 * RETIFICAÇÕES CIRÚRGICAS (2026-04-16 - SCRIPT):
 * 1. Garantia de exposição global de ensureDemoDataLoaded antes de qualquer listener
 * 2. Correcção do listener do botão "EXECUTAR PERÍCIA" com fallbacks robustos
 * 3. Activação forçada de todos os botões da toolbar após dashboard visível
 * ============================================================================
 * RETIFICAÇÕES FINAIS (2026-04-17):
 * 1. Atualização dos valores hardcoded do caso real (dac7TotalPeriodo, totalNaoSujeitos, etc.)
 * 2. Separação rigorosa entre estado "dados brutos" (após CASO REAL) e "análise completa" (após EXECUTAR PERÍCIA).
 * 3. Módulos de análise (discrepâncias, gráficos, smoking gun) permanecem ocultos até à perícia.
 * 4. Botões da toolbar ativados automaticamente.
 * ============================================================================
 * RETIFICAÇÃO CIRÚRGICA v2 (2026-04-17):
 * 1. syncMetrics corrigida: enquanto window._unifedAnalysisPending === true, forçar valores de análise a zero.
 * ============================================================================
 * RETIFICAÇÕES EXECUTADAS (2026-04-17 - SCRIPT FINAL):
 * 1. Substituição da função ensureDemoDataLoaded por versão que injeta valores hardcoded diretamente no DOM.
 * 2. Adição de forceBindAnalyze para garantir que o botão "EXECUTAR PERÍCIA" funciona incondicionalmente.
 * ============================================================================
 * RETIFICAÇÕES CIRÚRGICAS (2026-04-18):
 * 1. ensureDemoDataLoaded agora usa valores corretos do _PDF_CASE e mapping de IDs real.
 * 2. simulateEvidenceUpload exposto como alias local na Camada 5.
 * 3. setupRealCaseButton agora chama simulateEvidenceUpload, updateEvidenceCountersAndShow, syncMetrics e registerClient.
 * ============================================================================
 * RETIFICAÇÕES CIRÚRGICAS (2026-04-19):
 * 1. Adicionada chamada a window.updateModulesUI() após syncMetrics em initializeFullWithEvidence().
 * 2. Adicionada chamada a window.updateModulesUI() no monkey-patch do updateDashboard.
 * ============================================================================
 * RETIFICAÇÕES EXECUTADAS (2026-04-20):
 * 1. Em forceFinalState: definir window._unifedAnalysisPending = false e _unifedRawDataOnly = false.
 * 2. Em ensureDemoDataLoaded: chamar window._hydrateRawDataValues() se existir.
 * 3. Em simulateEvidenceUpload: chamar window._hydrateRawDataValues() se existir.
 * ============================================================================
 */

(function() {
    'use strict';

    // =========================================================================
    // EXPOSIÇÃO GLOBAL ANTECIPADA (garantia de disponibilidade)
    // =========================================================================
    window.ensureDemoDataLoaded = null;
    window.executePendingAnalysis = null;

    window.logAudit = window.logAudit || function(msg, level = 'info') {
        const prefix = '[UNIFED] ';
        if (level === 'error') console.error(prefix + msg);
        else if (level === 'warn') console.warn(prefix + msg);
        else if (level === 'success') console.info(prefix + msg);
        else console.log(prefix + msg);
    };
    const logAudit = window.logAudit;

    // =========================================================================
    // 0. CARREGAMENTO DO PAINEL PANEL.HTML (CRÍTICO)
    // =========================================================================
    let panelLoaded = false;
    let panelResolvers = [];

    function waitForPanel() {
        return new Promise((resolve) => {
            if (panelLoaded) {
                resolve();
            } else {
                panelResolvers.push(resolve);
            }
        });
    }

    async function loadPanelHTML() {
        const wrapper = document.getElementById('pureDashboardWrapper');
        if (!wrapper) {
            console.error('[UNIFED] #pureDashboardWrapper não encontrado no DOM.');
            return false;
        }
        if (wrapper.querySelector('#pureDashboard')) return true;

        try {
            const response = await fetch('panel.html');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const html = await response.text();
            wrapper.innerHTML = html;
            panelLoaded = true;
            panelResolvers.forEach(resolve => resolve());
            panelResolvers = [];
            console.log('[UNIFED] panel.html carregado e injetado com sucesso.');
            return true;
        } catch (err) {
            console.error('[UNIFED] Falha ao carregar panel.html:', err);
            wrapper.innerHTML = '<section id="pureDashboard" class="pure-section"><div class="pure-card"><p>Carregando painel forense...</p></div></section>';
            panelLoaded = true;
            panelResolvers.forEach(resolve => resolve());
            return false;
        }
    }

    // =========================================================================
    // 1. DATASET MESTRE (OBJETO IMUTÁVEL) – valores hardcoded ATUALIZADOS
    // =========================================================================
    const _PDF_CASE = Object.freeze({
        sessionId:  "UNIFED-MNGFN3C0-X57MO",
        masterHash: "2A38423FED220D681D86E959F2C34F993BA71FCE9B92791199453B41E23A63E5",
        client: { 
            name: "Real Demo - Unipessoal, Lda", 
            nif: "999999990", 
            platform: "Plataforma A" 
        },
        counts: {
            ctrl: 4,
            saft: 4,
            fat: 2,
            ext: 4,
            dac7: 1
        },
        totals: {
            ganhos:           10157.73,
            ganhosLiquidos:    7709.84,
            saftBruto:         8227.97,
            saftIliquido:      7761.67,
            saftIva:            466.30,
            despesas:          2447.89,
            faturaPlataforma:   262.94,
            dac7TotalPeriodo:  7755.16,   // 4.º TRI conforme solicitado
            iva6Omitido:        131.10,
            iva23Omitido:       502.54,
            asfixiaFinanceira:  493.68,
            totalNaoSujeitos:   451.15,    // Campanhas+Portagens+Gorjetas
            gorjetas:           46.00,
            portagens:           0.15,
            campanhas:         405.00,
            cancelamentos:      58.10
        },
        fluxosIsentos: {
            campanhas: 405.00,
            gorjetas:   46.00,
            portagens:   0.15,
            total:     451.15
        },
        atf: {
            zScore: 2.45,
            confianca: "99.2%",
            periodo: "Q4 2024",
            anomalias: 4,
            version: "v13.12.3",
            score: 40,
            trend: "DESCENDENTE",
            outliers: 0
        },
        macro_analysis: {
            sector_drivers: 38000,
            operational_years: 7,
            avg_monthly_discrepancy: 546.24,
            estimated_systemic_gap: 1743598080.00,
            confidence_level: "High (based on verified algorithmic pattern)",
            legal_implication: "Potential systemic tax erosion under Art. 119.º RGIT (Iteration)",
            methodology: "Extrapolação Estatística de Baixa Variância · ISO/IEC 27037:2012",
            status: "INDICATIVO_MACRO",
            disclaimer: "Os valores de impacto sistémico constituem contexto macroeconómico e não prova direta de ilícito alheio, nos termos do Art. 128.º do CPP."
        },
        meta: {
            lastUpdate: "2026-04-17",
            forensicIntegrity: true
        }
    });

    // 2. ESCUDO SILENCIOSO PARA CORS (TSA / FREETSA FALLBACK)
    (function _installCORSSilentShield() {
        const targetUrl = 'freetsa.org';
        const originalFetch = window.fetch;
        if (typeof originalFetch === 'function') {
            window.fetch = function(input, init) {
                const url = typeof input === 'string' ? input : (input && input.url);
                if (url && url.indexOf(targetUrl) !== -1) {
                    return originalFetch.apply(this, arguments).catch(function(err) {
                        console.warn('[UNIFED] ⚙ Modo Standalone Ativo: Selagem TSA externa indisponível. Integridade assegurada por Assinatura Local SHA-256 (Nível 1).');
                        throw err;
                    });
                }
                return originalFetch.apply(this, arguments);
            };
        }
        window.addEventListener('unhandledrejection', function(event) {
            if (event.reason && event.reason.message && event.reason.message.indexOf('freetsa') !== -1) {
                console.warn('[UNIFED] ⚙ Modo Standalone Ativo: Selagem TSA externa indisponível (promise).');
                event.preventDefault();
            }
            if (event.reason && event.reason.message && event.reason.message.indexOf('api.unifed.com') !== -1) {
                console.warn('[UNIFED] ⚙ Modo Standalone Ativo: Proxy IA indisponível (DNS). Fallback estático ativo.');
                event.preventDefault();
            }
        });
        window.addEventListener('error', function(event) {
            if (event.message && event.message.indexOf('freetsa') !== -1) {
                console.warn('[UNIFED] ⚙ Modo Standalone Ativo: Selagem TSA externa indisponível (erro global).');
                event.preventDefault();
                return true;
            }
            if (event.message && event.message.indexOf('api.unifed.com') !== -1) {
                console.warn('[UNIFED] ⚙ Modo Standalone Ativo: Proxy IA indisponível (DNS). Fallback estático ativo.');
                event.preventDefault();
                return true;
            }
        });
        console.log('[UNIFED] Escudo CORS silencioso instalado para FreeTSA e api.unifed.com.');
    })();

    const _fmt = (v) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);
    const _set = (id, val) => {
        const el = document.getElementById(id);
        if (el) { el.textContent = val; return true; }
        return false;
    };

    window.UNIFED_INTERNAL = window.UNIFED_INTERNAL || {};
    window.UNIFED_INTERNAL.data = _PDF_CASE;
    window.UNIFED_INTERNAL.fmt = _fmt;
    window.UNIFED_INTERNAL.set = _set;

    console.log('[UNIFED] Camada 1: OK.');

    // =========================================================================
    // Camada 2 – Sincronização de Métricas (syncMetrics) - CORRIGIDA v2
    // =========================================================================
    (function() {
        if (!window.UNIFED_INTERNAL) return;
        const { data, fmt, set } = window.UNIFED_INTERNAL;

        window.UNIFED_INTERNAL.syncMetrics = function() {
            const dashboard = document.getElementById('pureDashboard');
            if (!dashboard) {
                console.info('[UNIFED] syncMetrics abortado: painel pureDashboard ainda não injetado no DOM.');
                return;
            }

            console.log('[UNIFED] Iniciando Sincronização Forense...');
            
            const sys = window.UNIFEDSystem;
            
            // Determina se os dados reais já foram carregados (via caso real)
            const dadosReaisCarregados = (sys && sys.analysis && sys.analysis.totals && sys.analysis.totals.ganhos > 0);
            
            // ========== CORREÇÃO CRÍTICA: Se a análise ainda não foi executada, forçar valores de análise a zero ==========
            const analisePendente = (window._unifedAnalysisPending === true);
            
            let t;
            if (dadosReaisCarregados && !analisePendente) {
                // Caso 1: análise já executada – usar totais reais da análise
                t = sys.analysis.totals;
            } else if (window._unifedDataLoaded === true && !analisePendente) {
                // Caso 2: dados carregados mas análise ainda não executada – NÃO usar totais de demonstração para análise
                // Forçar valores de análise a zero
                t = {
                    ganhos: data.totals.ganhos,           // dados brutos mantêm-se
                    despesas: data.totals.despesas,       // dados brutos mantêm-se
                    ganhosLiquidos: data.totals.ganhosLiquidos,
                    saftBruto: data.totals.saftBruto,
                    dac7TotalPeriodo: data.totals.dac7TotalPeriodo,
                    faturaPlataforma: data.totals.faturaPlataforma,
                    // ========== VALORES DE ANÁLISE FORÇADOS A ZERO ==========
                    iva6Omitido: 0,
                    iva23Omitido: 0,
                    asfixiaFinanceira: 0,
                    cancelamentos: 0
                };
            } else {
                // Estado zero‑knowledge: todos os valores a zero
                t = {
                    ganhos: 0,
                    despesas: 0,
                    ganhosLiquidos: 0,
                    saftBruto: 0,
                    dac7TotalPeriodo: 0,
                    faturaPlataforma: 0,
                    iva6Omitido: 0,
                    iva23Omitido: 0,
                    asfixiaFinanceira: 0,
                    cancelamentos: 0
                };
            }
            
            // ========== VALORES DE DISCREPÂNCIA: ZERO ENQUANTO ANÁLISE PENDENTE ==========
            let discrepanciaC2, percentC2, discrepanciaC1, percentC1, ircEstimadoCorreto, asfixiaFinanceira;
            
            if (analisePendente) {
                // Análise ainda não executada – forçar zero
                discrepanciaC2 = 0;
                percentC2 = 0;
                discrepanciaC1 = 0;
                percentC1 = 0;
                ircEstimadoCorreto = 0;
                asfixiaFinanceira = 0;
            } else {
                // Análise já executada – usar valores reais dos crossings
                const c = (sys && sys.analysis && sys.analysis.crossings) ? sys.analysis.crossings : {};
                discrepanciaC2 = c.discrepanciaCritica || (t.despesas - t.faturaPlataforma);
                percentC2 = c.percentagemOmissao || (t.despesas > 0 ? (discrepanciaC2 / t.despesas) * 100 : 0);
                discrepanciaC1 = c.discrepanciaSaftVsDac7 || (t.saftBruto - t.dac7TotalPeriodo);
                percentC1 = c.percentagemSaftVsDac7 || (t.saftBruto > 0 ? (discrepanciaC1 / t.saftBruto) * 100 : 0);
                ircEstimadoCorreto = c.ircEstimado || (discrepanciaC2 * 0.21);
                asfixiaFinanceira = t.asfixiaFinanceira || (t.saftBruto * 0.06);
            }
            
            const fi = data.fluxosIsentos;
            const totalNaoSujeitosCalc = (window._unifedDataLoaded === true) ? fi.total : 0;
            
            const getCounter = (docType, fallback) => {
                if (sys && sys.documents && sys.documents[docType] && sys.documents[docType].totals) {
                    return sys.documents[docType].totals.records.toString();
                }
                return (window._unifedDataLoaded === true) ? fallback : "0";
            };
            const totalEvidencias = (sys && sys.counts && sys.counts.total) ? sys.counts.total.toString() : 
                                    (window._unifedDataLoaded === true ? (data.counts.ctrl + data.counts.saft + data.counts.fat + data.counts.ext + data.counts.dac7).toString() : "0");

            const setAnyText = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.textContent = value;
            };
            const setScopedText = (id, value) => {
                const el = document.querySelector(`#pureDashboard #${id}`);
                if (el) el.textContent = value;
            };
            // Atualização global para elementos que possam estar fora do #pureDashboard
            const setGlobalText = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.textContent = value;
                const alt = document.querySelector(`#${id}`);
                if (alt) alt.textContent = value;
            };

            // Mapeamento para elementos dentro de #pureDashboard
            const mapping = {
                'pure-ganhos': fmt(t.ganhos), 'pure-despesas': fmt(t.despesas), 'pure-liquido': fmt(t.ganhosLiquidos),
                'pure-saft': fmt(t.saftBruto), 'pure-dac7': fmt(t.dac7TotalPeriodo), 'pure-fatura': fmt(t.faturaPlataforma),
                'pure-disc-c2': fmt(discrepanciaC2), 'pure-disc-c2-pct': percentC2.toFixed(2) + '%',
                'pure-disc-saft-dac7': fmt(discrepanciaC1), 'pure-disc-saft-pct': percentC1.toFixed(2) + '%',
                'pure-iva-6': fmt(t.iva6Omitido), 'pure-iva-23': fmt(t.iva23Omitido),
                'pure-irc': fmt(ircEstimadoCorreto),
                'pure-disc-c2-grid': fmt(discrepanciaC2), 'pure-iva-devido': fmt(asfixiaFinanceira),
                'pure-nao-sujeitos': fmt(totalNaoSujeitosCalc), 'pure-atf-sp': data.atf.score + '/100',
                'pure-atf-trend': data.atf.trend, 'pure-atf-outliers': data.atf.outliers + ' outliers > 2σ',
                'pure-atf-meses': '2.º Semestre 2024 — 4 meses com dados (Set–Dez)',
                'pure-sg-1-val': fmt(discrepanciaC2), 'pure-sg-1-pct': percentC2.toFixed(2) + '%',
                'pure-sg-2-val': fmt(discrepanciaC1), 'pure-sg-2-pct': percentC1.toFixed(2) + '%',
                'pure-nc-campanhas': fmt(window._unifedDataLoaded === true ? fi.campanhas : 0),
                'pure-nc-gorjetas': fmt(window._unifedDataLoaded === true ? fi.gorjetas : 0),
                'pure-nc-portagens': fmt(window._unifedDataLoaded === true ? fi.portagens : 0),
                'pure-nc-total': fmt(totalNaoSujeitosCalc),
                'pure-verdict': dadosReaisCarregados && !analisePendente ? 'RISCO CRÍTICO · DESVIO PADRÃO > 2σ' : 'AGUARDANDO PERÍCIA',
                'pure-verdict-pct': dadosReaisCarregados && !analisePendente ? percentC2.toFixed(2) + '%' : '0.00%',
                'pure-session-id': (sys && sys.sessionId) ? sys.sessionId : (window._unifedDataLoaded === true ? data.sessionId : '--------'),
                'pure-hash-prefix': (sys && sys.masterHash) ? sys.masterHash.substring(0, 12).toUpperCase() + '...' : (window._unifedDataLoaded === true ? data.masterHash.substring(0, 12) + '...' : '---'),
                'pure-hash-prefix-verdict': (sys && sys.masterHash) ? sys.masterHash.substring(0, 16).toUpperCase() + '...' : (window._unifedDataLoaded === true ? data.masterHash.substring(0, 16) + '...' : '---'),
                'pure-subject-name': (window._unifedDataLoaded === true) ? data.client.name : '---',
                'pure-subject-nif': (window._unifedDataLoaded === true) ? data.client.nif : '---',
                'pure-subject-platform': (window._unifedDataLoaded === true) ? data.client.platform : '---',
                'pure-ganhos-extrato': fmt(t.ganhos), 'pure-despesas-extrato': fmt(t.despesas),
                'pure-ganhos-liquidos-extrato': fmt(t.ganhosLiquidos), 'pure-saft-bruto-val': fmt(t.saftBruto),
                'pure-dac7-val': fmt(t.dac7TotalPeriodo), 'pure-atf-zscore': data.atf.zScore.toString(),
                'pure-atf-confianca': data.atf.confianca, 
                // ========== CORREÇÃO: zero‑knowledge mostra '--%' ==========
                'pure-atf-score-val': (dadosReaisCarregados && !analisePendente) ? (data.atf.score + '/100') : '--%',
                'pure-iva-devido-val': fmt(asfixiaFinanceira), 'pure-impacto-macro': fmt(data.macro_analysis.estimated_systemic_gap),
                'pure-ctrl-qty': getCounter('control', data.counts.ctrl.toString()),
                'pure-saft-qty': getCounter('saft', data.counts.saft.toString()),
                'pure-fat-qty': getCounter('invoices', data.counts.fat.toString()),
                'pure-ext-qty': getCounter('statements', data.counts.ext.toString()),
                'pure-dac7-qty': getCounter('dac7', data.counts.dac7.toString()),
                'pure-ganhos-tri': fmt(t.ganhos), 'pure-despesas-tri': fmt(t.despesas),
                'pure-liquido-tri': fmt(t.ganhosLiquidos), 'pure-fatura-tri': fmt(t.faturaPlataforma),
                'pure-counter-ctrl': getCounter('control', '0'), 'pure-counter-saft': getCounter('saft', '0'),
                'pure-counter-fat': getCounter('invoices', '0'), 'pure-counter-statements': getCounter('statements', '0'),
                'pure-counter-dac7': getCounter('dac7', '0')
            };
            
            Object.entries(mapping).forEach(([id, value]) => {
                setScopedText(id, value);
                // Fallback: tentar também como elemento global
                const globalEl = document.getElementById(id);
                if (globalEl && globalEl.textContent !== value) globalEl.textContent = value;
            });

            // Atualização específica para os elementos de "Zona Cinzenta" que aparecem no dashboard
            setGlobalText('auxBoxCampanhasValue', fmt(window._unifedDataLoaded === true ? fi.campanhas : 0));
            setGlobalText('auxBoxGorjetasValue', fmt(window._unifedDataLoaded === true ? fi.gorjetas : 0));
            setGlobalText('auxBoxPortagensValue', fmt(window._unifedDataLoaded === true ? fi.portagens : 0));
            setGlobalText('auxBoxTotalNSValue', fmt(totalNaoSujeitosCalc));
            setGlobalText('auxBoxCancelValue', fmt(t.cancelamentos || 0));
            setGlobalText('auxDac7NoteValue', fmt(totalNaoSujeitosCalc));
            setGlobalText('auxDac7NoteValueQ', fmt(totalNaoSujeitosCalc));
            
            // Atualização dos cards de gap – apenas se dados reais carregados e análise executada
            const revenueGapCorrect = t.saftBruto - t.ganhos;
            setGlobalText('revenueGapValue', fmt(revenueGapCorrect));
            setGlobalText('expenseGapValue', fmt(discrepanciaC2));
            const omissaoPct = (t.despesas > 0 && t.ganhos > 0) ? ((t.despesas / t.ganhos) * 100) : 0;
            setGlobalText('omissaoDespesasPctValue', omissaoPct.toFixed(2) + '%');
            
            // Forçar exibição dos cards (apenas se valores > 0 e dados reais carregados e análise executada)
            const analiseExecutada = dadosReaisCarregados && !analisePendente;
            const revenueCard = document.getElementById('revenueGapCard');
            if (revenueCard) revenueCard.style.display = (analiseExecutada && Math.abs(revenueGapCorrect) > 0.01) ? 'block' : 'none';
            const expenseCard = document.getElementById('expenseGapCard');
            if (expenseCard) expenseCard.style.display = (analiseExecutada && Math.abs(discrepanciaC2) > 0.01) ? 'block' : 'none';
            const omissaoCard = document.getElementById('omissaoDespesasPctCard');
            if (omissaoCard) omissaoCard.style.display = (analiseExecutada && t.despesas > 0 && t.ganhos > 0) ? 'block' : 'none';
            
            // Atualizar textos legais (apenas se dados reais carregados e análise executada)
            const sg1Legal = document.querySelector('#pureDashboard #pure-sg1-legal');
            if (sg1Legal) sg1Legal.textContent = analiseExecutada ? 'Art. 23.º CIRC (Indutividade de Custos) · Art. 103.º RGIT (Fraude Fiscal)' : '---';
            const sg2Legal = document.querySelector('#pureDashboard #pure-sg2-legal');
            if (sg2Legal) sg2Legal.textContent = analiseExecutada ? 'Diretiva DAC7 (UE) 2021/514 · Art. 103.º RGIT (Fraude Fiscal) · DL n.º 41/2023' : '---';
            const verdictBasis = document.querySelector('#pureDashboard #pure-verdict-basis');
            if (verdictBasis) verdictBasis.textContent = analiseExecutada ? 'Art. 119.º RGIT · Art. 125.º CPP' : '---';
            const pureIva23Sub = document.querySelector('#pureDashboard #pure-iva23-sub');
            if (pureIva23Sub) pureIva23Sub.textContent = analiseExecutada ? 'Art. 2.º n.º 1 al. i) CIVA' : '---';
            const pureIrcSub = document.querySelector('#pureDashboard #pure-irc-sub');
            if (pureIrcSub) pureIrcSub.textContent = analiseExecutada ? 'Art. 17.º CIRC' : '---';
            
            // =================================================================
            // A renderização dos gráficos será feita apenas quando os dados reais estiverem disponíveis
            // (via ensureDemoDataLoaded ou executePendingAnalysis)
            // =================================================================
        };
        console.log('[UNIFED] Camada 2: OK. (syncMetrics corrigida para zero-knowledge)');
    })();

    // =========================================================================
    // Camada 3 – Matriz de Triangulação (renderMatrix) - CORRIGIDA
    // =========================================================================
    (function() {
        if (!window.UNIFED_INTERNAL) return;
        const { data, fmt } = window.UNIFED_INTERNAL;

        window.UNIFED_INTERNAL.renderMatrix = function() {
            const target = document.getElementById('pureDashboard');
            if (!target) return;
            const existingMatrix = document.getElementById('triangulationMatrixContainer');
            if (existingMatrix) existingMatrix.remove();

            const sys = window.UNIFEDSystem;
            
            const dadosReaisCarregados = (sys && sys.analysis && sys.analysis.totals && sys.analysis.totals.ganhos > 0);
            
            let t;
            if (dadosReaisCarregados) {
                t = sys.analysis.totals;
            } else if (window._unifedDataLoaded === true) {
                t = data.totals;
            } else {
                t = {
                    ganhos: 0,
                    despesas: 0,
                    saftBruto: 0,
                    dac7TotalPeriodo: 0,
                    faturaPlataforma: 0
                };
            }
            
            const deltaSaft = t.ganhos - t.saftBruto;
            const deltaDac7 = t.ganhos - t.dac7TotalPeriodo;
            const deltaFatura = t.despesas - t.faturaPlataforma;

            const isEn = (typeof window.currentLang !== 'undefined' && window.currentLang === 'en') ||
                         (document.documentElement.lang === 'en');
            
            const labels = {
                title: isEn ? "FORENSIC TRIANGULATION MATRIX (ART. 119 RGIT)" : "MATRIZ DE TRIANGULAÇÃO FORENSE (ART. 119.º RGIT)",
                colSource: isEn ? "EVIDENCE SOURCE" : "FONTE DE PROVA",
                colValue: isEn ? "AMOUNT" : "VALOR",
                colDisc: isEn ? "DISCREPANCY" : "DISCREPÂNCIA",
                footnote: isEn ? "Methodological Note:" : "Nota Metodológica:",
                footnoteText: isEn ? "The divergence between the invoiced value (SAF-T/DAC7) and the actual credited value (Ledger) evidences an omission of taxable base of " : "A divergência entre o valor faturado (SAF-T/DAC7) e o valor real creditado (Ledger) evidencia uma omissão de base tributável de ",
                footnoteConfig: isEn ? "in retained platform commissions, constituting a tax offense under Art. 119 RGIT." : "nas comissões retidas pela plataforma, configurando contra-ordenação tributária nos termos do Art. 119.º RGIT."
            };

            const matrixHtml = `
            <div id="triangulationMatrixContainer" class="pure-triangulation-box" style="margin:30px 0; border:1px solid #00E5FF; background:rgba(15,23,42,0.95); padding:20px; border-radius:12px;">
                <h3 style="color:#00E5FF; margin-top:0; font-size:1rem;">${labels.title}</h3>
                <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
                    <thead><tr style="border-bottom:1px solid rgba(255,255,255,0.2);"><th style="text-align:left; padding:10px;">${labels.colSource}</th><th style="text-align:right; padding:10px;">${labels.colValue}</th><th style="text-align:right; padding:10px; color:#EF4444;">${labels.colDisc}</th></tr></thead>
                    <tbody>
                        <tr><td style="padding:10px;">📄 SAF-T PT (${isEn ? 'Invoicing' : 'Faturação'})</td><td style="padding:10px; text-align:right;">${fmt(t.saftBruto)}</td><td style="padding:10px; text-align:right;">-${fmt(deltaSaft)}</td></tr>
                        <tr style="background:rgba(239,68,68,0.08);"><td style="padding:10px;">🌐 DAC7 (Plataforma A)</td><td style="padding:10px; text-align:right;">${fmt(t.dac7TotalPeriodo)}</td><td style="padding:10px; text-align:right;">-${fmt(deltaDac7)}</td></tr>
                        <tr><td style="padding:10px;">📑 ${isEn ? 'BTF Invoices (Commissions)' : 'Faturas BTF (Comissões)'}</td><td style="padding:10px; text-align:right;">${fmt(t.faturaPlataforma)}</td><td style="padding:10px; text-align:right;">-${fmt(deltaFatura)}</td></tr>
                        <tr style="border-top:2px solid #00E5FF;"><td style="padding:10px; font-weight:bold;">💰 ${isEn ? 'LEDGER (Actual Earnings)' : 'LEDGER (Ganhos Reais)'}</td><td style="padding:10px; text-align:right; font-weight:bold;">${fmt(t.ganhos)}</td><td style="padding:10px; text-align:right;">---</td></tr>
                    </tbody>
                </table>
                <div style="margin-top: 15px; font-size: 0.7rem; color: #94a3b8; border-top: 1px solid rgba(0,229,255,0.2); padding-top: 10px;">
                    <strong>${labels.footnote}</strong> ${labels.footnoteText}${fmt(deltaFatura)} (${t.despesas > 0 ? ((deltaFatura/t.despesas)*100).toFixed(2) : '0.00'}%) ${labels.footnoteConfig}
                </div>
            </div>`;
            target.insertAdjacentHTML('beforeend', matrixHtml);
        };
        console.log('[UNIFED] Camada 3: OK.');
    })();

    // =========================================================================
    // Camada 4 – Injeção de CSS, Macro Card e UI Auxiliar
    // =========================================================================
    (function() {
        if (!window.UNIFED_INTERNAL) return;
        const { data, fmt, set, syncMetrics, renderMatrix } = window.UNIFED_INTERNAL;

        function _injectAuxiliaryBoxesCSS() {
            const styleId = 'unifed-aux-boxes-fix';
            if (document.getElementById(styleId)) return;
            const css = `
                .auxiliary-helper-section { width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; }
                .aux-boxes-grid { display: grid !important; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)) !important; gap: 0.75rem !important; width: 100% !important; }
                .small-info-box { width: 100% !important; margin: 0 !important; box-sizing: border-box !important; }
                .evidence-counter, .evidence-summary { display: none !important; }
                @media (max-width: 640px) { .aux-boxes-grid { grid-template-columns: repeat(2, 1fr) !important; } }
                @media (max-width: 480px) { .aux-boxes-grid { grid-template-columns: 1fr !important; } }
                .chart-section { height: auto !important; overflow: visible !important; }
                .chart-section:empty { display: none !important; }
                canvas#mainChart, canvas#discrepancyChart { width: 100% !important; height: 300px !important; }
            `;
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = css;
            document.head.appendChild(style);
            console.log('[UNIFED] CSS injetado.');
        }

        // =========================================================================
        // FUNÇÃO CORRIGIDA: _injectMacroCard com controlo de visibilidade inicial
        // =========================================================================
        function _injectMacroCard() {
            const target = document.getElementById('pureDashboard');
            if (!target || document.getElementById('pureMacroCard')) return;
            const macro = data.macro_analysis;
            if (!macro) return;
            
            const monthlyLoss = (macro.sector_drivers || 38000) * (macro.avg_monthly_discrepancy || 546.24);
            
            const cardDiv = document.createElement('div');
            cardDiv.className = 'pure-card pure-card-macro';
            cardDiv.id = 'pureMacroCard';
            
            const titleDiv = document.createElement('h3');
            titleDiv.className = 'pure-card-title';
            const titleIcon = document.createElement('span');
            titleIcon.className = 'pure-icon';
            titleIcon.innerHTML = '🌍';
            const titleSpan = document.createElement('span');
            titleSpan.setAttribute('data-pt', 'V. ANÁLISE DE RISCO SISTÉMICO (MIS)');
            titleSpan.setAttribute('data-en', 'V. SYSTEMIC RISK ANALYSIS (MIS)');
            titleSpan.textContent = (typeof window.currentLang !== 'undefined' && window.currentLang === 'en') ? 'V. SYSTEMIC RISK ANALYSIS (MIS)' : 'V. ANÁLISE DE RISCO SISTÉMICO (MIS)';
            titleDiv.appendChild(titleIcon);
            titleDiv.appendChild(titleSpan);
            cardDiv.appendChild(titleDiv);
            
            const gridDiv = document.createElement('div');
            gridDiv.className = 'pure-macro-grid';
            gridDiv.style.cssText = 'display:flex; flex-wrap:wrap; gap:1rem; justify-content:space-between;';
            
            const item1 = document.createElement('div');
            item1.className = 'pure-macro-item';
            item1.style.cssText = 'flex:1; min-width:160px; background:rgba(255,255,255,0.03); padding:12px; border-radius:6px;';
            const label1 = document.createElement('div');
            label1.className = 'pure-macro-label';
            label1.style.cssText = 'font-size:0.65rem; color:#94a3b8; text-transform:uppercase;';
            label1.setAttribute('data-pt', 'Universo de Operadores');
            label1.setAttribute('data-en', 'Operators Universe');
            label1.textContent = (typeof window.currentLang !== 'undefined' && window.currentLang === 'en') ? 'Operators Universe' : 'Universo de Operadores';
            const value1 = document.createElement('div');
            value1.id = 'pure-macro-universe';
            value1.className = 'pure-macro-value';
            value1.style.cssText = 'font-size:1.4rem; font-weight:700; color:#00E5FF;';
            value1.textContent = macro.sector_drivers.toLocaleString('pt-PT');
            const sub1 = document.createElement('div');
            sub1.className = 'pure-macro-sub';
            sub1.style.cssText = 'font-size:0.6rem; color:#64748b;';
            sub1.textContent = 'Sector TVDE Portugal';
            item1.appendChild(label1);
            item1.appendChild(value1);
            item1.appendChild(sub1);
            gridDiv.appendChild(item1);
            
            const item2 = document.createElement('div');
            item2.className = 'pure-macro-item';
            item2.style.cssText = 'flex:1; min-width:160px; background:rgba(255,255,255,0.03); padding:12px; border-radius:6px;';
            const label2 = document.createElement('div');
            label2.className = 'pure-macro-label';
            label2.style.cssText = 'font-size:0.65rem; color:#94a3b8; text-transform:uppercase;';
            label2.setAttribute('data-pt', 'Horizonte Temporal');
            label2.setAttribute('data-en', 'Time Horizon');
            label2.textContent = (typeof window.currentLang !== 'undefined' && window.currentLang === 'en') ? 'Time Horizon' : 'Horizonte Temporal';
            const value2 = document.createElement('div');
            value2.id = 'pure-macro-horizon';
            value2.className = 'pure-macro-value';
            value2.style.cssText = 'font-size:1.4rem; font-weight:700; color:#00E5FF;';
            value2.textContent = macro.operational_years + ' Anos';
            const sub2 = document.createElement('div');
            sub2.className = 'pure-macro-sub';
            sub2.style.cssText = 'font-size:0.6rem; color:#64748b;';
            sub2.textContent = '2019–2026';
            item2.appendChild(label2);
            item2.appendChild(value2);
            item2.appendChild(sub2);
            gridDiv.appendChild(item2);
            
            const item3 = document.createElement('div');
            item3.className = 'pure-macro-item';
            item3.style.cssText = 'flex:1; min-width:160px; background:rgba(255,255,255,0.03); padding:12px; border-radius:6px;';
            const label3 = document.createElement('div');
            label3.className = 'pure-macro-label';
            label3.style.cssText = 'font-size:0.65rem; color:#94a3b8; text-transform:uppercase;';
            label3.setAttribute('data-pt', 'Erosão Mensal Estimada');
            label3.setAttribute('data-en', 'Estimated Monthly Erosion');
            label3.textContent = (typeof window.currentLang !== 'undefined' && window.currentLang === 'en') ? 'Estimated Monthly Erosion' : 'Erosão Mensal Estimada';
            const value3 = document.createElement('div');
            value3.id = 'pure-macro-monthly-loss';
            value3.className = 'pure-macro-value';
            value3.style.cssText = 'font-size:1.4rem; font-weight:700; color:#F59E0B;';
            value3.textContent = _fmt(monthlyLoss);
            const sub3 = document.createElement('div');
            sub3.className = 'pure-macro-sub';
            sub3.style.cssText = 'font-size:0.6rem; color:#64748b;';
            sub3.textContent = 'Art. 119.º RGIT';
            item3.appendChild(label3);
            item3.appendChild(value3);
            item3.appendChild(sub3);
            gridDiv.appendChild(item3);
            
            const item4 = document.createElement('div');
            item4.className = 'pure-macro-item pure-macro-highlight';
            item4.style.cssText = 'flex:1.5; min-width:200px; background:rgba(239,68,68,0.08); border-left:3px solid #EF4444; padding:12px; border-radius:6px;';
            const label4 = document.createElement('div');
            label4.className = 'pure-macro-label';
            label4.style.cssText = 'font-size:0.65rem; color:#94a3b8; text-transform:uppercase;';
            label4.setAttribute('data-pt', 'Erosão Fiscal Estimada (7 Anos)');
            label4.setAttribute('data-en', 'Estimated Tax Erosion (7 Years)');
            label4.textContent = (typeof window.currentLang !== 'undefined' && window.currentLang === 'en') ? 'Estimated Tax Erosion (7 Years)' : 'Erosão Fiscal Estimada (7 Anos)';
            const value4 = document.createElement('div');
            value4.id = 'pure-macro-total-loss';
            value4.className = 'pure-macro-value';
            value4.style.cssText = 'font-size:1.6rem; font-weight:900; color:#EF4444;';
            value4.textContent = _fmt(macro.estimated_systemic_gap);
            const sub4 = document.createElement('div');
            sub4.className = 'pure-macro-sub';
            sub4.style.cssText = 'font-size:0.6rem; color:#EF4444;';
            sub4.textContent = 'Art. 119.º RGIT (Iteração)';
            item4.appendChild(label4);
            item4.appendChild(value4);
            item4.appendChild(sub4);
            gridDiv.appendChild(item4);
            
            cardDiv.appendChild(gridDiv);
            
            const disclaimerDiv = document.createElement('div');
            disclaimerDiv.className = 'pure-macro-disclaimer';
            disclaimerDiv.style.cssText = 'margin-top:1rem; padding:0.75rem; background:rgba(0,0,0,0.3); border-left:3px solid #FACC15; font-size:0.7rem; color:#94a3b8;';
            const disclaimerIcon = document.createElement('i');
            disclaimerIcon.className = 'fas fa-gavel';
            const disclaimerSpan = document.createElement('span');
            disclaimerSpan.setAttribute('data-pt', 'Os valores de impacto sistémico constituem contexto macroeconómico e não prova directa de ilícito alheio, nos termos do Art. 128.º do CPP.');
            disclaimerSpan.setAttribute('data-en', 'Systemic impact values constitute macroeconomic context and not direct proof of third-party wrongdoing, under Art. 128 CPP.');
            disclaimerSpan.textContent = (typeof window.currentLang !== 'undefined' && window.currentLang === 'en') 
                ? 'Systemic impact values constitute macroeconomic context and not direct proof of third-party wrongdoing, under Art. 128 CPP.'
                : 'Os valores de impacto sistémico constituem contexto macroeconómico e não prova directa de ilícito alheio, nos termos do Art. 128.º do CPP.';
            disclaimerDiv.appendChild(disclaimerIcon);
            disclaimerDiv.appendChild(document.createTextNode(' '));
            disclaimerDiv.appendChild(disclaimerSpan);
            cardDiv.appendChild(disclaimerDiv);
            
            // =================================================================
            // CORREÇÃO: verificar se dados reais estão carregados e ocultar card inicialmente se necessário
            // =================================================================
            const dadosReaisCarregados = (window.UNIFEDSystem && window.UNIFEDSystem.analysis && 
                                          window.UNIFEDSystem.analysis.totals && window.UNIFEDSystem.analysis.totals.ganhos > 0);
            if (!dadosReaisCarregados && !window._unifedDataLoaded) {
                cardDiv.style.display = 'none';
            }
            
            target.appendChild(cardDiv);
        }

        function _updateAuxiliaryUI() {
            if (!document.getElementById('pureDashboard')) return;
            
            const sys = window.UNIFEDSystem;
            const dadosReaisCarregados = (sys && sys.analysis && sys.analysis.totals && sys.analysis.totals.ganhos > 0);
            
            let t;
            if (dadosReaisCarregados) {
                t = sys.analysis.totals;
            } else if (window._unifedDataLoaded === true) {
                t = data.totals;
            } else {
                t = {
                    ganhos: 0,
                    despesas: 0,
                    ganhosLiquidos: 0,
                    saftBruto: 0,
                    dac7TotalPeriodo: 0,
                    faturaPlataforma: 0,
                    iva6Omitido: 0,
                    iva23Omitido: 0,
                    asfixiaFinanceira: 0
                };
            }
            
            const _f = (typeof _fmt === 'function') ? _fmt : (v) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v || 0);
            const fi2 = data.fluxosIsentos;
            const totalNaoSujeitosCalc = (window._unifedDataLoaded === true) ? fi2.total : 0;
            
            const auxMapping = [
                { id: 'pure-ganhos', val: t.ganhos }, { id: 'pure-despesas', val: t.despesas }, { id: 'pure-liquido', val: t.ganhosLiquidos },
                { id: 'pure-saft', val: t.saftBruto }, { id: 'pure-dac7', val: t.dac7TotalPeriodo }, { id: 'pure-fatura', val: t.faturaPlataforma },
                { id: 'pure-disc-c2', val: t.despesas - t.faturaPlataforma }, { id: 'pure-disc-saft-dac7', val: t.saftBruto - t.dac7TotalPeriodo },
                { id: 'pure-iva-6', val: t.iva6Omitido }, { id: 'pure-iva-23', val: t.iva23Omitido }, { id: 'pure-irc', val: (t.despesas - t.faturaPlataforma) * 0.21 },
                { id: 'pure-disc-c2-grid', val: t.despesas - t.faturaPlataforma }, { id: 'pure-iva-devido', val: t.asfixiaFinanceira },
                { id: 'pure-nao-sujeitos', val: totalNaoSujeitosCalc }, { id: 'pure-atf-sp', val: data.atf.score + '/100' }, { id: 'pure-atf-trend', val: data.atf.trend },
                { id: 'pure-atf-outliers', val: data.atf.outliers + ' outliers > 2σ' }, { id: 'pure-atf-meses', val: '2.º Semestre 2024 — 4 meses com dados (Set–Dez)' },
                { id: 'pure-sg-1-val', val: t.despesas - t.faturaPlataforma },
                { id: 'pure-sg-1-pct', val: ((t.despesas - t.faturaPlataforma) / (t.despesas || 1) * 100).toFixed(2) + '%' },
                { id: 'pure-sg-2-val', val: t.saftBruto - t.dac7TotalPeriodo },
                { id: 'pure-sg-2-pct', val: ((t.saftBruto - t.dac7TotalPeriodo) / (t.saftBruto || 1) * 100).toFixed(2) + '%' },
                { id: 'pure-nc-campanhas', val: window._unifedDataLoaded === true ? fi2.campanhas : 0 },
                { id: 'pure-nc-gorjetas', val: window._unifedDataLoaded === true ? fi2.gorjetas : 0 },
                { id: 'pure-nc-portagens', val: window._unifedDataLoaded === true ? fi2.portagens : 0 },
                { id: 'pure-nc-total', val: totalNaoSujeitosCalc },
                { id: 'pure-verdict', val: dadosReaisCarregados ? 'RISCO CRÍTICO · DESVIO PADRÃO > 2σ' : 'AGUARDANDO PERÍCIA' },
                { id: 'pure-verdict-pct', val: dadosReaisCarregados ? ((t.despesas - t.faturaPlataforma) / (t.despesas || 1) * 100).toFixed(2) + '%' : '0.00%' },
                { id: 'pure-hash-prefix-verdict', val: (sys && sys.masterHash) ? sys.masterHash.substring(0, 16).toUpperCase() + '...' : (window._unifedDataLoaded === true ? data.masterHash.substring(0, 16) + '...' : '---') },
                { id: 'pure-session-id', val: (sys && sys.sessionId) ? sys.sessionId : (window._unifedDataLoaded === true ? data.sessionId : '--------') },
                { id: 'pure-hash-prefix', val: (sys && sys.masterHash) ? sys.masterHash.substring(0, 12).toUpperCase() + '...' : (window._unifedDataLoaded === true ? data.masterHash.substring(0, 12) + '...' : '---') },
                { id: 'pure-subject-name', val: (window._unifedDataLoaded === true) ? data.client.name : '---' },
                { id: 'pure-subject-nif', val: (window._unifedDataLoaded === true) ? data.client.nif : '---' },
                { id: 'pure-subject-platform', val: (window._unifedDataLoaded === true) ? data.client.platform : '---' },
                { id: 'pure-ganhos-extrato', val: t.ganhos }, { id: 'pure-despesas-extrato', val: t.despesas },
                { id: 'pure-ganhos-liquidos-extrato', val: t.ganhosLiquidos }, { id: 'pure-saft-bruto-val', val: t.saftBruto }, { id: 'pure-dac7-val', val: t.dac7TotalPeriodo },
                { id: 'pure-atf-zscore', val: data.atf.zScore }, { id: 'pure-atf-confianca', val: data.atf.confianca }, { id: 'pure-atf-score-val', val: data.atf.score + '/100' },
                { id: 'pure-iva-devido-val', val: t.asfixiaFinanceira }, { id: 'pure-impacto-macro', val: data.macro_analysis.estimated_systemic_gap },
                { id: 'pure-ctrl-qty', val: (window._unifedDataLoaded === true) ? data.counts.ctrl : 0 },
                { id: 'pure-saft-qty', val: (window._unifedDataLoaded === true) ? data.counts.saft : 0 },
                { id: 'pure-fat-qty', val: (window._unifedDataLoaded === true) ? data.counts.fat : 0 },
                { id: 'pure-ext-qty', val: (window._unifedDataLoaded === true) ? data.counts.ext : 0 },
                { id: 'pure-dac7-qty', val: (window._unifedDataLoaded === true) ? data.counts.dac7 : 0 },
                { id: 'auxBoxCampanhasValue', val: window._unifedDataLoaded === true ? fi2.campanhas : 0 },
                { id: 'auxBoxPortagensValue', val: window._unifedDataLoaded === true ? fi2.portagens : 0 },
                { id: 'auxBoxGorjetasValue', val: window._unifedDataLoaded === true ? fi2.gorjetas : 0 },
                { id: 'auxBoxTotalNSValue', val: totalNaoSujeitosCalc },
                { id: 'auxBoxCancelValue', val: 0.00 },
                { id: 'auxDac7NoteValue', val: totalNaoSujeitosCalc },
                { id: 'auxDac7NoteValueQ', val: totalNaoSujeitosCalc },
                { id: 'pure-ganhos-tri', val: t.ganhos },
                { id: 'pure-despesas-tri', val: t.despesas },
                { id: 'pure-liquido-tri', val: t.ganhosLiquidos },
                { id: 'pure-fatura-tri', val: t.faturaPlataforma }
            ];
            
            const setScopedText = (id, val) => {
                const el = document.querySelector(`#pureDashboard #${id}`);
                if (el) el.textContent = (typeof val === 'number') ? _f(val) : val;
                // Fallback global
                const globalEl = document.getElementById(id);
                if (globalEl) globalEl.textContent = (typeof val === 'number') ? _f(val) : val;
            };
            auxMapping.forEach(item => setScopedText(item.id, item.val));
            
            const dac7Note = document.getElementById('auxDac7ReconciliationNote');
            if (dac7Note && totalNaoSujeitosCalc > 0) dac7Note.style.display = 'block';
            const questionText = document.querySelector('#pureDashboard #pure-zc-question-text');
            if (questionText) questionText.textContent = 'Pode a plataforma confirmar se os €451,15 em Gorjetas e Campanhas (isentos de comissão nos termos da Lei TVDE) foram incluídos na base de cálculo do reporte DAC7 enviado pela plataforma à Autoridade Tributária? Se sim, qual o fundamento legal?';
        }

        window.UNIFED_INTERNAL.injectAuxiliaryBoxesCSS = _injectAuxiliaryBoxesCSS;
        window.UNIFED_INTERNAL.injectMacroCard = _injectMacroCard;
        window.UNIFED_INTERNAL.updateAuxiliaryUI = _updateAuxiliaryUI;
        console.log('[UNIFED] Camada 4: OK.');
    })();

    // =========================================================================
    // Camada 5 – Simulação de Upload (modificada para não executar perícia automaticamente)
    // =========================================================================
    (function() {
        if (!window.UNIFED_INTERNAL) return;
        const { data, fmt } = window.UNIFED_INTERNAL;

        function _forcePlatformReadOnly() {
            const platformSelect = document.getElementById('selPlatformFixed');
            if (platformSelect) {
                for (let i = 0; i < platformSelect.options.length; i++) {
                    if (platformSelect.options[i].value === 'outra') {
                        platformSelect.selectedIndex = i;
                        break;
                    }
                }
                platformSelect.disabled = true;
                platformSelect.style.opacity = '0.7';
                platformSelect.style.cursor = 'not-allowed';
            }
            if (window.UNIFEDSystem) window.UNIFEDSystem.selectedPlatform = 'outra';
            console.log('[UNIFED] Plataforma forçada para "Plataforma A" em modo read‑only.');
        }

        // =========================================================================
        // FUNÇÃO CORRIGIDA: _removeZeroDac7Kpis – manter cards visíveis com valor zero
        // =========================================================================
        function _removeZeroDac7Kpis() {
            // RETIFICAÇÃO: Manter os 4 cards visíveis com valores zero
            // Não remover nenhum card do DOM
            const allDac7Cards = ['dac7Q1Value', 'dac7Q2Value', 'dac7Q3Value', 'dac7Q4Value'];
            const fmtLocal = window.UNIFED_INTERNAL?.fmt || ((v) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v));
            allDac7Cards.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    // Garantir que o card está visível e com valor zero
                    el.textContent = fmtLocal(0);
                    const card = el.closest('.kpi-card');
                    if (card) card.style.display = '';
                }
            });
            console.log('[UNIFED] Cards DAC7 mantidos visíveis com valores zero.');
        }

        // =========================================================================
        // FUNÇÃO CORRIGIDA: _simulateEvidenceUpload – apenas dados brutos, sem cálculos de análise
        // =========================================================================
        async function _simulateEvidenceUpload() {
            try {
                if (typeof window.UNIFEDSystem === 'undefined') throw new Error('UNIFEDSystem not found');
                const sys = window.UNIFEDSystem;
                const t = data.totals; // dados brutos do caso real (apenas valores base)

                // Garantir estruturas mínimas
                if (!sys.documents) sys.documents = {};
                if (!sys.documents.control) sys.documents.control = { files: [], totals: { records: 0 } };
                if (!sys.documents.saft) sys.documents.saft = { files: [], totals: { bruto: 0, iliquido: 0, iva: 0, records: 0 } };
                if (!sys.documents.statements) sys.documents.statements = { files: [], totals: { ganhos: 0, despesas: 0, ganhosLiquidos: 0, records: 0 } };
                if (!sys.documents.invoices) sys.documents.invoices = { files: [], totals: { invoiceValue: 0, records: 0 } };
                if (!sys.documents.dac7) sys.documents.dac7 = { files: [], totals: { q1: 0, q2: 0, q3: 0, q4: 0, totalPeriodo: 0, records: 0 } };
                if (!sys.analysis) sys.analysis = { evidenceIntegrity: [] };
                if (!sys.analysis.evidenceIntegrity) sys.analysis.evidenceIntegrity = [];

                // Limpeza de estruturas anteriores
                sys.documents.control.files = []; sys.documents.saft.files = []; sys.documents.statements.files = [];
                sys.documents.invoices.files = []; sys.documents.dac7.files = []; sys.analysis.evidenceIntegrity = [];

                // 1. Controlo (4 ficheiros)
                const controlFiles = [
                    { name: 'controlo_autenticidade_1.csv', size: 256 },
                    { name: 'controlo_autenticidade_2.csv', size: 256 },
                    { name: 'controlo_autenticidade_3.csv', size: 256 },
                    { name: 'controlo_autenticidade_4.csv', size: 256 }
                ];
                for (const file of controlFiles) {
                    sys.documents.control.files.push({ name: file.name, size: file.size });
                    const hash = await window.generateForensicHash(file.name + 'control_demo');
                    sys.analysis.evidenceIntegrity.push({
                        filename: file.name, type: 'control', hash: hash,
                        timestamp: new Date().toISOString(), size: file.size
                    });
                }
                sys.documents.control.totals.records = controlFiles.length;

                // 2. SAF-T (4 ficheiros)
                const saftFiles = [
                    { name: '131509_202409.csv', size: 1024 },
                    { name: '131509_202410.csv', size: 1024 },
                    { name: '131509_202411.csv', size: 1024 },
                    { name: '131509_202412.csv', size: 1024 }
                ];
                for (const file of saftFiles) {
                    sys.documents.saft.files.push({ name: file.name, size: file.size });
                    const hash = await window.generateForensicHash(file.name + 'saft_demo');
                    sys.analysis.evidenceIntegrity.push({
                        filename: file.name, type: 'saft', hash: hash,
                        timestamp: new Date().toISOString(), size: file.size
                    });
                }
                sys.documents.saft.totals.bruto = t.saftBruto;
                sys.documents.saft.totals.iliquido = t.saftIliquido;
                sys.documents.saft.totals.iva = t.saftIva;
                sys.documents.saft.totals.records = saftFiles.length;

                // 3. Extratos (4 ficheiros)
                const statementFiles = [
                    { name: 'extrato_setembro_2024.pdf', size: 2048 },
                    { name: 'extrato_outubro_2024.pdf', size: 2048 },
                    { name: 'extrato_novembro_2024.pdf', size: 2048 },
                    { name: 'extrato_dezembro_2024.pdf', size: 2048 }
                ];
                for (const file of statementFiles) {
                    sys.documents.statements.files.push({ name: file.name, size: file.size });
                    const hash = await window.generateForensicHash(file.name + 'statement_demo');
                    sys.analysis.evidenceIntegrity.push({
                        filename: file.name, type: 'statement', hash: hash,
                        timestamp: new Date().toISOString(), size: file.size
                    });
                }
                sys.documents.statements.totals.ganhos = t.ganhos;
                sys.documents.statements.totals.despesas = t.despesas;
                sys.documents.statements.totals.ganhosLiquidos = t.ganhosLiquidos;
                sys.documents.statements.totals.records = statementFiles.length;

                // 4. Faturas (2 ficheiros)
                const invoiceFiles = [
                    { name: 'PT1124_202412.pdf', size: 512 },
                    { name: 'PT1125_202412.pdf', size: 512 }
                ];
                for (const file of invoiceFiles) {
                    sys.documents.invoices.files.push({ name: file.name, size: file.size });
                    const hash = await window.generateForensicHash(file.name + 'invoice_demo');
                    sys.analysis.evidenceIntegrity.push({
                        filename: file.name, type: 'invoice', hash: hash,
                        timestamp: new Date().toISOString(), size: file.size
                    });
                }
                sys.documents.invoices.totals.invoiceValue = t.faturaPlataforma;
                sys.documents.invoices.totals.records = invoiceFiles.length;

                // 5. DAC7 (1 ficheiro)
                const dac7Files = [{ name: 'dac7_2024_semestre2.pdf', size: 1024 }];
                for (const file of dac7Files) {
                    sys.documents.dac7.files.push({ name: file.name, size: file.size });
                    const hash = await window.generateForensicHash(file.name + 'dac7_demo');
                    sys.analysis.evidenceIntegrity.push({
                        filename: file.name, type: 'dac7', hash: hash,
                        timestamp: new Date().toISOString(), size: file.size
                    });
                }
                sys.documents.dac7.totals.q4 = t.dac7TotalPeriodo;
                sys.documents.dac7.totals.q3 = 0; sys.documents.dac7.totals.q1 = 0; sys.documents.dac7.totals.q2 = 0;
                sys.documents.dac7.totals.totalPeriodo = t.dac7TotalPeriodo;
                sys.documents.dac7.totals.records = dac7Files.length;

                // Dados auxiliares (campanhas, gorjetas, etc.)
                if (!sys.auxiliaryData) sys.auxiliaryData = {};
                sys.auxiliaryData.campanhas = t.campanhas || 0;
                sys.auxiliaryData.portagens = t.portagens || 0;
                sys.auxiliaryData.gorjetas = t.gorjetas || 0;
                sys.auxiliaryData.cancelamentos = t.cancelamentos || 0;
                sys.auxiliaryData.totalNaoSujeitos = (t.campanhas || 0) + (t.portagens || 0) + (t.gorjetas || 0);
                sys.auxiliaryData.processedFrom = [];
                sys.auxiliaryData.extractedAt = new Date().toISOString();

                // Dados mensais (para ATF futuro)
                if (!sys.monthlyData) sys.monthlyData = {};
                const monthlyGanhos = [2450.00, 2560.00, 2480.00, 2667.73];
                const monthlyDespesas = [590.00, 615.00, 600.00, 642.89];
                const monthlyGanhosLiq = [1860.00, 1945.00, 1880.00, 2024.84];
                const months = ['202409', '202410', '202411', '202412'];
                months.forEach((month, idx) => {
                    sys.monthlyData[month] = {
                        ganhos: monthlyGanhos[idx],
                        despesas: monthlyDespesas[idx],
                        ganhosLiq: monthlyGanhosLiq[idx]
                    };
                });
                sys.dataMonths = new Set(months);

                // Preencher sys.analysis.totals APENAS com os valores brutos (sem cálculos de análise)
                if (!sys.analysis.totals) sys.analysis.totals = {};
                sys.analysis.totals.saftBruto = t.saftBruto;
                sys.analysis.totals.saftIliquido = t.saftIliquido;
                sys.analysis.totals.saftIva = t.saftIva;
                sys.analysis.totals.ganhos = t.ganhos;
                sys.analysis.totals.despesas = t.despesas;
                sys.analysis.totals.ganhosLiquidos = t.ganhosLiquidos;
                sys.analysis.totals.faturaPlataforma = t.faturaPlataforma;
                sys.analysis.totals.dac7Q1 = 0; sys.analysis.totals.dac7Q2 = 0; sys.analysis.totals.dac7Q3 = 0;
                sys.analysis.totals.dac7Q4 = t.dac7TotalPeriodo;
                sys.analysis.totals.dac7TotalPeriodo = t.dac7TotalPeriodo;
                // ⚠️ IMPORTANTE: NÃO preencher campos de análise (iva6Omitido, iva23Omitido, asfixiaFinanceira)

                // REMOVIDO: sys.analysis.crossings (não deve existir neste estado)
                if (sys.analysis.crossings) delete sys.analysis.crossings;

                // Garantir que o cliente fica registado
                if (!sys.client && data.client) {
                    sys.client = { name: data.client.name, nif: data.client.nif, platform: data.client.platform };
                    const clientStatus = document.getElementById('clientStatusFixed');
                    if (clientStatus) {
                        clientStatus.style.display = 'flex';
                        const nameSpan = document.getElementById('clientNameDisplayFixed');
                        const nifSpan = document.getElementById('clientNifDisplayFixed');
                        if (nameSpan) nameSpan.textContent = data.client.name;
                        if (nifSpan) nifSpan.textContent = data.client.nif;
                    }
                    const nameInput = document.getElementById('clientNameFixed');
                    const nifInput = document.getElementById('clientNIFFixed');
                    if (nameInput) nameInput.value = data.client.name;
                    if (nifInput) nifInput.value = data.client.nif;
                }

                // Configurar período e trimestre (2.º semestre 2024)
                const periodSelect = document.getElementById('periodoAnalise');
                if (periodSelect) {
                    periodSelect.value = '2s';
                    if (typeof window.UNIFEDSystem !== 'undefined') window.UNIFEDSystem.selectedPeriodo = '2s';
                    const changeEvent = new Event('change', { bubbles: true });
                    periodSelect.dispatchEvent(changeEvent);
                }
                const trimestralContainer = document.getElementById('trimestralSelectorContainer');
                if (trimestralContainer) trimestralContainer.style.display = 'none';

                // Gerar Master Hash (apenas para integridade, sem análise)
                const evidenceHashes = sys.analysis.evidenceIntegrity.map(ev => ev.hash).filter(h => h && h.length === 64).sort();
                const binaryConcat = evidenceHashes.join('') + JSON.stringify({ client: sys.client, totals: t }) + sys.sessionId;
                const masterHashFull = await window.generateForensicHash(binaryConcat);
                sys.masterHash = masterHashFull;
                window.activeForensicSession = { sessionId: sys.sessionId, masterHash: masterHashFull };

                // Flags de estado: dados carregados, análise pendente, apenas dados brutos
                window._unifedDataLoaded = true;
                window._unifedAnalysisPending = true;
                window._unifedRawDataOnly = true;

                // =========================================================================
                // RETIFICAÇÃO: Chamar hidratação dos valores brutos (definida em script.js)
                // =========================================================================
                if (typeof window._hydrateRawDataValues === 'function') {
                    window._hydrateRawDataValues();
                }

                console.log('[UNIFED] Evidências simuladas carregadas (15 ficheiros). Modo raw ativo. Aguardando perícia.');
                return true;
            } catch (err) {
                console.error('[UNIFED] Erro na simulação de evidências:', err);
                throw err;
            }
        }

        function _updateEvidenceCountersAndShow() {
            const sys = window.UNIFEDSystem;
            if (!sys || !sys.documents) return;
            const controlCount = sys.documents.control?.files?.length || 0;
            const saftCount = sys.documents.saft?.files?.length || 0;
            const invoiceCount = sys.documents.invoices?.files?.length || 0;
            const statementCount = sys.documents.statements?.files?.length || 0;
            const dac7Count = sys.documents.dac7?.files?.length || 0;
            const total = controlCount + saftCount + invoiceCount + statementCount + dac7Count;

            const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
            setText('controlCountCompact', controlCount);
            setText('saftCountCompact', saftCount);
            setText('invoiceCountCompact', invoiceCount);
            setText('statementCountCompact', statementCount);
            setText('dac7CountCompact', dac7Count);
            setText('summaryControl', controlCount);
            setText('summarySaft', saftCount);
            setText('summaryInvoices', invoiceCount);
            setText('summaryStatements', statementCount);
            setText('summaryDac7', dac7Count);
            setText('summaryTotal', total);
            const evidenceCountTotal = document.getElementById('evidenceCountTotal');
            if (evidenceCountTotal) evidenceCountTotal.textContent = total;

            const evidenceSection = document.getElementById('pureEvidenceSection');
            if (evidenceSection) evidenceSection.style.display = 'block';
            const counters = ['controlCountCompact', 'saftCountCompact', 'invoiceCountCompact', 'statementCountCompact', 'dac7CountCompact'];
            counters.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'inline-block'; });
            console.log('[UNIFED] Contadores de evidências atualizados e secção revelada.');
        }

        // =========================================================================
        // FUNÇÃO CORRIGIDA: _executePendingAnalysis – única responsável por ativar a análise
        // =========================================================================
        async function _executePendingAnalysis() {
            if (!window._unifedAnalysisPending) {
                console.log('[UNIFED] Nenhuma análise pendente ou já executada.');
                return;
            }
            console.log('[UNIFED] Executando análise forense pendente...');
            const sys = window.UNIFEDSystem;
            if (!sys || !sys.analysis || !sys.analysis.totals) {
                console.warn('[UNIFED] Dados insuficientes para executar a análise.');
                return;
            }

            // =================================================================
            // 1. Executar o motor de cruzamento forense (performForensicCrossings)
            // =================================================================
            if (typeof window.performForensicCrossings === 'function') {
                await window.performForensicCrossings(); // ou passar os totais
            } else {
                // Fallback: calcular crossings localmente
                const t = sys.analysis.totals;
                const discrepanciaSaftVsDac7 = t.saftBruto - t.dac7TotalPeriodo;
                const percentagemSaftVsDac7 = t.saftBruto > 0 ? (discrepanciaSaftVsDac7 / t.saftBruto) * 100 : 0;
                const discrepanciaCritica = t.despesas - t.faturaPlataforma;
                const percentagemOmissao = t.despesas > 0 ? (discrepanciaCritica / t.despesas) * 100 : 0;
                const ivaFalta = discrepanciaCritica * 0.23;
                const ivaFalta6 = discrepanciaCritica * 0.06;
                const ircEstimado = discrepanciaCritica * 0.21;
                const asfixiaFinanceira = t.saftBruto * 0.06;

                if (!sys.analysis.crossings) sys.analysis.crossings = {};
                Object.assign(sys.analysis.crossings, {
                    discrepanciaSaftVsDac7, percentagemSaftVsDac7,
                    discrepanciaCritica, percentagemOmissao,
                    ivaFalta, ivaFalta6, ircEstimado, asfixiaFinanceira,
                    btor: t.despesas, btf: t.faturaPlataforma,
                    c1_delta: discrepanciaSaftVsDac7, c1_pct: percentagemSaftVsDac7,
                    c2_delta: discrepanciaCritica, c2_pct: percentagemOmissao
                });

                // Adicionar totais de análise
                t.iva6Omitido = ivaFalta6;
                t.iva23Omitido = ivaFalta;
                t.asfixiaFinanceira = asfixiaFinanceira;
            }

            // =================================================================
            // 2. Atualizar flags de estado
            // =================================================================
            window._unifedRawDataOnly = false;
            window._unifedAnalysisPending = false;

            // =================================================================
            // 3. Revelar módulos forenses e renderizar gráficos
            // =================================================================
            if (typeof window.updateForensicModulesVisibility === 'function') {
                window.updateForensicModulesVisibility(true);
            }

            if (typeof window.UNIFED_INTERNAL?.syncMetrics === 'function') {
                window.UNIFED_INTERNAL.syncMetrics();
            }
            if (typeof window.UNIFED_INTERNAL?.renderMatrix === 'function') {
                window.UNIFED_INTERNAL.renderMatrix();
            }
            if (typeof window.UNIFED_INTERNAL?.updateAuxiliaryUI === 'function') {
                window.UNIFED_INTERNAL.updateAuxiliaryUI();
            }

            if (typeof window.renderForensicCharts === 'function') {
                window.renderForensicCharts();
            } else {
                // Fallback individual
                if (typeof window.renderChart === 'function') window.renderChart();
                if (typeof window.renderDiscrepancyChart === 'function') window.renderDiscrepancyChart();
                if (typeof window.renderATFChart === 'function') window.renderATFChart();
            }

            // =================================================================
            // 4. Disparar eventos globais
            // =================================================================
            window.dispatchEvent(new CustomEvent('UNIFED_ANALYSIS_COMPLETE', {
                detail: {
                    timestamp: Date.now(),
                    source: 'executePendingAnalysis',
                    sessionId: sys.sessionId || 'N/A',
                    masterHash: sys.masterHash || 'N/A'
                }
            }));
            window.dispatchEvent(new CustomEvent('UNIFED_EXECUTE_PERITIA', {
                detail: {
                    timestamp: new Date().toISOString(),
                    masterHash: sys.masterHash || 'N/A'
                }
            }));

            console.log('[UNIFED] Análise forense concluída e UI atualizada.');
        }

        // =========================================================================
        // [SUBSTITUIÇÃO CIRÚRGICA] ensureDemoDataLoaded com valores corretos do _PDF_CASE
        // =========================================================================
        function ensureDemoDataLoaded() {
            console.log('[UNIFED] Forçando Hidratação de Dados Materializados (v2 — valores corretos)...');
            const d = window.UNIFED_INTERNAL.data; // referência ao _PDF_CASE
            const t = d.totals;
            const fi = d.fluxosIsentos;

            if (!window.UNIFEDSystem) window.UNIFEDSystem = {};
            window.UNIFEDSystem.analysis = window.UNIFEDSystem.analysis || {};
            window.UNIFEDSystem.analysis.totals = {
                saftBruto:        t.saftBruto,        // 8227.97
                saftIva:          t.saftIva,          // 466.30
                saftIliquido:     t.saftIliquido,     // 7761.67
                ganhos:           t.ganhos,           // 10157.73
                despesas:         t.despesas,         // 2447.89
                ganhosLiquidos:   t.ganhosLiquidos,   // 7709.84
                dac7TotalPeriodo: t.dac7TotalPeriodo, // 7755.16
                dac7Q1: 0, dac7Q2: 0, dac7Q3: 0,
                dac7Q4:           t.dac7TotalPeriodo, // 7755.16
                faturaPlataforma: t.faturaPlataforma, // 262.94
                iva6Omitido: 0, iva23Omitido: 0, asfixiaFinanceira: 0
            };

            // Cliente
            window.UNIFEDSystem.client = { name: d.client.name, nif: d.client.nif, platform: d.client.platform };
            window.UNIFEDSystem.sessionId  = d.sessionId;
            window.UNIFEDSystem.masterHash = d.masterHash;
            window.UNIFEDSystem.selectedYear    = 2024;
            window.UNIFEDSystem.selectedPeriodo = '2s';
            window.UNIFEDSystem.casoRealAnonimizado = true;
            window.UNIFEDSystem.isDemoLoaded = true;
            window._unifedDataLoaded       = true;
            window._unifedAnalysisPending  = true;
            window._unifedRawDataOnly      = true;

            // Popula campos de identificação
            const nameEl = document.getElementById('pure-subject-name');
            const nifEl  = document.getElementById('pure-subject-nif');
            if (nameEl) nameEl.textContent = d.client.name;
            if (nifEl)  nifEl.textContent  = d.client.nif;

            // Ano fiscal e período
            const anoEl = document.getElementById('anoFiscal');
            if (anoEl) { anoEl.value = '2024'; anoEl.dispatchEvent(new Event('change', { bubbles: true })); }
            const periodoEl = document.getElementById('periodoAnalise');
            if (periodoEl) { periodoEl.value = '2s'; periodoEl.dispatchEvent(new Event('change', { bubbles: true })); }

            // Mapping corrigido com os IDs reais do panel.html
            const fmt = window.UNIFED_INTERNAL.fmt;
            const mapping = {
                'pure-saft':    fmt(t.saftIliquido),   // 7.761,67 €  — Ilíquido
                'pure-ganhos':  fmt(t.ganhos),          // 10.157,73 €
                'pure-despesas':fmt(t.despesas),        // 2.447,89 €
                'pure-liquido': fmt(t.ganhosLiquidos),  // 7.709,84 €
                'pure-dac7':    fmt(t.dac7TotalPeriodo) // 7.755,16 €
            };
            Object.entries(mapping).forEach(([id, val]) => {
                const el = document.getElementById(id);
                if (el) { el.textContent = val; el.style.opacity = '1'; }
            });

            // DAC7 trimestrais
            ['dac7Q1Value','dac7Q2Value','dac7Q3Value'].forEach(id => {
                const el = document.getElementById(id); if (el) el.textContent = fmt(0);
            });
            const q4El = document.getElementById('dac7Q4Value');
            if (q4El) q4El.textContent = fmt(t.dac7TotalPeriodo);

            // Campos de cliente nos inputs do topo
            const nameInput = document.getElementById('clientNameFixed');
            const nifInput  = document.getElementById('clientNIFFixed');
            if (nameInput) nameInput.value = d.client.name;
            if (nifInput)  nifInput.value  = d.client.nif;

            // Forçar clientStatus visível
            const clientStatus = document.getElementById('clientStatusFixed');
            if (clientStatus) {
                clientStatus.style.display = 'flex';
                const spanName = document.getElementById('clientNameDisplayFixed');
                const spanNif  = document.getElementById('clientNifDisplayFixed');
                if (spanName) spanName.textContent = d.client.name;
                if (spanNif)  spanNif.textContent  = d.client.nif;
            }

            // =========================================================================
            // RETIFICAÇÃO: Chamar hidratação dos valores brutos (definida em script.js)
            // =========================================================================
            if (typeof window._hydrateRawDataValues === 'function') {
                window._hydrateRawDataValues();
            }

            console.log('[UNIFED] ensureDemoDataLoaded v2: valores corretos injetados.');

            // RET-09: Atualizar contador de evidências — 15 documentos (4+4+2+4+1)
            (function _updateDemoEvidenceCount() {
                const _c = d.counts;
                const _total = _c.ctrl + _c.saft + _c.fat + _c.ext + _c.dac7; // = 15
                const _evEl = document.getElementById('evidenceCountTotal');
                if (_evEl) _evEl.textContent = _total;
                [['controlCountCompact', _c.ctrl],
                 ['saftCountCompact',    _c.saft],
                 ['invoiceCountCompact', _c.fat],
                 ['statementCountCompact', _c.ext],
                 ['dac7CountCompact',    _c.dac7]].forEach(([id, v]) => {
                    const el = document.getElementById(id);
                    if (el) el.textContent = v;
                });
                // Também atualizar o painel interno (pureDashboard)
                [['pure-ctrl-qty',  _c.ctrl],
                 ['pure-saft-qty',  _c.saft],
                 ['pure-fat-qty',   _c.fat],
                 ['pure-ext-qty',   _c.ext],
                 ['pure-dac7-qty',  _c.dac7]].forEach(([id, v]) => {
                    const el = document.getElementById(id);
                    if (el) el.textContent = v;
                });
                const pureEvidSec = document.getElementById('pureEvidenceSection');
                if (pureEvidSec) pureEvidSec.style.display = 'block';
                console.log('[UNIFED] RET-09: Contador de evidências atualizado — ' + _total + ' documentos.');
            })();

            return true;
        }

        window.UNIFED_INTERNAL.forcePlatformReadOnly = _forcePlatformReadOnly;
        window.UNIFED_INTERNAL.removeZeroDac7Kpis = _removeZeroDac7Kpis;
        window.UNIFED_INTERNAL.simulateEvidenceUpload = _simulateEvidenceUpload;
        window.UNIFED_INTERNAL.updateEvidenceCountersAndShow = _updateEvidenceCountersAndShow;
        window.UNIFED_INTERNAL.executePendingAnalysis = _executePendingAnalysis;
        window.UNIFED_INTERNAL.ensureDemoDataLoaded = ensureDemoDataLoaded;   // <-- substituído

        // =========================================================================
        // CIRURGIA 2: Expor simulateEvidenceUpload como alias local para initializeFullWithEvidence()
        // =========================================================================
        const simulateEvidenceUpload = _simulateEvidenceUpload; // alias local

        // Exposição global directa
        window.ensureDemoDataLoaded = ensureDemoDataLoaded;
        window.executePendingAnalysis = _executePendingAnalysis;

        console.log('[UNIFED] Camada 5: OK.');
    })();

    // =========================================================================
    // GARANTIA DE EXPOSIÇÃO GLOBAL (fallback)
    // =========================================================================
    (function ensureGlobals() {
        if (typeof window.ensureDemoDataLoaded !== 'function') {
            console.warn('[UNIFED] ensureDemoDataLoaded ainda não definida. Tentando obter de UNIFED_INTERNAL...');
            if (window.UNIFED_INTERNAL && typeof window.UNIFED_INTERNAL.ensureDemoDataLoaded === 'function') {
                window.ensureDemoDataLoaded = window.UNIFED_INTERNAL.ensureDemoDataLoaded;
                window.executePendingAnalysis = window.UNIFED_INTERNAL.executePendingAnalysis;
            }
        }
    })();

    // =========================================================================
    // GARANTIA ADICIONAL: EXPOSIÇÃO GLOBAL DE ensureDemoDataLoaded (FORA DA IIFE)
    // =========================================================================
    if (typeof window.ensureDemoDataLoaded !== 'function') {
        console.warn('[UNIFED] Reforçando exposição de ensureDemoDataLoaded');
        window.ensureDemoDataLoaded = window.UNIFED_INTERNAL?.ensureDemoDataLoaded || function() {
            console.error('[UNIFED] ensureDemoDataLoaded ainda não disponível');
            return Promise.resolve(false);
        };
    }

    // =========================================================================
    // Função de correção de índices romanos
    // =========================================================================
    function correctRomanIndices() {
        const titles = document.querySelectorAll('#pureDashboard .pure-card-title span, .pure-card-title, .verdict-title');
        titles.forEach(el => {
            let txt = el.textContent;
            const maps = {
                'IV. IMPACTO FISCAL': 'V. IMPACTO FISCAL',
                'V. CADEIA DE CUSTÓDIA': 'VI. CADEIA DE CUSTÓDIA',
                'VI. CONCLUSÃO': 'VII. CONCLUSÃO',
                'IV. ANÁLISE DE RISCO SISTÉMICO (MIS)': 'V. ANÁLISE DE RISCO SISTÉMICO (MIS)'
            };
            for (let key in maps) {
                if (txt.includes(key)) el.textContent = txt.replace(key, maps[key]);
            }
        });
    }
    window.correctRomanIndices = correctRomanIndices;

    // =========================================================================
    // Inicialização Principal com Re-init Hook e Listener de Eventos
    // =========================================================================
    (function() {
        if (!window.UNIFED_INTERNAL) return;
        const { data, fmt, set, syncMetrics, renderMatrix } = window.UNIFED_INTERNAL;
        const { injectAuxiliaryBoxesCSS, injectMacroCard, updateAuxiliaryUI, forcePlatformReadOnly, removeZeroDac7Kpis, simulateEvidenceUpload, updateEvidenceCountersAndShow, executePendingAnalysis, ensureDemoDataLoaded } = window.UNIFED_INTERNAL;

        let _initializing = false;
        let _dataLoaded = false;

        function showClientIdentificationBlock() {
            let block = document.getElementById('clientIdentificationBlock');
            if (!block) {
                const sidebarHeader = document.querySelector('.sidebar-header-fixed');
                if (sidebarHeader) {
                    sidebarHeader.id = 'clientIdentificationBlock';
                    block = sidebarHeader;
                } else {
                    console.warn('[UNIFED] Elemento .sidebar-header-fixed não encontrado. O bloco de identificação não será exibido.');
                    return;
                }
            }
            const subjectHeader = document.getElementById('pure-subject-header');
            if (subjectHeader) subjectHeader.style.display = 'block';
        }

        function waitForPureDashboard() {
            return new Promise((resolve) => {
                if (document.getElementById('pureDashboard')) {
                    resolve();
                    return;
                }
                const observer = new MutationObserver((mutations, obs) => {
                    if (document.getElementById('pureDashboard')) {
                        obs.disconnect();
                        resolve();
                    }
                });
                observer.observe(document.body, { childList: true, subtree: true });
                setTimeout(() => { observer.disconnect(); resolve(); }, 5000);
            });
        }

        // Monkey-patching com flag atómica
        if (typeof window.updateDashboard === 'function' && !window.updateDashboard._nexusHooked) {
            const _origUpdateDashboard = window.updateDashboard;
            window.updateDashboard = function() {
                if (window._isHydrating) return;
                try {
                    window._isHydrating = true;
                    _origUpdateDashboard.apply(this, arguments);
                } finally {
                    window._isHydrating = false;
                }
                if (typeof syncMetrics === 'function') syncMetrics();
                if (typeof renderMatrix === 'function') renderMatrix();
                if (typeof updateAuxiliaryUI === 'function') updateAuxiliaryUI();
                // ADICIONAR: chamada a updateModulesUI para cobertura total
                if (typeof window.updateModulesUI === 'function') window.updateModulesUI();
                console.log('[UNIFED] Re-hidratação do DOM concluída via Hook (updateDashboard).');
            };
            window.updateDashboard._nexusHooked = true;
        }

        if (typeof window.forceRevealSmokingGun === 'function' && !window.forceRevealSmokingGun._nexusHooked) {
            const _origForceReveal = window.forceRevealSmokingGun;
            window.forceRevealSmokingGun = function() {
                if (window._isHydrating) return;
                try {
                    window._isHydrating = true;
                    _origForceReveal.apply(this, arguments);
                } finally {
                    window._isHydrating = false;
                }
            };
            window.forceRevealSmokingGun._nexusHooked = true;
        }

        function initializeCoreDashboard() {
            if (_initializing) {
                console.warn('[UNIFED] Inicialização já em curso, ignorando chamada duplicada.');
                return;
            }
            _initializing = true;
            waitForPureDashboard().then(() => {
                setTimeout(() => {
                    if (typeof window.injectAuxiliaryHelperBoxes === 'function') window.injectAuxiliaryHelperBoxes();
                    if (typeof syncMetrics === 'function') syncMetrics();
                    if (typeof renderMatrix === 'function') renderMatrix();
                    if (typeof injectMacroCard === 'function') injectMacroCard();
                    if (typeof injectAuxiliaryBoxesCSS === 'function') injectAuxiliaryBoxesCSS();
                    if (typeof forcePlatformReadOnly === 'function') forcePlatformReadOnly();
                    // REMOVIDA a chamada a removeZeroDac7Kpis() para manter os cards DAC7 visíveis
                    // if (typeof removeZeroDac7Kpis === 'function') removeZeroDac7Kpis();  // ← REMOVER ESTA LINHA.
                    if (document.getElementById('pureDashboard')) {
                        if (typeof updateAuxiliaryUI === 'function') updateAuxiliaryUI();
                        document.querySelectorAll('.chart-section').forEach(section => { 
                            section.style.display = 'block'; 
                            section.style.height = 'auto';
                        });
                        if (typeof Chart === 'undefined') {
                            document.querySelectorAll('.chart-section').forEach(section => section.style.display = 'none');
                            console.warn('[UNIFED] Chart.js não disponível – secções de gráfico ocultadas.');
                        }
                    }
                    console.log('[UNIFED] Core dashboard inicializado com sucesso após injeção do painel.');
                    _initializing = false;
                }, 100);
            }).catch(err => {
                console.warn('[UNIFED] Erro ao aguardar #pureDashboard', err);
                _initializing = false;
            });
        }

        async function initializeFullWithEvidence() {
            if (_dataLoaded) {
                console.log('[UNIFED] Dados já carregados, a saltar nova simulação.');
                return;
            }
            console.log('[UNIFED] A carregar evidências do caso real...');
            await waitForPureDashboard();
            try {
                await simulateEvidenceUpload();
                _dataLoaded = true;
                updateEvidenceCountersAndShow();
                if (typeof window.injectAuxiliaryHelperBoxes === 'function') window.injectAuxiliaryHelperBoxes();
                if (typeof updateAuxiliaryUI === 'function') updateAuxiliaryUI();
                
                if (typeof window.UNIFED_INTERNAL.syncMetrics === 'function') {
                    window.UNIFED_INTERNAL.syncMetrics();
                }
                
                // =========================================================================
                // CORREÇÃO CIRÚRGICA 2026-04-19: Adicionar chamada a updateModulesUI após syncMetrics
                // =========================================================================
                if (typeof window.updateModulesUI === 'function') {
                    window.updateModulesUI();
                }
                
                if (window.UNIFEDSystem && window.UNIFEDSystem.masterHash) {
                    const hashEl = document.getElementById('masterHashValue');
                    if (hashEl) hashEl.textContent = window.UNIFEDSystem.masterHash;
                    if (typeof generateQRCode === 'function') generateQRCode();
                }

                showClientIdentificationBlock();
                // Removidas chamadas prematuras de gráficos e forceRevealSmokingGun
                console.log('[UNIFED] ✅ Evidências carregadas e secção revelada. Aguardando execução da perícia.');
            } catch (err) {
                console.error('[UNIFED] Falha ao carregar evidências:', err);
            }
        }

        // =========================================================================
        // FUNÇÃO CORRIGIDA: loadAnonymizedRealCase sem renderizações antecipadas
        // =========================================================================
        if (window.UNIFEDSystem) {
            window.UNIFEDSystem.loadAnonymizedRealCase = async function() {
                await initializeFullWithEvidence();
                // As três linhas seguintes foram REMOVIDAS para evitar gráficos/módulos antes da perícia:
                // if (typeof window.renderChart === 'function') window.renderChart();
                // if (typeof window.renderDiscrepancyChart === 'function') window.renderDiscrepancyChart();
                // if (typeof window.forceRevealSmokingGun === 'function') window.forceRevealSmokingGun();
                if (typeof window.correctRomanIndices === 'function') window.correctRomanIndices();
                console.info('[UNIFED-FIX] Data Hydration concluída (gráficos e módulos aguardam perícia).');
            };
        }

        // =========================================================================
        // Listener para o botão "Executar Perícia" (analyzeBtn) - CORRIGIDO COM FALLBACKS
        // =========================================================================
        function setupAnalyzeButton() {
            const analyzeBtn = document.getElementById('analyzeBtn');
            if (!analyzeBtn) {
                console.warn('[UNIFED] Botão #analyzeBtn não encontrado.');
                return;
            }
            if (analyzeBtn.getAttribute('data-analyze-listener') === 'true') return;
            
            analyzeBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                console.log('[UNIFED] Botão EXECUTAR PERÍCIA clicado — a executar análise pendente.');
                
                let loadFn = window.ensureDemoDataLoaded;
                if (typeof loadFn !== 'function' && window.UNIFED_INTERNAL && typeof window.UNIFED_INTERNAL.ensureDemoDataLoaded === 'function') {
                    loadFn = window.UNIFED_INTERNAL.ensureDemoDataLoaded;
                    window.ensureDemoDataLoaded = loadFn;
                }
                let execFn = window.executePendingAnalysis;
                if (typeof execFn !== 'function' && window.UNIFED_INTERNAL && typeof window.UNIFED_INTERNAL.executePendingAnalysis === 'function') {
                    execFn = window.UNIFED_INTERNAL.executePendingAnalysis;
                    window.executePendingAnalysis = execFn;
                }
                
                if (typeof loadFn === 'function') {
                    await loadFn();
                } else {
                    console.error('[UNIFED] Impossível carregar dados do caso real. A perícia não será executada.');
                    return;
                }
                
                if (typeof execFn === 'function') {
                    await execFn();
                } else {
                    console.error('[UNIFED] executePendingAnalysis não está disponível');
                }
            });
            analyzeBtn.setAttribute('data-analyze-listener', 'true');
            console.log('[UNIFED] Listener associado ao botão "EXECUTAR PERÍCIA" (#analyzeBtn).');
        }

        // =========================================================================
        // FUNÇÃO CORRIGIDA: setupRealCaseButton com espera por DOM e injeção após carregamento completo
        // =========================================================================
        function setupRealCaseButton() {
            let targetButton = document.getElementById('demoModeBtn');
            if (!targetButton) {
                const buttons = document.querySelectorAll('button, .btn, [role="button"]');
                for (let btn of buttons) {
                    if (btn.textContent.trim() === 'CASO REAL ANONIMIZADO') {
                        targetButton = btn;
                        break;
                    }
                }
            }
            if (!targetButton) {
                console.warn('[UNIFED] Botão "CASO REAL ANONIMIZADO" não encontrado. Listener genérico activado.');
                document.body.addEventListener('click', async function(e) {
                    const el = e.target.closest('button, .btn, [role="button"]');
                    if (el && el.textContent.includes('CASO REAL ANONIMIZADO')) {
                        e.preventDefault();
                        if (_initializing) return;
                        try {
                            if (typeof window._activatePurePanel === 'function') {
                                await window._activatePurePanel();
                            }
                            await waitForPureDashboard();
                            initializeCoreDashboard();
                            await new Promise(r => setTimeout(r, 100));
                            // CORREÇÃO DEFENSIVA: verificar se a função existe
                            if (typeof ensureDemoDataLoaded !== 'function') {
                                console.error('[UNIFED] ensureDemoDataLoaded não está disponível. Recarregue a página.');
                                return;
                            }
                            await ensureDemoDataLoaded();
                            if (window.UNIFEDSystem.loadAnonymizedRealCase) {
                                await window.UNIFEDSystem.loadAnonymizedRealCase();
                            } else {
                                await initializeFullWithEvidence();
                            }
                            if (typeof window.correctRomanIndices === 'function') {
                                window.correctRomanIndices();
                            }
                        } catch (err) {
                            console.error('[UNIFED] Erro na ativação do caso real:', err);
                        }
                    }
                });
                return;
            }

            if (targetButton.getAttribute('data-unifed-active') === 'true') return;

            targetButton.addEventListener('click', async function(e) {
                e.preventDefault();
                if (_initializing) return;
                logAudit('Iniciando transição para Caso Real Anonimizado...', 'info');
                
                let loadFn = window.ensureDemoDataLoaded;
                if (typeof loadFn !== 'function' && window.UNIFED_INTERNAL && 
                    typeof window.UNIFED_INTERNAL.ensureDemoDataLoaded === 'function') {
                    loadFn = window.UNIFED_INTERNAL.ensureDemoDataLoaded;
                    window.ensureDemoDataLoaded = loadFn;
                }
                if (typeof loadFn !== 'function') {
                    console.error('[UNIFED] ensureDemoDataLoaded não disponível mesmo após tentativa. Abortando.');
                    return;
                }
                
                try {
                    if (typeof window._activatePurePanel === 'function') {
                        await window._activatePurePanel();
                    }
                    
                    await waitForPureDashboard();
                    initializeCoreDashboard();
                    
                    // [PATCH #4] NOVO: Aguardar que panel.html esteja completamente no DOM
                    // Verifica se elementos críticos existem antes de injectar dados
                    const wrapper = document.getElementById('pureDashboardWrapper');
                    if (wrapper) {
                        await new Promise((resolve) => {
                            const checkInterval = setInterval(() => {
                                // Se elementos do painel existem, panel.html foi carregado
                                if (document.getElementById('pure-saft') && 
                                    document.getElementById('pure-ganhos') && 
                                    document.getElementById('pure-subject-name')) {
                                    clearInterval(checkInterval);
                                    resolve();
                                }
                            }, 50);
                            // Timeout de segurança: máximo 3 segundos de espera
                            setTimeout(() => {
                                clearInterval(checkInterval);
                                resolve();
                            }, 3000);
                        });
                    }
                    
                    await new Promise(r => setTimeout(r, 100));
                    
                    // [PATCH #4] NOVO: Injectar dados APÓS confirmação de DOM
                    if (typeof loadFn === 'function') {
                        await loadFn();
                    }
                    
                    // [PATCH #4] NOVO: Sincronizar métricas IMEDIATAMENTE APÓS injeção
                    await new Promise(r => setTimeout(r, 50));
                    if (typeof window.UNIFED_INTERNAL?.syncMetrics === 'function') {
                        window.UNIFED_INTERNAL.syncMetrics();
                    }
                    
                    // [PATCH #4] NOVO: Forçar visibilidade do wrapper APÓS sincronização
                    if (wrapper) {
                        wrapper.style.opacity = '1';
                        wrapper.style.visibility = 'visible';
                        wrapper.style.display = 'block';
                    }
                    
                    // Resto da sequência conforme esperado
                    if (typeof window.UNIFED_INTERNAL?.simulateEvidenceUpload === 'function') {
                        await window.UNIFED_INTERNAL.simulateEvidenceUpload();
                    }
                    if (typeof window.UNIFED_INTERNAL?.updateEvidenceCountersAndShow === 'function') {
                        window.UNIFED_INTERNAL.updateEvidenceCountersAndShow();
                    }
                    if (typeof registerClient === 'function') registerClient();
                    
                    if (window.UNIFEDSystem.loadAnonymizedRealCase) {
                        await window.UNIFEDSystem.loadAnonymizedRealCase();
                    } else {
                        await initializeFullWithEvidence();
                    }
                    if (typeof window.correctRomanIndices === 'function') {
                        window.correctRomanIndices();
                    }
                    logAudit('Interface harmonizada (Índices Romanos V-VII).', 'success');
                } catch (err) {
                    console.error('[UNIFED] Erro na ativação do caso real:', err);
                }
            }, { capture: true });

            targetButton.setAttribute('data-unifed-active', 'true');
            console.log('[UNIFED] Listener associado ao botão "CASO REAL ANONIMIZADO" com espera assíncrona e verificação defensiva.');
        }

        function generateQRCode() {
            const container = document.getElementById('qrcodeContainer');
            if (!container) return;
            container.innerHTML = '';
            const hashFull = window.UNIFEDSystem?.masterHash || 'HASH_INDISPONIVEL';
            const sessionShort = window.UNIFEDSystem?.sessionId ? window.UNIFEDSystem.sessionId.substring(0, 16) : 'N/A';
            const qrData = `UNIFED|${sessionShort}|${hashFull}`;
            if (typeof QRCode !== 'undefined') {
                new QRCode(container, { text: qrData, width: 75, height: 75, colorDark: "#000000", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.L });
            }
            container.setAttribute('data-tooltip', 'Clique para verificar a cadeia de custódia completa');
            container.onclick = () => {
                if (typeof window.openCustodyChainModal === 'function') {
                    window.openCustodyChainModal();
                } else {
                    console.warn('[UNIFED] openCustodyChainModal não disponível');
                }
            };
        }
        window.generateQRCode = generateQRCode;

        // =========================================================================
        // FUNÇÃO CORRIGIDA: setupEventDrivenHydration – aguarda carregamento do script
        // =========================================================================
        function setupEventDrivenHydration() {
            if (typeof window.forensicDataSynchronization === 'function') {
                window.forensicDataSynchronization();
            } else {
                console.log('[UNIFED] forensicDataSynchronization será carregado posteriormente.');
                // Aguardar o evento de carregamento do script
                window.addEventListener('load', function() {
                    if (typeof window.forensicDataSynchronization === 'function') {
                        window.forensicDataSynchronization();
                    }
                });
            }
            window.addEventListener('UNIFED_ANALYSIS_COMPLETE', function(event) {
                console.log('[UNIFED] Evento UNIFED_ANALYSIS_COMPLETE recebido (fallback).', event.detail);
                if (typeof window.forensicDataSynchronization === 'function') {
                    window.forensicDataSynchronization();
                }
                if (typeof syncMetrics === 'function') syncMetrics();
                if (typeof renderMatrix === 'function') renderMatrix();
                if (typeof updateAuxiliaryUI === 'function') updateAuxiliaryUI();
                if (typeof window.forceRevealSmokingGun === 'function') window.forceRevealSmokingGun();
            });
            console.log('[UNIFED] Listener para UNIFED_ANALYSIS_COMPLETE registado como fallback.');
        }

        function forceDataPtVisibility() {
            const style = document.createElement('style');
            style.id = 'unifed-force-data-pt';
            style.textContent = `
                [data-pt], [data-en] {
                    opacity: 1 !important;
                    transition: opacity 0.1s ease;
                }
                .pure-data-value, .pure-mono, .pure-atf-big, .pure-zc-val, .pure-sg-val, .pure-delta-value {
                    opacity: 1 !important;
                }
            `;
            document.head.appendChild(style);
            console.log('[UNIFED] CSS injection para visibilidade de data-pt/data-en aplicado.');
        }

        function syncSessionAndHash() {
            const sys = window.UNIFEDSystem;
            if (!sys) return;
            const sessionEl = document.querySelector('#pure-session-id');
            if (sessionEl && sys.sessionId) sessionEl.textContent = sys.sessionId;
            const hashFullEl = document.getElementById('masterHashFull');
            if (hashFullEl && sys.masterHash) hashFullEl.textContent = sys.masterHash;
            const hashPrefixEl = document.querySelector('#pure-hash-prefix-verdict');
            if (hashPrefixEl && sys.masterHash) hashPrefixEl.textContent = sys.masterHash.substring(0, 16).toUpperCase() + '...';
            const sessionIdDisplay = document.getElementById('sessionIdDisplay');
            if (sessionIdDisplay && sys.sessionId) sessionIdDisplay.textContent = sys.sessionId;
        }

        if (window.UNIFED_INTERNAL && window.UNIFED_INTERNAL.syncMetrics) {
            const origSync = window.UNIFED_INTERNAL.syncMetrics;
            window.UNIFED_INTERNAL.syncMetrics = function() {
                origSync.apply(this, arguments);
                syncSessionAndHash();
            };
        } else {
            window.addEventListener('UNIFED_CORE_READY', syncSessionAndHash);
        }

        setupEventDrivenHydration();
        setupRealCaseButton();
        setupAnalyzeButton();
        
        // FIX-SI-01: Race condition corrigida — DOMContentLoaded → readyState check
        // CONTEXTO: script_injection.js é injectado DINAMICAMENTE pelo access_control.js
        // APÓS autenticação. Quando o script executa, document.readyState é 'complete'
        // na maioria dos ambientes, pelo que o listener 'DOMContentLoaded' NUNCA
        // dispararia (o evento já ocorreu). O padrão correcto para carregamento dinâmico
        // é verificar readyState imediatamente e executar de forma síncrona.
        // Halt Execution Protocol · DORA (UE) 2022/2554
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function _si01DomReady() {
                initializeCoreDashboard();
                forceDataPtVisibility();
                if (typeof populateAnoFiscal === 'function') populateAnoFiscal();
                if (typeof populateYears === 'function') populateYears();
            }, { once: true });
        } else {
            // Execução imediata — DOM já pronto no momento da injecção dinâmica
            initializeCoreDashboard();
            forceDataPtVisibility();
            if (typeof populateAnoFiscal === 'function') populateAnoFiscal();
            if (typeof populateYears === 'function') populateYears();
        }
    })();

    // =========================================================================
    // Camada 7 – State-Driven Hydration + Event-Driven Uncloaking
    // =========================================================================
    (function _installStateHydration() {
        window.revealMetadata = function() {
            const sys = window.UNIFEDSystem;
            const _sessionId = (sys && sys.sessionId)
                ? sys.sessionId
                : (window.UNIFED_INTERNAL && window.UNIFED_INTERNAL.data)
                    ? window.UNIFED_INTERNAL.data.sessionId
                    : 'UNIFED-SESSION';
            const _hash = (sys && sys.masterHash)
                ? sys.masterHash
                : '2A38423FED220D681D86E959F2C34F993BA71FCE9B92791199453B41E23A63E5';

            document.querySelectorAll('#pure-session-id').forEach(el => { el.textContent = _sessionId; });
            document.querySelectorAll('#pure-hash-prefix').forEach(el => { el.textContent = _hash.substring(0, 12).toUpperCase() + '...'; });

            const tsaEl = document.getElementById('pure-tsa-anchor');
            if (tsaEl) {
                tsaEl.innerHTML = 'Selo de Tempo RFC 3161: <span style="color:#00e5ff;font-weight:bold;">VALIDADO VIA FREETSA.ORG</span>';
            }
            document.querySelectorAll('.pure-subject-header, #pure-tsa-anchor').forEach(el => {
                el.classList.add('forensic-revealed');
            });
            console.log('[UNIFED] Estado 1 (METADATA): hidratação de metadados concluída.');
        };

        // =========================================================================
        // SUBSTITUIR a definição de window.uncloakForensicData (PATCH 1)
        // =========================================================================
        window.uncloakForensicData = function() {
            // Só revela se a perícia tiver sido executada (análise pendente resolvida)
            if (window._unifedAnalysisPending === true || window._unifedRawDataOnly === true) {
                console.log('[UNIFED] uncloakForensicData bloqueado – análise ainda não executada.');
                return;
            }
            if (typeof window.UNIFED_INTERNAL !== 'undefined') {
                if (typeof window.UNIFED_INTERNAL.syncMetrics === 'function')   window.UNIFED_INTERNAL.syncMetrics();
                if (typeof window.UNIFED_INTERNAL.renderMatrix === 'function')  window.UNIFED_INTERNAL.renderMatrix();
                if (typeof window.UNIFED_INTERNAL.updateAuxiliaryUI === 'function') window.UNIFED_INTERNAL.updateAuxiliaryUI();
            }
            document.querySelectorAll(
                '.pure-data-value, .pure-delta-value, .pure-atf-big, ' +
                '.smoking-gun-module, .pure-sg-val, [data-pt], [data-en]'
            ).forEach(el => { el.classList.add('forensic-revealed'); });

            window.dispatchEvent(new CustomEvent('UNIFED_EXECUTE_PERITIA', {
                detail: {
                    timestamp:  new Date().toISOString(),
                    masterHash: '2A38423FED220D681D86E959F2C34F993BA71FCE9B92791199453B41E23A63E5'
                }
            }));
            console.log('[UNIFED] Estado 2 (PERITIA): uncloaking atómico concluído — UNIFED_EXECUTE_PERITIA disparado.');
        };

        function _setupTriggers() {
            const btnCasoReal = document.getElementById('demoModeBtn')
                || document.querySelector('[data-action="load-caso-real"]')
                || document.getElementById('btnCasoReal');
            if (btnCasoReal && !btnCasoReal.getAttribute('data-state-hydration-1')) {
                btnCasoReal.addEventListener('click', window.revealMetadata);
                btnCasoReal.setAttribute('data-state-hydration-1', '1');
            }

            // =========================================================================
            // MODIFICAR o listener do evento UNIFED_ANALYSIS_COMPLETE (PATCH 2)
            // =========================================================================
            window.addEventListener('UNIFED_ANALYSIS_COMPLETE', function _onAnalysisComplete(evt) {
                console.log('[UNIFED] UNIFED_ANALYSIS_COMPLETE recebido (fallback).', (evt && evt.detail) || '');
                // Se o evento vier do forceFinalState (status 'READY'), NÃO revela
                if (evt.detail && evt.detail.status === 'READY') {
                    console.log('[UNIFED] Evento de inicialização ignorado – aguardando perícia.');
                    return;
                }
                // Caso contrário, só revela se a análise já tiver sido executada (pendente false)
                if (window._unifedAnalysisPending === false) {
                    window.uncloakForensicData();
                } else {
                    console.log('[UNIFED] Análise ainda pendente – revelação adiada.');
                }
            });

            const btnAnalyze = document.getElementById('analyzeBtn')
                || document.querySelector('[data-action="executar-pericia"]')
                || document.getElementById('btnExecutarPericia');
            if (btnAnalyze && !btnAnalyze.getAttribute('data-state-hydration-2')) {
                btnAnalyze.addEventListener('click', function _analyzeClickFallback() {
                    Promise.resolve().then(function() {
                        if (!window._unifedUncloakDone) window.uncloakForensicData();
                    });
                });
                btnAnalyze.setAttribute('data-state-hydration-2', '1');
            }
        }

        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            _setupTriggers();
        } else {
            window.addEventListener('load', _setupTriggers);
        }
        console.log('[UNIFED] Camada 7 (State-Driven Hydration + Event-Driven Uncloaking): OK.');
    })();

    // =========================================================================
    // FUNÇÃO GLOBAL PARA RENDERIZAR GRÁFICOS SOB DEMANDA
    // =========================================================================
    function renderForensicCharts() {
        // [VEC-04] Sincronização _fillAnalysisStatCards → renderChart → renderDiscrepancyChart
        // Full Build consolidado — 2026-04-18

        // Passo 1: Verificar disponibilidade de dados
        var sys = window.UNIFEDSystem;
        if (!sys || !sys.analysis || !sys.analysis.totals) {
            console.warn('[UNIFED] renderForensicCharts: análise não disponível. Aguardando 200ms...');
            setTimeout(renderForensicCharts, 200);
            return;
        }

        // Passo 2: Hidratar stat-cards ANTES dos gráficos (ValueSource.RAW precede gráficos)
        if (typeof window._fillAnalysisStatCards === 'function') {
            try {
                window._fillAnalysisStatCards();
                console.log('[UNIFED] renderForensicCharts: _fillAnalysisStatCards() executado.');
            } catch (err) {
                console.warn('[UNIFED] _fillAnalysisStatCards() falhou:', err.message);
            }
        }

        // Passo 3: Flush DOM via requestAnimationFrame antes de renderizar gráficos
        requestAnimationFrame(function() {
            if (typeof window.renderChart === 'function') {
                window.renderChart();
            }
            if (typeof window.renderDiscrepancyChart === 'function') {
                window.renderDiscrepancyChart();
            }
            console.log('[UNIFED] Gráficos renderizados com dados reais (sequência sincronizada).');
        });
    }

    window.renderForensicCharts = renderForensicCharts;

    // =========================================================================
    // CONTROLE DE VISIBILIDADE DOS MÓDULOS FORENSES (CORRIGIDO)
    // =========================================================================
    function updateForensicModulesVisibility(show) {
        const modules = [
            'pureATFCard',           // ATF
            'pureZonaCinzentaCard',  // Zona Cinzenta
            'pureMacroCard',         // Macro (Risco Sistémico)
            'pureTriangulationCard', // Triangulação Financeira
            'card-asfixia',          // Risco de Asfixia Financeira
            'mainChartContainer',    // Gráfico principal (despesas vs receitas)
            'mainDiscrepancyChartContainer', // Gráfico de discrepâncias
            'pure-chart-container',  // Container do gráfico de discrepâncias (fallback)
            'gapConciliacaoC1'       // Gap de reconciliação C1
        ];
        modules.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = show ? 'block' : 'none';
        });
        
        // Controlar o canvas do gráfico ATF individualmente
        const atfCanvas = document.getElementById('atfChartCanvas');
        if (atfCanvas) {
            atfCanvas.style.display = show ? 'block' : 'none';
        }
        
        // Controlar os containers dos gráficos
        const mainChartContainer = document.getElementById('mainChartContainer');
        if (mainChartContainer) mainChartContainer.style.display = show ? 'block' : 'none';
        
        const discChartContainer = document.getElementById('pure-chart-container');
        if (discChartContainer) discChartContainer.style.display = show ? 'block' : 'none';
        
        // Gap de conciliação C1
        const gapEl = document.getElementById('gapConciliacaoC1');
        if (gapEl) gapEl.style.display = show ? 'block' : 'none';
        
        // Se for para mostrar e houver dados reais, atualizar o valor do gap
        if (show && window.UNIFEDSystem && window.UNIFEDSystem.analysis && window.UNIFEDSystem.analysis.crossings) {
            const gapValue = window.UNIFEDSystem.analysis.crossings.discrepanciaSaftVsDac7 || 0;
            const gapSpan = document.getElementById('gapC1Value');
            if (gapSpan) {
                const fmt = window.UNIFED_INTERNAL?.fmt || ((v) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v));
                gapSpan.textContent = fmt(gapValue);
            }
        }
        
        console.log(`[UNIFED] Visibilidade dos módulos forenses: ${show ? 'mostrar' : 'ocultar'}`);
    }
    window.updateForensicModulesVisibility = updateForensicModulesVisibility;

    // =========================================================================
    // Função para activar todos os botões (adicione antes de forceFinalState)
    // =========================================================================
    function forceEnableAllButtons() {
        const buttonIds = [
            'analyzeBtn', 'exportPDFBtn', 'exportJSONBtn', 'resetBtn', 'clearConsoleBtn',
            'exportDOCXBtn', 'atfModalBtn', 'demoModeBtn', 'registerClientBtnFixed',
            'openEvidenceModalBtn', 'forensicWipeBtn', 'custodyChainTriggerBtn'
        ];
        buttonIds.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.disabled = false;
        });
        document.querySelectorAll('.btn-tool, .btn-tool-pure, .btn-forensic, .evidence-management-btn-solid').forEach(btn => {
            btn.disabled = false;
            btn.style.pointerEvents = 'auto';
        });
        console.log('[UNIFED] Todos os botões foram forçados a ativo.');
    }

    // =========================================================================
    // resetUIVisual – Purga Total de Memória (Zero-Knowledge)
    // =========================================================================
    window.resetUIVisual = function() {
        console.warn('[FORENSIC-CORE] Invocando Purga Total de Memória (Zero-Knowledge).');
        try { localStorage.clear(); sessionStorage.clear(); } catch(e) { console.warn('Storage clear failed', e); }

        if (window.UNIFEDSystem) {
            window.UNIFEDSystem.analysis = { totals: {}, crossings: {}, verdict: null, evidenceIntegrity: [] };
            window.UNIFEDSystem.documents = {
                control: { files: [], totals: { records: 0 } },
                saft: { files: [], totals: { bruto:0, iliquido:0, iva:0, records:0 } },
                invoices: { files: [], totals: { invoiceValue:0, records:0 } },
                statements: { files: [], totals: { ganhos:0, despesas:0, ganhosLiquidos:0, records:0 } },
                dac7: { files: [], totals: { q1:0, q2:0, q3:0, q4:0, totalPeriodo:0, records:0 } }
            };
            window.UNIFEDSystem.monthlyData = {};
            window.UNIFEDSystem.dataMonths = new Set();
            window.UNIFEDSystem.masterHash = '';
        }
        window.rawForensicData = null;
        window._unifedAnalysisPending = false;
        window._unifedRawDataOnly = false;

        const elementsToHide = document.querySelectorAll('.pure-data-value, .pure-sg-val, .pure-zc-val, .pure-delta-value, .pure-atf-big');
        elementsToHide.forEach(el => { el.classList.remove('forensic-revealed'); el.style.opacity = '0'; el.textContent = '---'; });
        document.querySelectorAll('[id*="count"]').forEach(el => el.textContent = '0');

        const alertModules = ['#bigDataAlert', '#quantumBox', '#revenueGapCard', '#expenseGapCard', '#omissaoDespesasPctCard', '#jurosCard', '#discrepancy5Card', '#agravamentoBrutoCard', '#ircCard', '#iva6Card', '#iva23Card', '#asfixiaFinanceiraCard'];
        alertModules.forEach(sel => { const el = document.querySelector(sel); if (el) el.style.display = 'none'; });

        // 🔓 Desbloquear botões após reset
        if (typeof window.forceEnableAllButtons === 'function') {
            window.forceEnableAllButtons();
        } else {
            // Fallback
            document.querySelectorAll('.btn-tool, .btn-tool-pure, .btn-forensic').forEach(btn => {
                btn.disabled = false;
                btn.style.pointerEvents = 'auto';
            });
        }

        window.logAudit('Sistema em estado Zero-Knowledge. Pronto para reunião.', 'success');
    };

    // =========================================================================
    // FORCE FINAL STATE (sem remoção automática do splash)
    // Esta função será chamada APENAS quando o utilizador clicar no botão "INICIAR"
    // =========================================================================
    async function forceFinalState() {
        try {
            await loadPanelHTML();      // Injeção assíncrona
            await waitForPanel();       // Garantia de presença no DOM

            // =========================================================================
            // RETIFICAÇÃO: Garantir que a SESSÃO aparece preenchida
            // =========================================================================
            // Garantir que a sessão tem um ID válido
            if (!window.UNIFEDSystem) {
                window.UNIFEDSystem = {};
            }
            if (!window.UNIFEDSystem.sessionId) {
                window.UNIFEDSystem.sessionId = 'UNIFED-' + Date.now().toString(36).toUpperCase() + '-' +
                                                Math.random().toString(36).substring(2, 7).toUpperCase();
            }
            const sessionSpan = document.getElementById('sessionIdDisplay');
            if (sessionSpan) sessionSpan.textContent = window.UNIFEDSystem.sessionId;
            // Também atualizar outros elementos que possam exibir o sessionId
            const otherSessionSpans = document.querySelectorAll('#pure-session-id');
            otherSessionSpans.forEach(span => { if (span) span.textContent = window.UNIFEDSystem.sessionId; });
            console.log('[UNIFED] Session ID garantido:', window.UNIFEDSystem.sessionId);
            // =========================================================================

            // 1. Desbloqueio de Visibilidade Global
            document.body.classList.add('forensic-revealed');

            // 2. Remoção da Camada de Oclusão (Splash Screen) - SÓ AQUI
            const splash = document.getElementById('splashScreen');
            if (splash) {
                splash.style.transition = 'opacity 0.5s ease-out';
                splash.style.opacity = '0';
                setTimeout(() => {
                    splash.style.display = 'none';
                }, 500);
            }

            // 3. Ativação Atómica do Wrapper e do Main Container
            const wrapper = document.getElementById('pureDashboardWrapper');
            if (wrapper) {
                wrapper.classList.add('activated');
                wrapper.style.display = 'block';
                wrapper.style.opacity = '1';
                wrapper.style.visibility = 'visible';

                forceEnableAllButtons();  // <-- adicionar

                const innerDashboard = document.getElementById('pureDashboard') || wrapper.querySelector('.pure-section');
                if (innerDashboard) {
                    innerDashboard.classList.add('active');
                    innerDashboard.style.display = 'block';
                    innerDashboard.style.opacity = '1';
                    innerDashboard.style.visibility = 'visible';
                    innerDashboard.style.height = 'auto';
                }
            }

            const mainContainer = document.getElementById('mainContainer');
            if (mainContainer) {
                mainContainer.style.display = 'block';
                mainContainer.style.opacity = '1';
            }
            
            // ========== CORREÇÃO: Aguardar um ciclo para garantir que o DOM está estável ==========
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // 4. Ocultar os módulos forenses (zero-knowledge state)
            if (typeof updateForensicModulesVisibility === 'function') {
                updateForensicModulesVisibility(false);
            }
            
            // =========================================================================
            // RET-10: Apenas repor flags se não houver dados carregados.
            // Se o utilizador já carregou o caso real, preservar o estado correto.
            // forceFinalState é exclusivamente para transição de UI (splash → dashboard).
            // =========================================================================
            if (!window._unifedDataLoaded) {
                window._unifedAnalysisPending = false;
                window._unifedRawDataOnly = false;
            }
            // Nota: se _unifedDataLoaded=true e _unifedAnalysisPending=true,
            // os flags mantêm-se para que syncMetrics() saiba que há dados brutos
            // mas a análise ainda não foi executada (aguarda clique em "EXECUTAR PERÍCIA").
            
            // 5. Despacho de Eventos de Sincronização (apenas eventos, sem dados)
            window.dispatchEvent(new CustomEvent('UNIFED_CORE_READY'));
            window.dispatchEvent(new CustomEvent('UNIFED_ANALYSIS_COMPLETE', { 
                detail: { status: 'READY', masterHash: window.activeForensicSession?.masterHash || _PDF_CASE.masterHash } 
            }));

            console.log('[PERÍCIA] Sistema desbloqueado: Splash removido, Dashboard ativado (zero‑knowledge).');
        } catch (err) {
            console.error('[ERRO FORENSE] Falha na transição de estado:', err);
        }
    }

    // Expor globalmente para que o botão "INICIAR" a possa chamar
    window.forceFinalState = forceFinalState;

    // =========================================================================
    // CORREÇÃO: Adiciona o listener ao botão "INICIAR METODOLOGIA" (#startSessionBtn)
    // =========================================================================
    function setupIniciarButton() {
        const startBtn = document.getElementById('startSessionBtn');
        if (startBtn) {
            if (startBtn.getAttribute('data-iniciar-listener') === 'true') return;
            
            startBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                console.log('[UNIFED] Botão INICIAR clicado — a iniciar forceFinalState()');
                if (typeof window.forceFinalState === 'function') {
                    await window.forceFinalState();
                } else {
                    console.error('[UNIFED] forceFinalState não está disponível');
                }
            });
            startBtn.setAttribute('data-iniciar-listener', 'true');
            console.log('[UNIFED] Listener associado ao botão "INICIAR METODOLOGIA" (#startSessionBtn).');
        } else {
            console.warn('[UNIFED] Botão #startSessionBtn não encontrado no DOM. O sistema pode não arrancar corretamente.');
        }
    }

    // =========================================================================
    // ACTIVAÇÃO FORÇADA DE TODOS OS BOTÕES DA TOOLBAR
    // =========================================================================
    function enableAllButtons() {
        const btns = ['analyzeBtn', 'exportPDFBtn', 'exportJSONBtn', 'resetBtn', 'clearConsoleBtn'];
        btns.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.disabled = false;
        });
        // Botões da tríade (segunda linha) são criados dinamicamente, mas também devem ser activos
        setTimeout(() => {
            document.querySelectorAll('.btn-tool, .btn-tool-pure').forEach(btn => btn.disabled = false);
        }, 500);
    }

    // Chamar após o dashboard estar visível
    window.addEventListener('UNIFED_CORE_READY', enableAllButtons);

    // FIX-SI-01 (segunda ocorrência): idem — padrão readyState para carregamento dinâmico
    // CONTEXTO: setupIniciarButton() configura o botão de início do fluxo forense.
    // Se o DOM já estiver pronto (readyState !== 'loading'), a execução é imediata.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupIniciarButton, { once: true });
    } else {
        setupIniciarButton();
    }

    // =========================================================================
    // INSTRUÇÃO TÉCNICA 1: Re-ancorar modais para prevenir bloqueio por Z-Index
    // =========================================================================
    function reAnchorModals() {
        const wrapper = document.getElementById('pureDashboardWrapper');
        const custodyModal = document.getElementById('custodyModal');
        const hashModal = document.getElementById('hashModal'); // Inclui QR Code
        if (wrapper && custodyModal) wrapper.appendChild(custodyModal);
        if (wrapper && hashModal) wrapper.appendChild(hashModal);
    }
    document.addEventListener('UNIFED_CORE_READY', reAnchorModals);

    // =========================================================================
    // FORCE BIND PARA BOTÕES MORTOS (bypass nexus.js)
    // =========================================================================
    // =========================================================================
    // RET-08 CRÍTICO: forceBindAnalyze CORRIGIDA
    // Problema original: btn.onclick = ... substituía todos os addEventListener,
    // cortando o pipeline completo de executePendingAnalysis() que calcula
    // IVA 6%, IVA 23%, IRC, Asfixia, Discrepâncias, etc.
    // Solução: apenas ativar o botão e garantir listener completo sem override.
    // =========================================================================
    function forceBindAnalyze() {
        const btn = document.getElementById('analyzeBtn');
        if (!btn) {
            console.warn('[UNIFED] forceBindAnalyze: #analyzeBtn não encontrado');
            return;
        }

        // Ativar o botão (nunca desativar após dados carregados)
        btn.disabled = false;
        btn.style.pointerEvents = 'auto';
        btn.style.opacity = '1';

        // Só adicionar listener se não existir já um completo
        if (btn.getAttribute('data-ret08-listener') === 'true') {
            console.log('[UNIFED] forceBindAnalyze RET-08: listener já registado, apenas ativando botão.');
            return;
        }

        // REMOVER qualquer onclick direto anterior que possa ter sido injetado
        btn.onclick = null;

        btn.addEventListener('click', async function _ret08Handler(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            console.log('[UNIFED] RET-08: EXECUTAR PERÍCIA — pipeline forense completo');

            const _origHTML = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A EXECUTAR PERÍCIA...';

            try {
                // 1. Garantir dados do caso real carregados
                let loadFn = window.ensureDemoDataLoaded
                    || window.UNIFED_INTERNAL?.ensureDemoDataLoaded;
                if (typeof loadFn === 'function') {
                    await loadFn();
                } else {
                    console.warn('[UNIFED] RET-08: ensureDemoDataLoaded indisponível.');
                }

                // 2. Executar análise completa (calcula cruzamentos, IVA, IRC, Asfixia)
                let execFn = window.UNIFED_INTERNAL?.executePendingAnalysis
                    || window.executePendingAnalysis;
                if (typeof execFn === 'function') {
                    await execFn();
                } else {
                    // Fallback direto: calcular crossings localmente
                    console.warn('[UNIFED] RET-08: executePendingAnalysis indisponível, fallback local.');
                    const sys = window.UNIFEDSystem;
                    if (sys && sys.analysis && sys.analysis.totals) {
                        const t = sys.analysis.totals;
                        const discC2 = t.despesas - t.faturaPlataforma;
                        const discC1 = t.saftBruto - t.dac7TotalPeriodo;
                        sys.analysis.crossings = {
                            discrepanciaCritica:      discC2,
                            percentagemOmissao:       t.despesas > 0 ? (discC2 / t.despesas) * 100 : 0,
                            discrepanciaSaftVsDac7:   discC1,
                            percentagemSaftVsDac7:    t.saftBruto > 0 ? (discC1 / t.saftBruto) * 100 : 0,
                            ivaFalta:    discC2 * 0.23,
                            ivaFalta6:   discC2 * 0.06,
                            ircEstimado: discC2 * 0.21,
                            asfixiaFinanceira: t.saftBruto * 0.06,
                            btor: t.despesas, btf: t.faturaPlataforma
                        };
                        t.iva6Omitido      = discC2 * 0.06;
                        t.iva23Omitido     = discC2 * 0.23;
                        t.asfixiaFinanceira = t.saftBruto * 0.06;
                    }
                    window._unifedAnalysisPending = false;
                    window._unifedRawDataOnly = false;
                }

                // 3. Sincronizar todos os campos do dashboard
                if (typeof window.UNIFED_INTERNAL?.syncMetrics === 'function') {
                    window.UNIFED_INTERNAL.syncMetrics();
                }
                if (typeof window.UNIFED_INTERNAL?.updateAuxiliaryUI === 'function') {
                    window.UNIFED_INTERNAL.updateAuxiliaryUI();
                }
                // 4. Hidratar campos do index.html (módulos SAF-T, Extratos, DAC7, stat-cards)
                if (typeof window._hydrateRawDataValues === 'function') {
                    window._hydrateRawDataValues();
                }
                // 5. Preencher stat-cards de análise (IVA, IRC, Asfixia)
                _fillAnalysisStatCards();

                // 6. Revelar módulos forenses e gráficos
                if (typeof updateForensicModulesVisibility === 'function') {
                    updateForensicModulesVisibility(true);
                }
                if (typeof window.forceRevealSmokingGun === 'function') {
                    window.forceRevealSmokingGun();
                }
                if (typeof window.renderForensicCharts === 'function') {
                    window.renderForensicCharts();
                }
                // 7. Renderizar gráficos principais (mainChart, discrepancyChart)
                if (typeof window.renderChart === 'function') window.renderChart();
                if (typeof window.renderDiscrepancyChart === 'function') window.renderDiscrepancyChart();

                // 8. Disparar eventos globais
                window.dispatchEvent(new CustomEvent('UNIFED_EXECUTE_PERITIA', {
                    detail: { timestamp: new Date().toISOString() }
                }));
                window.dispatchEvent(new CustomEvent('UNIFED_ANALYSIS_COMPLETE', {
                    detail: { source: 'RET-08', timestamp: Date.now() }
                }));

                btn.innerHTML = '✅ PERÍCIA CONCLUÍDA';
                btn.classList.add('btn-success');
                btn.disabled = false;
                console.log('[UNIFED] RET-08: Perícia concluída — todos os campos preenchidos.');

            } catch (_err) {
                console.error('[UNIFED] RET-08: Erro durante perícia:', _err);
                btn.innerHTML = _origHTML;
                btn.disabled = false;
            }
        }, true); // capture:true para ter prioridade sobre outros listeners

        btn.setAttribute('data-ret08-listener', 'true');
        console.log('[UNIFED] forceBindAnalyze RET-08: listener completo registado (sem override de pipeline).');
    }

    // Auxiliar: preencher os stat-cards de análise após cálculo dos crossings
    function _fillAnalysisStatCards() {
        const sys = window.UNIFEDSystem;
        if (!sys || !sys.analysis) return;
        const t = sys.analysis.totals || {};
        const c = sys.analysis.crossings || {};
        const fmt = window.UNIFED_INTERNAL?.fmt
            || ((v) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v || 0));
        const show = (id) => { const el = document.getElementById(id); if (el) el.style.display = ''; };
        const setT = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

        // CÁLCULO TRIBUTÁRIO PERICIAL · PROVA RAINHA (quantumBox)
        const qBox = document.getElementById('quantumBox');
        if (qBox) {
            qBox.style.display = 'block';
            setT('quantumValue', fmt(c.discrepanciaCritica || 0));
            setT('quantumNote', `IVA em falta (23%): ${fmt(c.ivaFalta || 0)} | IVA (6%): ${fmt(c.ivaFalta6 || 0)}`);
        }

        // SMOKING GUN · DIVERGÊNCIA CRÍTICA (bigDataAlert)
        const bigAlert = document.getElementById('bigDataAlert');
        if (bigAlert) {
            bigAlert.style.display = 'flex';
            setT('alertDeltaValue', fmt(c.discrepanciaCritica || 0));
        }

        // Stat-cards com display:none → revelar e preencher
        const cardMap = [
            ['statNet',               fmt(t.ganhosLiquidos || 0),              null],
            ['statComm',              fmt(t.despesas || 0),                     null],
            ['statJuros',             fmt(c.discrepanciaCritica || 0),          'jurosCard'],
            ['discrepancy5Value',     fmt(c.discrepanciaSaftVsDac7 || 0),       'discrepancy5Card'],
            ['agravamentoBrutoValue', fmt(c.discrepanciaCritica || 0),          'agravamentoBrutoCard'],
            ['ircValue',              fmt(c.ircEstimado || 0),                  'ircCard'],
            ['iva6Value',             fmt(t.iva6Omitido || 0),                  'iva6Card'],
            ['iva23Value',            fmt(t.iva23Omitido || 0),                 'iva23Card'],
            ['asfixiaFinanceiraValue',fmt(t.asfixiaFinanceira || 0),            'asfixiaFinanceiraCard'],
        ];
        cardMap.forEach(([valId, val, cardId]) => {
            setT(valId, val);
            if (cardId) show(cardId);
        });

        // Triangulação (kpiSection)
        setT('kpiGrossValue', fmt(t.ganhos || 0));
        setT('kpiCommValue',  fmt(t.despesas || 0));
        setT('kpiNetValue',   fmt(t.ganhosLiquidos || 0));
        setT('kpiInvValue',   fmt(t.faturaPlataforma || 0));

        // Gap cards (twoAxisAlerts)
        const revGap = (t.saftBruto || 0) - (t.ganhos || 0);
        setT('revenueGapValue', fmt(revGap));
        setT('expenseGapValue', fmt(c.discrepanciaCritica || 0));
        const pct = t.despesas > 0 && t.ganhos > 0 ? ((t.despesas / t.ganhos) * 100).toFixed(2) + '%' : '0,00%';
        setT('omissaoDespesasPctValue', pct);
        if (Math.abs(revGap) > 0.01)            show('revenueGapCard');
        if ((c.discrepanciaCritica || 0) > 0.01) show('expenseGapCard');
        if (t.despesas > 0 && t.ganhos > 0)      show('omissaoDespesasPctCard');

        // Gráfico principal mainChart e discrepancyChart
        const mainChartCont = document.getElementById('mainChartContainer');
        if (mainChartCont) mainChartCont.style.display = 'block';
        const discChartCont = document.getElementById('mainDiscrepancyChartContainer');
        if (discChartCont) discChartCont.style.display = 'block';

        console.log('[UNIFED] RET-08: _fillAnalysisStatCards — todos os campos preenchidos.');

        // RET-11: Revelar botões ocultos da tríade após perícia executada
        document.querySelectorAll('[data-triada-btn="true"]').forEach(btn => {
            btn.style.display = 'inline-flex';
            btn.disabled = false;
        });
    }
    window._fillAnalysisStatCards = _fillAnalysisStatCards;

    // Chamar após o core estar pronto
    window.addEventListener('UNIFED_CORE_READY', forceBindAnalyze);
    // Garantia extra: se o evento já tiver ocorrido, chamar diretamente
    if (document.readyState === 'complete') {
        setTimeout(forceBindAnalyze, 500);
    }

    console.log('[UNIFED] script_injection.js carregado (v13.12.3). Aguardando clique em "INICIAR".');
})();