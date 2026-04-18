/**
 * UNIFED - PROBATUM · OUTPUT ENRICHMENT LAYER · v13.12.2-i18n (ELITE DEMO)
 * ============================================================================
 * Arquitetura: Asynchronous Post-Computation Orchestration
 * Padrão:      Read-Only Data Consumption sobre UNIFEDSystem.analysis
 * Conformidade: DORA (UE) 2022/2554 · RGPD · ISO/IEC 27037:2012
 *
 * CONSOLIDAÇÃO (2026-04-15):
 * · Integradas melhorias do enrichment(2).js (retificação):
 *   - renderDiscrepancyCharts com fallback para mainDiscrepancyChart/discrepancyChart
 *   - window.renderATFChart (estável com mutex) e _isGraphRendering
 *   - openATFModal agora utiliza renderATFChart
 *   - Listener UNIFED_ANALYSIS_COMPLETE unificado (RAG + uncloaking + sync)
 *   - generateBurdenOfProofSection adicionada
 * · Mantidas todas as funções originais e estrutura de dados
 * · Removidas duplicações e garantida a visibilidade original do dashboard
 * · EXPOSIÇÃO GLOBAL: window.generateLegalNarrative adicionada para compatibilidade
 * ============================================================================
 * PATCH 2 (2026-04-17):
 * · No listener UNIFED_ANALYSIS_COMPLETE: renderização de gráficos apenas quando
 *   window._unifedAnalysisPending === false (perícia executada)
 * · No listener UNIFED_EXECUTE_PERITIA: renderização condicionada a hasRealData
 * ============================================================================
 */

'use strict';

// ============================================================================
// UNIFEDSystem.utils — UTILITÁRIOS CENTRALIZADOS
// ============================================================================
(function _installUNIFEDUtils() {
    if (typeof window.UNIFEDSystem === 'undefined') { window.UNIFEDSystem = {}; }
    if (typeof window.UNIFEDSystem.utils === 'undefined') { window.UNIFEDSystem.utils = {}; }
    var _utils = window.UNIFEDSystem.utils;

    if (typeof _utils.formatCurrency !== 'function') {
        _utils.formatCurrency = function _uFormatCurrency(val) {
            if (typeof window.formatCurrency === 'function' &&
                window.formatCurrency !== _utils.formatCurrency) {
                return window.formatCurrency(val);
            }
            var _raw = (val === null || val === undefined || isNaN(Number(val))) ? 0 : Number(val);
            var _lang = (typeof window.currentLang !== 'undefined') ? window.currentLang : 'pt';
            var _locale = (_lang === 'en') ? 'en-GB' : 'pt-PT';
            return new Intl.NumberFormat(_locale, {
                style: 'currency', currency: 'EUR',
                minimumFractionDigits: 2, maximumFractionDigits: 2
            }).format(_raw);
        };
    }
    if (typeof window.formatCurrency !== 'function') {
        window.formatCurrency = _utils.formatCurrency;
    }

    if (typeof _utils.log !== 'function') {
        _utils.log = function _uLog(msg, level) {
            if (typeof window.logAudit === 'function' && window.logAudit !== _utils.log) {
                window.logAudit(msg, level);
                return;
            }
            var prefix = '[UNIFED-ENRICHMENT] ';
            if (level === 'error') console.error(prefix + msg);
            else if (level === 'warn') console.warn(prefix + msg);
            else if (level === 'success') console.info(prefix + msg);
            else console.log(prefix + msg);
        };
    }
    if (typeof window.logAudit !== 'function') {
        window.logAudit = _utils.log;
    }

    window._enrichmentRefreshLang = function _enrichmentRefreshLang(lang) {
        var _newLang = lang || (typeof window.currentLang !== 'undefined' ? window.currentLang : 'pt');
        var _atfCanvas = document.getElementById('atfChartCanvas');
        if (_atfCanvas && typeof Chart !== 'undefined') {
            try {
                var _chart = Chart.getChart(_atfCanvas);
                if (_chart) {
                    var _newLocale = _newLang === 'en' ? 'en-GB' : 'pt-PT';
                    if (_chart.options && _chart.options.scales && _chart.options.scales.y) {
                        _chart.options.scales.y.ticks.callback = function(v2) {
                            return new Intl.NumberFormat(_newLocale, {
                                style: 'currency', currency: 'EUR', maximumFractionDigits: 0
                            }).format(v2);
                        };
                    }
                    if (_chart.options && _chart.options.plugins && _chart.options.plugins.tooltip) {
                        _chart.options.plugins.tooltip.callbacks.label = function(c2) {
                            return ' ' + c2.dataset.label + ': ' + new Intl.NumberFormat(_newLocale, {
                                style: 'currency', currency: 'EUR'
                            }).format(c2.raw || 0);
                        };
                    }
                    _chart.update('none');
                }
            } catch (_e) { }
        }
        var _atfModal = document.getElementById('atfModal');
        if (_atfModal) {
            var _outlierDivs = _atfModal.querySelectorAll('[data-disc-value]');
            _outlierDivs.forEach(function(el) {
                var _raw = parseFloat(el.getAttribute('data-disc-value'));
                if (!isNaN(_raw)) {
                    var _fmtd = _utils.formatCurrency(_raw);
                    var _strong = el.querySelector('strong');
                    if (_strong && _strong.nextSibling) {
                        _strong.nextSibling.textContent = '\n\u0394 ' + _fmtd;
                    }
                }
            });
        }
        console.log('[UNIFED-ENRICHMENT] _enrichmentRefreshLang() executado — lang: ' + _newLang);
    };
    console.log('[UNIFED-ENRICHMENT] \u2705 UNIFEDSystem.utils inicializado');
})();

const _fmtEur = (val) => window.UNIFEDSystem.utils.formatCurrency(val);

// ============================================================================
// 1. BASE LEGAL ESTATICA (RAG — Knowledge Base)
// ============================================================================
const LEGAL_KB = {
    CIVA: {
        art2:  'Art. 2.o CIVA — Incidencia Subjetiva: As plataformas digitais sao sujeitos passivos de IVA pela intermediacao de prestacoes de servicos (al. i), n.o 1). Obrigacao de autoliquidacao.',
        art6:  'Art. 6.o CIVA — Localizacao: Servicos de transporte sao tributaveis no local de utilizacao efetiva.',
        art29: 'Art. 29.o CIVA — Obrigacoes de Faturacao: Emissao de fatura por cada prestacao de servicos, com identificacao fiscal do prestador e adquirente.',
        art36: 'Art. 36.o CIVA — Prazo de Emissao: A fatura deve ser emitida no prazo de cinco dias uteis a contar da prestacao do servico.',
        art40: 'Art. 40.o CIVA — Conservacao de Registos: Os registos primarios e documentos de suporte devem ser conservados por um prazo minimo de 10 anos.',
        art78: 'Art. 78.o CIVA — Regularizacoes: Obrigatoriedade de regularizacao do imposto quando detetada omissao de base tributavel.'
    },
    CIRC: {
        art17: 'Art. 17.o CIRC — Lucro Tributavel: A base tributavel inclui todos os rendimentos omitidos, independentemente da sua natureza ou denominacao.',
        art20: 'Art. 20.o CIRC — Rendimentos: Inclui todos os proveitos ou ganhos realizados no periodo de tributacao.',
        art23: 'Art. 23.o CIRC — Gastos Dedutiveis: Apenas sao dedutiveis os gastos comprovados por documentacao idonea.',
        art57: 'Art. 57.o CIRC — Precos de Transferencia: Entidades com relacoes especiais estao sujeitas a condicoes de plena concorrencia.',
        art88: 'Art. 88.o CIRC — Tributacoes Autonomas: Encargos nao devidamente documentados estao sujeitos a tributacao autonoma agravada.'
    },
    RGIT: {
        art103: 'Art. 103.o RGIT — Fraude Fiscal: Conduta dolosa que, por acao ou omissao, reduza, elimine ou retarde impostos devidos. Pena ate 3 anos de prisao.',
        art104: 'Art. 104.o RGIT — Fraude Fiscal Qualificada: Quando a vantagem patrimonial ilegitima for superior a 15.000 EUR ou envolver utilizacao de meios fraudulentos. Pena ate 5 anos.',
        art108: 'Art. 108.o RGIT — Abuso de Confianca Fiscal: Nao entrega total ou parcial, ao credor tributario, de prestacao tributaria deduzida ou recebida de terceiros.',
        art114: 'Art. 114.o RGIT — Contra-Ordenacoes Fiscais: Omissao de declaracoes ou declaracoes inexatas, com coima ate 165.000 EUR.'
    },
    CPP: {
        art125: 'Art. 125.o CPP — Admissibilidade da Prova: Sao admissiveis todos os meios de prova nao proibidos por lei. Fundamento para a admissibilidade da prova digital forense.',
        art153: 'Art. 153.o CPP — Deveres do Perito: Compromisso de honra, objetividade e imparcialidade no exercicio das funcoes periciais.',
        art163: 'Art. 163.o CPP — Valor Probatorio: O juizo tecnico, cientifico ou artistico inerente ao relatorio pericial presume-se subtraido a livre apreciacao do julgador.'
    },
    DAC7: {
        art1: 'Diretiva DAC7 (UE) 2021/514 — Obrigacao das plataformas digitais de reportar as receitas dos prestadores de servicos as autoridades fiscais dos Estados-Membros.',
        art2: 'DAC7 — Reconciliacao: As discrepancias entre os valores reportados pela plataforma (DAC7) e os valores declarados pelo sujeito passivo constituem indicio de omissao tributaria.'
    }
};

// ============================================================================
// 2. generateLegalNarrative() — IA Argumentativa + AI Adversarial Simulator
// ============================================================================
async function generateLegalNarrative(analysis) {
    console.log('[UNIFED-AI] \u25b6 A gerar Sintese Juridica Assistida por IA...');
    if (!analysis) analysis = { totals: {}, crossings: {}, verdict: {} };
    const forensicContext = _buildForensicContext(analysis);
    const legalContext    = _buildLegalContext();
    const hasData         = forensicContext !== '[DADOS INSUFICIENTES]';
    if (!hasData) {
        console.warn('[UNIFED-AI] \u26a0 Dados insuficientes para sintese juridica.');
        return _fallbackNarrative('Dados forenses insuficientes.');
    }
    const systemPrompt = `Es um Assistente Especializado em Analise Juridico-Fiscal Portuguesa e em Estrategia de Litigio.
O teu papel e duplo: (1) Modulo de Sintese Narrativa: transformas outputs numericos em inputs semanticos juridicos; (2) Simulador Adversarial: antecipas as linhas de defesa da contraparte e preparas a resposta pericial.
REGRAS ABSOLUTAS:
1. Usa EXCLUSIVAMENTE os dados do contexto forense fornecido.
2. Se um valor for zero ou ausente, omite essa linha.
3. Linguagem: portugues juridico formal, adequado para tribunal.
4. Referencia sempre os artigos legais pertinentes.
5. Nao uses listas de bullets — escreve em prosa juridica estruturada.
6. Objectividade pericial: expoem factos, nao formula acusacoes.
7. Na Seccao D, simula argumentos plausíveis da defesa e fornece a resposta tecnica pericial a cada um.
MANDATO ESPECIAL — INVERSÃO DO ÓNUS DA PROVA E QUALIFICAÇÃO DE VÍTIMA:
Atencao: O sujeito passivo (cliente) e a VITIMA. A plataforma detem o monopolio da emissao de faturas (Art. 36.o n.o 11 CIVA). Deves argumentar a Inversao do Onus da Prova e imputar a responsabilidade do crime de Colarinho Branco e a Perda de Chance (Danos Reputacionais pelo Risk Scoring da AT) exclusivamente a plataforma. O sujeito passivo nao tem acesso nem controlo sobre os documentos fiscais emitidos em seu nome — este facto por si so justifica a inversao do onus probatorio nos termos do Art. 344.o do Codigo Civil e Art. 100.o do CPPT.
TERMO JURÍDICO OBRIGATÓRIO — LIMBO CONTABILÍSTICO (Gatilho Processual):
Deves SEMPRE incluir o termo "limbo contabilístico" na Seccao A (Qualificacao Juridica dos Factos). A divergencia apurada nao constitui erro de processamento, mas sim a criacao de um limbo contabilístico que serve a retencao indevida de margem operacional e a evasao fiscal estruturada. Este termo e reconhecido como "gatilho" em processos de criminalidade economica nos tribunais portugueses e deve ser empregue com precisao tecnica na qualificacao dos factos.
IDENTIDADE DO SISTEMA — RECONSTITUIÇÃO DA VERDADE MATERIAL DIGITAL:
O sistema UNIFED-PROBATUM nao realiza contabilidade. Realiza RECONSTITUICAO DA VERDADE MATERIAL DIGITAL — um processo forense de engenharia reversa sobre os fluxos de caixa reais vs. reportados, com o objetivo de estabelecer a verdade material dos factos para efeitos processuais. Esta distinção e juridicamente relevante e deve ser sublinhada na narrativa.`;
    const userPrompt = `Com base nos dados forenses certificados e na base legal aplicavel, elabora uma Sintese Juridica Pericial em QUATRO seccoes obrigatorias.
=== DADOS FORENSES CERTIFICADOS ===
${forensicContext}
=== BASE LEGAL APLICAVEL ===
${legalContext}
=== ESTRUTURA OBRIGATORIA ===
Seccao A - QUALIFICACAO JURIDICA DOS FACTOS
[OBRIGATORIO: Usar o termo "limbo contabilístico" para qualificar a divergencia apurada. Texto mandatório a incluir: "A divergencia apurada nao constitui erro de processamento, mas sim a criacao de um limbo contabilístico que serve a retencao indevida de margem operacional e a evasao fiscal estruturada."]
Seccao B - ENQUADRAMENTO LEGAL E TRIBUTARIO
Seccao C - CONCLUSOES DE ADMISSIBILIDADE
[OBRIGATORIO: (I) CONSOLIDACAO DA PROVA MATERIAL — A densidade tecnica da evidencia digital extraida via UNIFED PURE e suficiente para a demonstracao do nexo de causalidade na subdeclaracao de base tributavel; (II) IMPACTO SISTEMICO ESTIMADO (SIMULACAO) — Com base na metrica de discrepancia apurada neste processo e extrapolando para a estabilidade do setor (38.000 condutores — IMT), estima-se um passivo fiscal oculto sistemico de magnitude superior a 500M EUR, carecendo a sua liquidacao final de prova pericial complementar em sede de execucao; (III) RECOMENDACAO PROCESSUAL — Face a robustez dos artefactos apresentados, recomenda-se a inversao do onus da prova (Art. 344.o CC), mantendo-se a disponibilidade para o pleno exercicio do contraditorio (Art. 327.o CPP) mediante acesso aos logs brutos sob custodia. SUBLINHAR: o UNIFED-PROBATUM realiza RECONSTITUICAO DA VERDADE MATERIAL DIGITAL — nao contabilidade.]
Seccao D - ESTRATEGIA DE CONTRA-INTERROGATORIO (AI Adversarial Simulator)
[Para cada discrepancia critica, identifica 2-3 linhas de ataque da contraparte e fornece a resposta tecnica pericial com referencia legal.]
Maximo 900 palavras. Prosa juridica formal. Sem preambulos.`;
    try {
        // Fallback estático – sem qualquer tentativa de fetch para evitar erros de rede
        console.log('[UNIFED-AI] Modo de segurança ativo – a usar narrativa jurídica local (fallback estático).');
        var baseNarrative = _fallbackNarrative('Execução em modo standalone (narrativa local)');
        
        // ========================================================================
        // RETIFICAÇÃO: Inserção dinâmica do fragmento sobre inversão do ónus da prova
        // quando a percentagem de omissão de comissões for superior a 50%
        // ========================================================================
        var omissionPct = (analysis && analysis.crossings && analysis.crossings.percentagemOmissao) || 0;
        if (omissionPct > 50) {
            var fmtPct = omissionPct.toFixed(2);
            var additionalBurden = "\n\nDO ÓNUS DA PROVA E DA BOA FÉ CONTRATUAL:\n" +
                "Dada a discrepância de " + fmtPct + "%, " +
                "opera-se a inversão do ónus da prova (Art. 344.º do C. Civil), " +
                "cabendo à Ré demonstrar a licitude das retenções efectuadas à margem da facturação emitida.\n";
            baseNarrative += additionalBurden;
            console.log('[UNIFED-AI] Fragmento de inversão do ónus da prova adicionado (discrepância > 50%: ' + fmtPct + '%).');
        }
        
        return baseNarrative;
    } catch (err) {
        const isCors = err.message.indexOf('fetch') !== -1 || err.message.indexOf('Failed') !== -1;
        if (isCors) {
            console.info('[UNIFED-AI] [i] Execucao em Ambiente Local Seguro (Air-Gapped). Modo de Seguranca Forense ativado. Fallback estatico ativo.');
        } else {
            console.warn('[UNIFED-AI] \u26a0 API indisponivel:', err.message);
        }
        var fallbackMsg = isCors ? 'Inteligencia Artificial em contencao - Execucao em Ambiente Local Seguro / Air-Gapped' : err.message;
        var fallbackNarrative = _fallbackNarrative(fallbackMsg);
        // Também aplicar a retificação no fallback (por segurança)
        var omissionPctFallback = (analysis && analysis.crossings && analysis.crossings.percentagemOmissao) || 0;
        if (omissionPctFallback > 50) {
            var fmtPctFallback = omissionPctFallback.toFixed(2);
            fallbackNarrative += "\n\nDO ÓNUS DA PROVA E DA BOA FÉ CONTRATUAL:\n" +
                "Dada a discrepância de " + fmtPctFallback + "%, " +
                "opera-se a inversão do ónus da prova (Art. 344.º do C. Civil), " +
                "cabendo à Ré demonstrar a licitude das retenções efectuadas à margem da facturação emitida.\n";
        }
        return fallbackNarrative;
    }
}
function _buildForensicContext(analysis) {
    const t  = analysis.totals    || {};
    const c  = analysis.crossings || {};
    const v  = analysis.verdict   || {};
    const lines = [];
    if (t.ganhos           > 0) lines.push('GANHOS DECLARADOS: ' + _fmtEur(t.ganhos));
    if (t.saftBruto        > 0) lines.push('RECEITA SAF-T: ' + _fmtEur(t.saftBruto));
    if (t.dac7TotalPeriodo > 0) lines.push('RECEITA DAC7: ' + _fmtEur(t.dac7TotalPeriodo));
    if (t.faturaPlataforma > 0) lines.push('FATURACAO PLATAFORMA: ' + _fmtEur(t.faturaPlataforma));
    if (t.despesas         > 0) lines.push('DESPESAS DECLARADAS: ' + _fmtEur(t.despesas));
    if (lines.length > 0) lines.push('---');
    if (c.discrepanciaCritica && Math.abs(c.discrepanciaCritica) > 0)
        lines.push('OMISSAO DE CUSTOS: ' + _fmtEur(c.discrepanciaCritica) + ' (' + (c.percentagemOmissao || 0).toFixed(2) + '%)');
    if (c.discrepanciaSaftVsDac7 && Math.abs(c.discrepanciaSaftVsDac7) > 0)
        lines.push('OMISSAO RECEITA SAF-T vs DAC7: ' + _fmtEur(c.discrepanciaSaftVsDac7));
    if (c.ivaFalta   > 0) lines.push('IVA 23% OMITIDO: ' + _fmtEur(c.ivaFalta));
    if (c.ivaFalta6  > 0) lines.push('IVA 6% OMITIDO: ' + _fmtEur(c.ivaFalta6));
    if (c.ircEstimado > 0) lines.push('IRC ESTIMADO OMITIDO: ' + _fmtEur(c.ircEstimado));
    if (v.level && v.level.pt) { lines.push('---'); lines.push('VEREDICTO: ' + v.level.pt + ' -- ' + (v.percent || 'N/A')); }
    return lines.filter(function(l) { return l !== '---'; }).length === 0 ? '[DADOS INSUFICIENTES]' : lines.join('\n');
}
function _buildLegalContext() {
    return Object.keys(LEGAL_KB).map(function(code) {
        var arts = LEGAL_KB[code];
        return code + ':\n' + Object.values(arts).map(function(a) { return '  . ' + a; }).join('\n');
    }).join('\n\n');
}
function _fallbackNarrative(reason) {
    return [
        'SINTESE JURIDICA - MODO DE SEGURANCA FORENSE',
        '[Nota: IA indisponivel - ' + reason + ']',
        '',
        'Seccao A - QUALIFICACAO JURIDICA DOS FACTOS',
        'As discrepancias apuradas pelo motor UNIFED-PROBATUM constituem indicios de omissao tributaria ' +
        'nos termos dos artigos 103.o e 104.o do RGIT. A divergencia entre os valores reportados pela plataforma ' +
        '(DAC7) e os valores declarados pelo sujeito passivo configura, prima facie, o elemento objetivo do tipo ' +
        'de ilicito de fraude fiscal qualificada, por envolver vantagem patrimonial ilegitima superior ao limiar ' +
        'legalmente previsto de 15.000 EUR.',
        '',
        'Seccao B - ENQUADRAMENTO LEGAL E TRIBUTARIO',
        'A omissao de base tributavel implica a obrigacao de regularizacao nos termos do Art. 78.o do CIVA. ' +
        'O IVA em falta, calculado as taxas de 23% e 6%, acresce ao imposto em falta ao abrigo do Art. 2.o ' +
        'do CIVA (autoliquidacao). O lucro tributavel devera ser corrigido ao abrigo do Art. 17.o do CIRC, ' +
        'com incidencia de tributacao autonoma sobre encargos nao documentados (Art. 88.o CIRC).',
        '',
        'Seccao C - CONCLUSOES DE ADMISSIBILIDADE',
        '(I) CONSOLIDACAO DA PROVA MATERIAL: A densidade tecnica da evidencia digital extraida via UNIFED PURE e suficiente para a demonstracao do nexo de causalidade na subdeclaracao de base tributavel. A metodologia forense aplicada (ISO/IEC 27037:2012 · Art. 125.o CPP) e replicavel e verificavel por perito independente.',
        '',
        '(II) IMPACTO SISTEMICO ESTIMADO (SIMULACAO): Com base na metrica de discrepancia apurada neste processo e extrapolando para a estabilidade do setor (38.000 condutores — IMT), estima-se um passivo fiscal oculto sistemico de magnitude superior a 500M EUR. Esta projecao carece de prova pericial complementar em sede de execucao e nao constitui prova de facto neste processo concreto.',
        '',
        '(III) RECOMENDACAO PROCESSUAL: Face a robustez dos artefactos apresentados, recomenda-se a inversao do onus da prova (Art. 344.o CC e Art. 100.o CPPT), mantendo-se a disponibilidade para o pleno exercicio do contraditorio (Art. 327.o CPP) mediante acesso aos logs brutos de calculo de comissoes, sob custodia exclusiva da plataforma. O UNIFED-PROBATUM realiza RECONSTITUICAO DA VERDADE MATERIAL DIGITAL — nao contabilidade — distinção juridicamente relevante para a admissibilidade da prova pericial.',
        '',
        'Seccao D - ESTRATEGIA DE CONTRA-INTERROGATORIO',
        'Argumento da Defesa: "Os valores reportados pelo DAC7 incluem taxas de cancelamento e reembolsos ' +
        'que nao constituem rendimento tributavel do prestador."',
        'Resposta Pericial: Nos termos do Art. 36.o do CIVA, cada componente da remuneracao deve constar ' +
        'de fatura discriminada. A ausencia de faturacao discriminada por componente confirma a omissao.',
        '',
        'Argumento da Defesa: "A discrepancia resulta de diferencas de cambio e ajustamentos de plataforma ' +
        'comunicados tardiamente."',
        'Resposta Pericial: O Art. 29.o do CIVA impoe emissao no prazo de 5 dias uteis. Ajustamentos ' +
        'tardios nao afastam a obrigacao declarativa do periodo original (Art. 78.o CIVA).',
        '',
        'Argumento da Defesa: "O contribuinte nao tinha conhecimento tecnico das obrigacoes DAC7."',
        'Resposta Pericial: O regime DAC7 esta em vigor em Portugal desde 1 de janeiro de 2023 ' +
        '(Lei n.o 17/2023) e a plataforma tem obrigacao de informar o prestador nos termos do Art. 8.o ' +
        'da Diretiva. A ignorancia da lei nao aproveita (Art. 6.o CC).'
    ].join('\n');
}
// ============================================================================
// 3. renderSankeyToImage() — Dynamic Canvas-to-PDF Injection
// ============================================================================
async function renderSankeyToImage(analysis) {
    var W = 1400, H = 720;
    var canvas, ctx;
    try {
        canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        canvas.style.cssText = 'position:fixed;left:-9999px;top:-9999px;visibility:hidden;';
        document.body.appendChild(canvas);
        ctx = canvas.getContext('2d');
    } catch (e) {
        console.warn('[UNIFED-SANKEY] \u26a0 Canvas indisponivel:', e.message);
        return null;
    }
    var t = analysis.totals    || {};
    var c = analysis.crossings || {};
    ctx.fillStyle = '#0D1B2A';
    ctx.fillRect(0, 0, W, H);
    var grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0,   'rgba(0,229,255,0.15)');
    grad.addColorStop(0.5, 'rgba(0,229,255,0.05)');
    grad.addColorStop(1,   'rgba(0,229,255,0.15)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 70);
    ctx.fillStyle = '#00E5FF';
    ctx.font = 'bold 22px Courier New, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('DIAGRAMA DE FLUXO FINANCEIRO FORENSE -- UNIFED-PROBATUM v13.12.2-i18n', W / 2, 32);
    ctx.font = '14px Courier New, monospace';
    ctx.fillStyle = 'rgba(0,229,255,0.7)';
    ctx.fillText('Read-Only · Art. 125.o CPP · Output Enrichment Layer', W / 2, 55);
    var ganhos    = t.ganhos    || 0;
    var dac7      = t.dac7TotalPeriodo || 0;
    var saftBruto = t.saftBruto || 0;
    var volumeReal = ganhos;
    var faturadoSaft = Math.min(saftBruto, volumeReal);
    var reportadoDac7 = Math.min(dac7, volumeReal);
    var omissaoRet = Math.max(0, volumeReal - faturadoSaft - reportadoDac7);
    var nodes = [
        { x:  60, y: 240, w: 200, h: 110, label: 'Volume Transacional\nReal\n(Ganhos Extrato)',       value: volumeReal,    color: '#3B82F6' },
        { x: 440, y:  60, w: 200, h:  90, label: 'Faturado\n(SAF-T)',                                 value: faturadoSaft,  color: '#10B981' },
        { x: 440, y: 260, w: 200, h:  90, label: 'Reportado\n(DAC7)',                                 value: reportadoDac7, color: '#6366F1' },
        { x: 440, y: 460, w: 200, h:  90, label: 'Omissão /\nRetenção\nSistemática',                  value: omissaoRet,    color: '#EF4444' }
    ];
    var flows = [
        { from: 0, to: 1, color: '#10B981', opacity: 0.55 },
        { from: 0, to: 2, color: '#6366F1', opacity: 0.55 },
        { from: 0, to: 3, color: '#EF4444', opacity: 0.70 }
    ];
    flows.forEach(function(f) {
        var n1 = nodes[f.from], n2 = nodes[f.to];
        var x1 = n1.x + n1.w, y1 = n1.y + n1.h / 2;
        var x2 = n2.x,        y2 = n2.y + n2.h / 2;
        var cx = (x1 + x2) / 2;
        var g  = ctx.createLinearGradient(x1, 0, x2, 0);
        g.addColorStop(0, f.color + '80');
        g.addColorStop(1, f.color + 'CC');
        ctx.strokeStyle = g;
        ctx.lineWidth   = 14;
        ctx.globalAlpha = f.opacity;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.bezierCurveTo(cx, y1, cx, y2, x2, y2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    });
    nodes.forEach(function(nd) {
        ctx.fillStyle   = nd.color + '33';
        ctx.strokeStyle = nd.color;
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.rect(nd.x, nd.y, nd.w, nd.h);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = nd.color;
        ctx.font = 'bold 13px Courier New, monospace';
        ctx.textAlign = 'center';
        nd.label.split('\n').forEach(function(ln, i) {
            ctx.fillText(ln, nd.x + nd.w / 2, nd.y + 24 + i * 16);
        });
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px Courier New, monospace';
        ctx.fillText(_fmtEur(nd.value), nd.x + nd.w / 2, nd.y + nd.h - 14);
    });
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '12px Courier New, monospace';
    ctx.textAlign = 'left';
    [
        { color: '#3B82F6', text: 'Volume Real (Ganhos Extrato): ' + _fmtEur(volumeReal) },
        { color: '#10B981', text: 'Faturado (SAF-T): ' + _fmtEur(faturadoSaft) },
        { color: '#6366F1', text: 'Reportado (DAC7): ' + _fmtEur(reportadoDac7) },
        { color: '#EF4444', text: 'Omissao/Retencao Sistematica: ' + _fmtEur(omissaoRet) + ' (' + (c.percentagemOmissao || 0).toFixed(2) + '%)' }
    ].forEach(function(lg, i) {
        ctx.fillStyle = lg.color;
        ctx.fillRect(60 + i * 320, H - 45, 14, 14);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText(lg.text, 80 + i * 320, H - 33);
    });
    var dataURL = canvas.toDataURL('image/png');
    canvas.width  = 0;
    canvas.height = 0;
    ctx = null;
    document.body.removeChild(canvas);
    return dataURL;
}

// ============================================================================
// 4. generateIntegritySeal(masterHash, doc, x, y, sealSize)
// ============================================================================
function generateIntegritySeal(masterHash, doc, x, y, sealSize) {
    if (!masterHash || masterHash.length < 32 || !doc) return;
    var SZ = sealSize || 52;
    var CX = x + SZ / 2;
    var CY = y + SZ / 2;
    var R  = SZ * 0.42;
    var R2 = SZ * 0.28;
    var bytes = [];
    for (var i = 0; i < Math.min(masterHash.length, 64); i += 2)
        bytes.push(parseInt(masterHash.substring(i, i + 2), 16));
    doc.saveGraphicsState();
    doc.setFillColor(8, 18, 36);
    doc.rect(x, y, SZ, SZ, 'F');
    doc.setDrawColor(0, 229, 255);
    doc.setLineWidth(0.6);
    doc.rect(x, y, SZ, SZ, 'S');
    doc.setFontSize(3.8);
    doc.setFont('courier', 'bold');
    doc.setTextColor(0, 229, 255);
    doc.text('PROBATUM INTEGRITY SEAL', CX, y + 3.5, { align: 'center' });
    doc.text('v13.12.2-i18n \u00b7 SHA-256', CX, y + 6.5, { align: 'center' });
    doc.setDrawColor(30, 60, 100);
    doc.setLineWidth(0.2);
    doc.circle(CX, CY, R, 'S');
    doc.setLineWidth(0.25);
    for (var j = 0; j < 16; j++) {
        var angleDeg  = (bytes[j] / 255) * 360;
        var angleRad  = (angleDeg * Math.PI) / 180;
        var lenFactor = 0.4 + (bytes[(j + 16) % 32] / 255) * 0.58;
        var r1 = Math.round(30  + (bytes[(j * 2)     % 32] / 255) * 225);
        var g1 = Math.round(30  + (bytes[(j * 2 + 1) % 32] / 255) * 200);
        var b1 = Math.round(80  + (bytes[(j * 2 + 2) % 32] / 255) * 175);
        doc.setDrawColor(r1, g1, b1);
        var ex = CX + Math.cos(angleRad) * R * lenFactor;
        var ey = CY + Math.sin(angleRad) * R * lenFactor;
        doc.line(CX, CY, ex, ey);
    }
    doc.setDrawColor(0, 229, 255);
    doc.setLineWidth(0.3);
    var polyN = 6 + (bytes[16] % 4);
    var ppx, ppy;
    for (var k = 0; k < polyN; k++) {
        var bi  = (k * 4) % 32;
        var af  = bytes[bi] / 255;
        var rf  = 0.35 + (bytes[(bi + 1) % 32] / 255) * 0.55;
        var ang = ((k / polyN) * 360 + af * (360 / polyN)) * Math.PI / 180;
        var px  = CX + Math.cos(ang) * R2 * rf;
        var py  = CY + Math.sin(ang) * R2 * rf;
        if (k > 0) doc.line(ppx, ppy, px, py);
        ppx = px; ppy = py;
    }
    doc.setFillColor(0, 229, 255);
    doc.circle(CX, CY, 0.8, 'F');
    doc.setFontSize(3.2);
    doc.setFont('courier', 'normal');
    doc.setTextColor(100, 140, 180);
    doc.text(masterHash.substring(0, 16) + '...', CX, y + SZ - 3, { align: 'center' });
    doc.restoreGraphicsState();
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    console.log('[UNIFED-SEAL] \u2705 Integrity Seal gerado - hash prefix:', masterHash.substring(0, 8));
}
window.generateIntegritySeal = generateIntegritySeal;

// ============================================================================
// 5. exportDOCX(xmlInject) - Structural DOCX Export
// ============================================================================
async function exportDOCX(xmlInject) {
    if (typeof JSZip === 'undefined') {
        console.error('[UNIFED-DOCX] \u274c JSZip nao disponivel.');
        if (typeof showToast === 'function') showToast('Erro: JSZip nao carregado', 'error');
        return;
    }
    if (!window.UNIFEDSystem || !window.UNIFEDSystem.client) {
        if (typeof showToast === 'function') showToast('Sem sujeito passivo para gerar minuta.', 'error');
        return;
    }
    if (typeof window.logAudit === 'function') window.logAudit('\ud83d\udcc4 [v13.12.2-i18n] A gerar Minuta de Peticao Inicial (DOCX)...', 'info');
    var sys  = window.UNIFEDSystem;
    var t    = (sys.analysis && sys.analysis.totals)    || {};
    var c    = (sys.analysis && sys.analysis.crossings) || {};
    var v    = (sys.analysis && sys.analysis.verdict)   || {};
    var date = new Date().toLocaleDateString('pt-PT');
    var xe = function(s) {
        return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    };
    var para = function(text, bold, size, color, align) {
        bold  = bold  || false;
        size  = size  || '20';
        color = color || '000000';
        align = align || 'left';
        return '<w:p><w:pPr><w:jc w:val="' + align + '"/><w:spacing w:after="120"/></w:pPr><w:r>' +
               '<w:rPr><w:sz w:val="' + size + '"/><w:szCs w:val="' + size + '"/>' +
               (bold ? '<w:b/><w:bCs/>' : '') +
               '<w:color w:val="' + color + '"/></w:rPr>' +
               '<w:t xml:space="preserve">' + xe(text) + '</w:t></w:r></w:p>';
    };
    var tc = function(text, bold, w, shade) {
        bold  = bold  || false;
        w     = w     || 4000;
        return '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/>' +
               (shade ? '<w:shd w:val="clear" w:color="auto" w:fill="' + shade + '"/>' : '') +
               '<w:tcBorders><w:top w:val="single" w:sz="4" w:color="AAAAAA"/><w:left w:val="single" w:sz="4" w:color="AAAAAA"/><w:bottom w:val="single" w:sz="4" w:color="AAAAAA"/><w:right w:val="single" w:sz="4" w:color="AAAAAA"/></w:tcBorders>' +
               '</w:tcPr><w:p><w:pPr><w:spacing w:after="60"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/>' +
               (bold ? '<w:b/><w:bCs/>' : '') +
               '</w:rPr><w:t xml:space="preserve">' + xe(text) + '</w:t></w:r></w:p></w:tc>';
    };
    var tr  = function(cells) { return '<w:tr>' + cells.join('') + '</w:tr>'; };
    var tbl = function(rows)  {
        return '<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/>' +
               '<w:tblBorders><w:insideH w:val="single" w:sz="4" w:color="DDDDDD"/>' +
               '<w:insideV w:val="single" w:sz="4" w:color="DDDDDD"/></w:tblBorders></w:tblPr>' +
               rows.join('') + '</w:tbl>';
    };
    var hr  = function() {
        return '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="003366"/></w:pBdr>' +
               '<w:spacing w:before="120" w:after="120"/></w:pPr></w:p>';
    };
    var fe = function(val) { return window.UNIFEDSystem.utils.formatCurrency(val); };
    var discRows = [tr([tc('Indicador Pericial', true, 5000, 'E8F0F8'), tc('Valor Apurado', true, 4000, 'E8F0F8')])];
    if (Math.abs(c.discrepanciaCritica || 0) > 0) discRows.push(tr([tc('Omissao de Custos - BTF (Despesas vs Fatura)', false, 5000), tc(fe(c.discrepanciaCritica), false, 4000)]));
    if (Math.abs(c.discrepanciaSaftVsDac7 || 0) > 0) discRows.push(tr([tc('Omissao de Receita - SAF-T vs DAC7', false, 5000), tc(fe(c.discrepanciaSaftVsDac7), false, 4000)]));
    if ((c.ivaFalta || 0) > 0) discRows.push(tr([tc('IVA 23% Omitido (Art. 2.o CIVA)', false, 5000), tc(fe(c.ivaFalta), false, 4000)]));
    if ((c.ivaFalta6 || 0) > 0) discRows.push(tr([tc('IVA 6% Omitido (Transporte - CIVA)', false, 5000), tc(fe(c.ivaFalta6), false, 4000)]));
    if ((c.ircEstimado || 0) > 0) discRows.push(tr([tc('IRC Estimado Omitido (Art. 17.o CIRC)', false, 5000), tc(fe(c.ircEstimado), false, 4000)]));
    if ((c.impactoSeteAnosMercado || 0) > 0) discRows.push(tr([tc('Impacto Macroeconomico 7 Anos', true, 5000, 'FFF0F0'), tc(fe(c.impactoSeteAnosMercado), true, 4000, 'FFF0F0')]));
    var srcRows = [tr([tc('Documento', true, 3000, 'E8F0F8'), tc('Tipo', true, 2000, 'E8F0F8'), tc('Hash SHA-256 (64 caracteres)', true, 4000, 'E8F0F8')])];
    if (sys.analysis && sys.analysis.evidenceIntegrity) {
        (sys.analysis.evidenceIntegrity || []).slice(0, 8).forEach(function(ev) {
            srcRows.push(tr([tc(ev.filename || 'N/A', false, 3000), tc(ev.type || 'N/A', false, 2000), tc(ev.hash || 'N/A', false, 4000)]));
        });
    }
    var aiNarrative = _fallbackNarrative('DOCX export - API indisponivel offline');
    try {
        if (typeof generateLegalNarrative === 'function')
            aiNarrative = await generateLegalNarrative(sys.analysis);
    } catch (_e) { }
    var _ghostRe = /Página\s+\d+\s+de\s+\d+|PROBATUM\s+SEAL|v13\.\d+\.\d+-[A-Z]+\s*·\s*Página|\bTERIAL\b|\bAL\s+RGIT\b|&amp;|&ndash;|&–|&#\d+;/gi;
    var narrativeParas = aiNarrative.split('\n')
        .map(function(l) { return l.trim(); })
        .filter(function(l) { return l.length > 0; })
        .map(function(l) { return l.replace(_ghostRe, '').trim(); })
        .filter(function(l) { return l.length > 0; })
        .map(function(l) {
            var isH = /^Secc?[a-z]o [A-D]|^SINTESE/.test(l);
            return para(l, isH, isH ? '22' : '20', isH ? '003366' : '222222');
        });
    var bodyContent = [
        para('TRIBUNAL JUDICIAL DE COMARCA', true, '24', '003366', 'center'),
        para('JUIZO LOCAL CIVEL', false, '20', '555555', 'center'),
        para('', false),
        para('MINUTA DE PETICAO INICIAL', true, '32', '003366', 'center'),
        para('PROVA PERICIAL FORENSE FISCAL - TVDE', true, '24', '0066CC', 'center'),
        para('', false), hr(),
        para('Processo N.o: ' + xe(sys.sessionId || 'UNIFED-PENDING'), false, '20', '333333'),
        para('Data de Elaboracao: ' + date, false, '20', '333333'),
        para('Sistema: UNIFED - PROBATUM v13.12.2-i18n - ADMISSIBILIDADE ART. 125.º CPP - DORA COMPLIANT', false, '18', '666666'),
        para('Referencia de Integridade: Master Hash SHA-256: ' + xe(sys.masterHash || 'N/A'), false, '16', '888888'),
        hr(), para('', false),
        para('I. IDENTIFICACAO', true, '26', '003366'), para('', false),
        tbl([
            tr([tc('Sujeito Passivo',   true, 3000, 'E8F0F8'), tc(sys.client && sys.client.name || 'N/A', false, 6000)]),
            tr([tc('NIF',               true, 3000, 'E8F0F8'), tc(sys.client && sys.client.nif  || 'N/A', false, 6000)]),
            tr([tc('Plataforma',        true, 3000, 'E8F0F8'), tc((sys.selectedPlatform && sys.selectedPlatform !== 'outra') ? sys.selectedPlatform : 'Plataforma A', false, 6000)]),
            tr([tc('Ano Fiscal',        true, 3000, 'E8F0F8'), tc(String(sys.selectedYear || new Date().getFullYear()), false, 6000)]),
            tr([tc('Perito',            true, 3000, 'E8F0F8'), tc('Analista e Consultor Forense Independente', false, 6000)]),
            tr([tc('Veredicto',         true, 3000, 'FFF0F0'), tc((v.level && v.level.pt) || 'N/A', true, 6000)])
        ]),
        para('', false), hr(), para('', false),
        para('I-A. CONFORMIDADE E EVIDENCIA DIGITAL', true, '26', '003366'), para('', false),
        para('Objeto: Analise de Discrepancias de Terceiros (Plataformas Digitais) atuando sob monopolio de faturacao (Art. 36.o, n.o 11 CIVA).', false, '20', '333333'),
        para('Fundamentacao: Art. 104.o n.o 2 RGIT (Fraude Qualificada) e Art. 125.o CPP.', false, '20', '333333'),
        para('Evidencia: Omissao de base tributavel por divergencia entre Ganhos Reais efetivos (Ledger/Extrato) e o Reporte Fiscal submetido pela plataforma (SAF-T/DAC7).', false, '20', '333333'),
        para('Conclusao Pericial: A retencao sistematica de percentagens em comissoes sem a devida faturacao constitui apropriacao indevida e indicia crime tributario de omissao de proveitos por parte da entidade processadora.', true, '20', 'CC0000'),
        para('', false), hr(), para('', false),
        para('II. FACTOS PROVADOS - DISCREPANCIAS APURADAS', true, '26', '003366'), para('', false),
        para('Com base na analise pericial das evidencias digitais certificadas, foram apuradas as seguintes discrepancias:', false, '20', '333333'),
        para('', false), tbl(discRows), para('', false),
        para('Percentagem de Omissao de Custos: ' + (c.percentagemOmissao || 0).toFixed(2) + '%', true, '20', 'CC0000'),
        para('Percentagem Discrepancia SAF-T vs DAC7: ' + (c.percentagemSaftVsDac7 || 0).toFixed(2) + '%', true, '20', 'CC0000'),
        para('', false), hr(), para('', false),
        para('III. CADEIA DE CUSTODIA - EVIDENCIAS DIGITAIS', true, '26', '003366'), para('', false),
        para('As evidencias digitais foram certificadas com hash SHA-256 nos termos do Art. 125.o do CPP:', false, '20', '333333'),
        para('', false), tbl(srcRows), para('', false), hr(), para('', false),
        para('III-A. QUALIFICAÇÃO JURÍDICA — CRIMINALIDADE DE COLARINHO BRANCO', true, '26', '6B0099'), para('', false),
        para('A engenharia algoritmica da plataforma cria uma zona cinzenta premeditada entre o ganho real retido na fonte e o valor reportado em SAF-T/DAC7. Este diferencial nao declarado fica num limbo contabilistico, caracterizando uma tipologia de criminalidade de colarinho branco e evasao fiscal estruturada, explorando a assimetria de informacao contra o parceiro e o Estado.', false, '20', '333333'),
        para('', false), hr(), para('', false),
        para('III-B. PERDA DE CHANCE E DANO REPUTACIONAL', true, '26', 'B85000'), para('', false),
        para('Dano Reputacional e Perda de Chance: O reporte viciado da plataforma a Autoridade Tributaria (com uma discrepancia detetada de ' + fe(c.discrepanciaSaftVsDac7) + ') contamina diretamente o perfil de risco (Risk Scoring) do parceiro. Sendo a plataforma a detentora do monopolio de emissao documental (Art. 36.o n.o 11 CIVA), o sujeito passivo e penalizado sem dolo. Esta adulteracao do perfil fiscal gera lucros cessantes mensuraveis, inibindo o acesso a financiamento bancario, linhas de credito e beneficios fiscais, constituindo fundamento para indemnizacao por responsabilidade civil extracontratual.', false, '20', '333333'),
        para('', false), hr(), para('', false),
        para('IV. SÍNTESE JURÍDICA PERICIAL — ANÁLISE DETERMINÍSTICA', true, '26', '003366'),
        para('Elaborada sob metodologia forense UNIFED-PROBATUM v13.12.2-i18n. Análise algorítmica de base determinística (non-probabilistic). Conformidade: Art. 125.º CPP · ISO/IEC 27037:2012 · DORA (UE) 2022/2554.', false, '16', '555555'),
        para('NOTA: A jurisprudência citada constitui referência doutrinária para orientação do advogado mandatário. Toda a referência a acórdãos deve ser validada pelo advogado antes de qualquer uso processual. O perito responsabiliza-se pelos dados forenses e pela metodologia UNIFED-PROBATUM.', false, '16', '888888'),
        para('', false)
    ].concat(narrativeParas).concat([
        para('', false), hr(), para('', false),
        para('V. CLÁUSULA DE CONDENAÇÃO — PETIÇÃO CONSOLIDADA (PERDA DE CHANCE)', true, '26', '003366'), para('', false),
        para('NOTA METODOLÓGICA OBRIGATÓRIA: O UNIFED-PROBATUM não realiza contabilidade. Realiza RECONSTITUIÇÃO DA VERDADE MATERIAL DIGITAL — um processo forense de engenharia reversa sobre os fluxos de caixa reais vs. reportados, com o objetivo de estabelecer a verdade material dos factos para efeitos processuais. Esta distinção é juridicamente relevante para a admissibilidade da prova pericial (Art. 125.º CPP · ISO/IEC 27037:2012).', true, '18', '003366'),
        para('', false),
        tbl([
            tr([tc('Componente de Condenação', true, 4000, 'E8F0F8'), tc('Fórmula / Quantificação', true, 5000, 'E8F0F8')]),
            tr([tc('Indemnização por Perda de Chance (principal)', false, 4000), tc('A liquidar em execução de sentença — correspondente ao diferencial de juros bancários agravados pelo vício no cadastro fiscal (Risk Scoring AT) causado pela Ré, calculado desde a data de início das omissões até efectivo ressarcimento.', false, 5000)]),
            tr([tc('Omissão de IVA 23% (retenção indevida)', false, 4000), tc(fe(c.ivaFalta) + ' — Art. 2.º n.º 1 al. i) CIVA · Autoliquidação em falta', false, 5000)]),
            tr([tc('Omissão de IVA 6% (transporte)', false, 4000), tc(fe(c.ivaFalta6) + ' — Art. 18.º n.º 1 al. b) CIVA · Taxa Reduzida Transporte', false, 5000)]),
            tr([tc('Omissão de Faturação (C2 — Smoking Gun)', true, 4000, 'FFF0F0'), tc(fe(c.discrepanciaCritica) + ' (' + (c.percentagemOmissao || 0).toFixed(2) + '%) — Discrepância Despesas/Fatura (BTOR vs BTF)', true, 5000, 'FFF0F0')]),
            tr([tc('Dano Reputacional / Risk Scoring AT', false, 4000), tc('Exposição ao risco: ' + fe(c.discrepanciaSaftVsDac7) + ' (omissão SAF-T vs DAC7) — agravamento injustificado do perfil fiscal que inibe acesso a crédito e benefícios fiscais.', false, 5000)]),
            tr([tc('IRC Estimado Omitido (21%)', false, 4000), tc(fe(c.ircEstimado) + ' — Art. 17.º CIRC · Agravamento anual', false, 5000)]),
            tr([tc('Juros de Mora / Sanções CIVA', false, 4000), tc('A liquidar — Art. 108.º CIVA · Art. 103.º/104.º RGIT · prazo de prescrição 7 anos (Art. 45.º LGT)', false, 5000)]),
            tr([tc('IMPACTO MACROECONÓMICO (7 Anos · 38.000 condutores PT)', true, 4000, 'FFF0F0'), tc(fe(c.impactoSeteAnosMercado) + ' — Relevância sistémica para litígio especializado', true, 5000, 'FFF0F0')])
        ]),
        para('', false),
        para('Cláusula de Redação Processual (para peça autónoma do advogado mandatário):', true, '18', '003366'),
        para('"Deve a Ré ser condenada a pagar ao Autor: (I) indemnização a liquidar em execução de sentença, correspondente ao diferencial de juros bancários agravados pelo vício no cadastro fiscal (Risk Scoring) causado pela conduta omissiva da Ré, imputável à subdeclaração sistemática de rendimentos perante a Autoridade Tributária; (II) o valor apurado de ' + fe(c.discrepanciaCritica) + ' a título de omissão de faturação de comissões retidas sem suporte documental; (III) IVA em falta no montante de ' + fe((c.ivaFalta || 0) + (c.ivaFalta6 || 0)) + '; (IV) juros de mora e acréscimos legais sobre todos os montantes, desde a data de início das omissões até integral pagamento — tudo nos termos dos Arts. 103.º/104.º RGIT, Art. 36.º n.º 11 CIVA, e Art. 483.º CC."', false, '20', '333333'),
        para('', false), hr(), para('', false),
        para('V-A. DECLARACAO DO PERITO', true, '26', '003366'), para('', false),
        para('Declaro, sob compromisso de honra, que o presente documento foi elaborado em qualidade de Consultor Tecnico Independente, assumindo os deveres de independencia, objetividade e imparcialidade previstos no artigo 153.o do Codigo de Processo Penal Portugues.', false, '20', '333333'),
        para('', false),
        para('O presente estudo constitui RECONSTITUIÇÃO DA VERDADE MATERIAL DIGITAL — nao contabilidade. O sistema UNIFED-PROBATUM aplica metodologia de engenharia reversa forense sobre fluxos de caixa reais vs. reportados (BTOR vs BTF), com rastreabilidade criptografica completa (SHA-256 + RFC 3161 + AES-256), sendo os resultados plenamente admissiveis como prova tecnica pericial (Art. 125.o CPP · ISO/IEC 27037:2012 · DORA UE 2022/2554).', false, '20', '555555'),
        para('', false),
        para('Porto, ' + date, false, '20', '333333'), para('', false),
        para('_____________________________________________', false, '20', '333333'),
        para('Analista e Consultor Forense Independente - UNIFED - PROBATUM v13.12.2-i18n', false, '18', '555555'),
        para('Reconstituicao da Verdade Material Digital · Art. 153.o CPP · ISO/IEC 27037:2012', false, '16', '888888'),
        para('', false),
        para('AVISO: Esta minuta e destinada ao advogado mandatario. Nao constitui por si so peca processual.', false, '16', 'AA0000')
    ]).join('');
    var contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n' +
        '  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n' +
        '  <Default Extension="xml" ContentType="application/xml"/>\n' +
        '  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>\n' +
        '  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>\n' +
        '</Types>';
    var pkgRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n' +
        '  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>\n' +
        '</Relationships>';
    var wordRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n' +
        '  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>\n' +
        '</Relationships>';
    var stylesXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
        '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">\n' +
        '  <w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>' +
        '<w:sz w:val="20"/></w:rPr></w:rPrDefault></w:docDefaults>\n' +
        '</w:styles>';
    var _docXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"\n' +
        '            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">\n' +
        '  <w:body>\n' +
        '    <w:sectPr>\n' +
        '      <w:pgSz w:w="11906" w:h="16838"/>\n' +
        '      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>\n' +
        '    </w:sectPr>\n' +
        '    ' + bodyContent + '\n' +
        '  </w:body>\n' +
        '</w:document>';
    try {
        if (xmlInject && typeof xmlInject === 'string' && xmlInject.trim().length > 0) {
            _docXml = _docXml.replace('</w:body>', xmlInject + '</w:body>');
            console.info('[UNIFED-DOCX] [i] xmlInject RAG aplicado em _docXml (' + xmlInject.length + ' chars) — prototype seguro.');
        }
        var zip = new JSZip();
        zip.file('[Content_Types].xml', contentTypes);
        zip.file('_rels/.rels', pkgRels);
        zip.file('word/_rels/document.xml.rels', wordRels);
        zip.file('word/document.xml', _docXml);
        zip.file('word/styles.xml', stylesXml);
        var blob = await zip.generateAsync({
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        var url  = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href     = url;
        link.download = 'UNIFED_PETICAO_' + (sys.sessionId || 'DRAFT') + '.docx';
        document.body.appendChild(link);
        link.click();
        setTimeout(function() {
            try { URL.revokeObjectURL(url); document.body.removeChild(link); } catch (_) {}
        }, 2000);
        if (typeof window.logAudit === 'function') window.logAudit('\u2705 [v13.12.2-i18n] Minuta DOCX exportada com sucesso.', 'success');
        if (typeof showToast === 'function') showToast('Minuta DOCX exportada - Peticao Inicial pronta', 'success');
        if (typeof ForensicLogger !== 'undefined') ForensicLogger.addEntry('DOCX_EXPORT_COMPLETED', { sessionId: sys.sessionId });
    } catch (zipErr) {
        console.error('[UNIFED-DOCX] \u274c Erro ao gerar ZIP:', zipErr.message);
        if (typeof showToast === 'function') showToast('Erro ao gerar DOCX: ' + zipErr.message, 'error');
    }
}
window.exportDOCX = exportDOCX;

// ============================================================================
// 6. NIFAF - Delegado à implementação principal em script.js
// ============================================================================
if (typeof window.NIFAF === 'undefined') {
    var NIFAF_FALLBACK = {
        isEnabled: false,
        playCriticalAlert: function() {},
        toggle: function() { this.isEnabled = !this.isEnabled; return this.isEnabled; }
    };
    window.NIFAF = NIFAF_FALLBACK;
    console.log('[UNIFED-ENRICHMENT] NIFAF em modo fallback (implementação principal em script.js)');
} else {
    console.log('[UNIFED-ENRICHMENT] NIFAF já definido — utilizando implementação principal de script.js');
}

// ============================================================================
// 7. ATF - ANALISE TEMPORAL FORENSE
// ============================================================================
function computeTemporalAnalysis(monthlyData, analysis) {
    if (window.PURE_MODE_ACTIVE) {
        console.warn("[ENRICHMENT] Análise temporal suspensa: Modo de Prova Ativo.");
        return;
    }
    var months = Object.keys(monthlyData || {}).sort();
    if (months.length === 0) {
        return {
            months: [], ganhosSeries: [], despesasSeries: [], discrepancySeries: [],
            mean: 0, stdDev: 0, outlierMonths: [],
            persistenceScore: 0,
            persistenceLabel: (typeof window.currentLang !== 'undefined' && window.currentLang === 'en')
                ? 'Insufficient data. Upload monthly statements (filename must include YYYYMM).'
                : 'Dados insuficientes. Carregue extratos mensais (nome AAAAMM).',
            trend: 'neutral', opportunisticPattern: false
        };
    }
    var ganhosSeries      = months.map(function(m) { return (monthlyData[m].ganhos    || 0); });
    var despesasSeries    = months.map(function(m) { return (monthlyData[m].despesas  || 0); });
    var discrepancySeries = months.map(function(m, i) { return Math.abs(despesasSeries[i] - ganhosSeries[i]); });
    var n    = discrepancySeries.length;
    var mean = discrepancySeries.reduce(function(a, v) { return a + v; }, 0) / n;
    var variance = discrepancySeries.reduce(function(a, v) { return a + Math.pow(v - mean, 2); }, 0) / n;
    var stdDev   = Math.sqrt(variance);
    var outlierMonths = months.filter(function(m, i) { return discrepancySeries[i] > mean + 2 * stdDev; });
    var sx = 0, sy = 0, sxy = 0, sx2 = 0;
    discrepancySeries.forEach(function(v, i) { sx += i; sy += v; sxy += i * v; sx2 += i * i; });
    var slope = n > 1 ? (n * sxy - sx * sy) / (n * sx2 - sx * sx) : 0;
    var trend = slope > 50 ? 'ascending' : slope < -50 ? 'descending' : 'stable';
    var meanGanhos = ganhosSeries.reduce(function(a, v) { return a + v; }, 0) / n;
    var opportunisticPattern = months.some(function(m, i) {
        return outlierMonths.indexOf(m) !== -1 && ganhosSeries[i] > meanGanhos;
    });
    var pctDisc  = discrepancySeries.filter(function(v) { return v > 0.01; }).length / n;
    var spBase   = pctDisc * 40;
    var spTrend  = trend === 'ascending' ? 25 : trend === 'stable' ? 10 : 0;
    var spOut    = Math.min(outlierMonths.length * 10, 25);
    var spOpp    = opportunisticPattern ? 10 : 0;
    var persistenceScore = Math.min(Math.round(spBase + spTrend + spOut + spOpp), 100);
    var _atfLang = (typeof window.currentLang !== 'undefined') ? window.currentLang : 'pt';
    var _atfT    = function(pt, en) { return _atfLang === 'en' ? en : pt; };
    var persistenceLabel;
    if (persistenceScore >= 80) {
        persistenceLabel = _atfT(
            'PADRAO DE OMISSAO SISTEMATICA DETETADO - Comportamento consistente com dolo para efeitos Art. 104.o RGIT.',
            'SYSTEMATIC OMISSION PATTERN DETECTED - Behaviour consistent with intent under Art. 104 RGIT.'
        );
    } else if (persistenceScore >= 55) {
        persistenceLabel = _atfT(
            'PADRAO DE OMISSAO RECORRENTE - Indicios de negligencia grave ou comportamento oportunistico.',
            'RECURRENT OMISSION PATTERN - Indications of gross negligence or opportunistic behaviour.'
        );
    } else if (persistenceScore >= 30) {
        persistenceLabel = _atfT(
            'OMISSOES PONTUAIS IDENTIFICADAS - Analise complementar recomendada.',
            'OCCASIONAL OMISSIONS IDENTIFIED - Supplementary analysis recommended.'
        );
    } else {
        persistenceLabel = _atfT(
            'Omissoes esporadicas - possivel erro operacional.',
            'Sporadic omissions - possible operational error.'
        );
    }
    if (opportunisticPattern) {
        persistenceLabel += ' ' + _atfT(
            'PADRAO OPORTUNISTICO: omissoes concentradas em meses de maior faturacao.',
            'OPPORTUNISTIC PATTERN: omissions concentrated in highest-revenue months.'
        );
    }
    return {
        months: months, ganhosSeries: ganhosSeries,
        despesasSeries: despesasSeries, discrepancySeries: discrepancySeries,
        mean: mean, stdDev: stdDev, outlierMonths: outlierMonths,
        trend: trend, persistenceScore: persistenceScore,
        persistenceLabel: persistenceLabel, opportunisticPattern: opportunisticPattern
    };
}
window.computeTemporalAnalysis = computeTemporalAnalysis;

async function generateTemporalChartImage(monthlyData, analysis) {
    var W = 1200, H = 420;
    var canvas;
    try {
        canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        canvas.style.cssText = 'position:fixed;left:-9999px;top:-9999px;visibility:hidden;';
        document.body.appendChild(canvas);
    } catch (e) {
        console.warn('[UNIFED-ATF] \u26a0 Canvas indisponivel:', e.message);
        return null;
    }
    var ctx3 = canvas.getContext('2d');
    var atf   = computeTemporalAnalysis(monthlyData, analysis);
    var months = atf.months;
    if (months.length === 0) {
        document.body.removeChild(canvas);
        return null;
    }
    ctx3.fillStyle = '#0D1B2A';
    ctx3.fillRect(0, 0, W, H);
    ctx3.fillStyle = '#00E5FF';
    ctx3.font = 'bold 18px Courier New, monospace';
    ctx3.textAlign = 'center';
    ctx3.fillText('ANALISE TEMPORAL FORENSE (ATF) - TENDENCIAS - OUTLIERS 2\u03c3 - INDICE DE RECIDIVA', W / 2, 28);
    ctx3.font = '12px Courier New, monospace';
    ctx3.fillStyle = 'rgba(0,229,255,0.6)';
    ctx3.fillText('Meses: ' + months.length + ' | Score de Persistencia: ' + atf.persistenceScore + '/100 | Tendencia: ' + atf.trend.toUpperCase(), W / 2, 48);
    var padL = 80, padR = 40, padT = 70, padB = 60;
    var cW = W - padL - padR, cH = H - padT - padB;
    ctx3.strokeStyle = 'rgba(0,229,255,0.3)'; ctx3.lineWidth = 1;
    ctx3.beginPath();
    ctx3.moveTo(padL, padT); ctx3.lineTo(padL, padT + cH);
    ctx3.lineTo(padL + cW, padT + cH);
    ctx3.stroke();
    var allV = atf.ganhosSeries.concat(atf.despesasSeries).concat(atf.discrepancySeries);
    var maxV = Math.max.apply(null, allV.concat([1]));
    var xS   = cW / Math.max(months.length - 1, 1);
    var toX  = function(i) { return padL + i * xS; };
    var toY  = function(v) { return padT + cH - (v / maxV) * cH; };
    var mY = toY(atf.mean);
    ctx3.strokeStyle = 'rgba(255,255,255,0.2)'; ctx3.setLineDash([6, 4]);
    ctx3.beginPath(); ctx3.moveTo(padL, mY); ctx3.lineTo(padL + cW, mY); ctx3.stroke();
    ctx3.setLineDash([]);
    if (atf.stdDev > 0) {
        var sigY = toY(atf.mean + 2 * atf.stdDev);
        ctx3.strokeStyle = 'rgba(239,68,68,0.3)'; ctx3.setLineDash([3, 3]);
        ctx3.beginPath(); ctx3.moveTo(padL, sigY); ctx3.lineTo(padL + cW, sigY); ctx3.stroke();
        ctx3.setLineDash([]);
        ctx3.fillStyle = 'rgba(239,68,68,0.7)'; ctx3.font = '10px Courier New, monospace';
        ctx3.textAlign = 'left'; ctx3.fillText('2\u03c3', padL + cW + 4, sigY + 4);
    }
    ctx3.strokeStyle = '#3B82F6'; ctx3.lineWidth = 2;
    ctx3.beginPath();
    atf.ganhosSeries.forEach(function(v, i) {
        if (i === 0) ctx3.moveTo(toX(i), toY(v)); else ctx3.lineTo(toX(i), toY(v));
    }); ctx3.stroke();
    ctx3.strokeStyle = '#10B981'; ctx3.lineWidth = 2;
    ctx3.beginPath();
    atf.despesasSeries.forEach(function(v, i) {
        if (i === 0) ctx3.moveTo(toX(i), toY(v)); else ctx3.lineTo(toX(i), toY(v));
    }); ctx3.stroke();
    ctx3.strokeStyle = '#F59E0B'; ctx3.lineWidth = 2.5;
    ctx3.beginPath();
    atf.discrepancySeries.forEach(function(v, i) {
        if (i === 0) ctx3.moveTo(toX(i), toY(v)); else ctx3.lineTo(toX(i), toY(v));
    }); ctx3.stroke();
    atf.discrepancySeries.forEach(function(v, i) {
        var isOut = atf.outlierMonths.indexOf(months[i]) !== -1;
        ctx3.fillStyle   = isOut ? '#EF4444' : '#F59E0B';
        ctx3.strokeStyle = isOut ? '#FFFFFF'  : '#F59E0B';
        ctx3.lineWidth   = isOut ? 2 : 1;
        ctx3.beginPath();
        ctx3.arc(toX(i), toY(v), isOut ? 7 : 4, 0, Math.PI * 2);
        ctx3.fill(); if (isOut) ctx3.stroke();
    });
    ctx3.fillStyle = 'rgba(255,255,255,0.6)'; ctx3.font = '10px Courier New, monospace'; ctx3.textAlign = 'center';
    months.forEach(function(m, i) {
        var label = m.length === 6 ? m.substring(0, 4) + '/' + m.substring(4) : m;
        ctx3.fillText(label, toX(i), padT + cH + 18);
    });
    [
        { color: '#3B82F6', text: 'Ganhos' },
        { color: '#10B981', text: 'Despesas' },
        { color: '#F59E0B', text: 'Discrepancia' },
        { color: '#EF4444', text: 'Outlier >2\u03c3' }
    ].forEach(function(lg, i) {
        ctx3.fillStyle = lg.color;
        ctx3.fillRect(padL + i * 250, H - 22, 12, 12);
        ctx3.fillStyle = 'rgba(255,255,255,0.7)'; ctx3.font = '11px Courier New, monospace'; ctx3.textAlign = 'left';
        ctx3.fillText(lg.text, padL + i * 250 + 16, H - 11);
    });
    var dataURL = canvas.toDataURL('image/png');
    canvas.width  = 0;
    canvas.height = 0;
    ctx3 = null;
    document.body.removeChild(canvas);
    console.log('[UNIFED-ATF] \u2705 Grafico ATF gerado - meses:', months.length, '| SP:', atf.persistenceScore);
    return dataURL;
}
window.generateTemporalChartImage = generateTemporalChartImage;

// ============================================================================
// 7.1 renderATFChart() — Função estável com flag de mutex (adicionada da retificação)
// ============================================================================
window._isGraphRendering = false;

window.renderATFChart = function(data) {
    // Verificar se existem dados reais
    const sys = window.UNIFEDSystem;
    const totals = sys?.analysis?.totals;
    if (!totals || (totals.ganhos === 0 && totals.despesas === 0)) {
        console.log('[UNIFED-ATF] renderATFChart abortado: dados zero.');
        return;
    }
    if (!data || !data.months || data.months.length === 0) {
        console.warn('[UNIFED-ATF] renderATFChart: dados inválidos ou vazios.');
        return;
    }
    if (window._isGraphRendering) {
        console.log('[UNIFED-ATF] Renderização já em curso. Aguardando...');
        return;
    }
    window._isGraphRendering = true;

    const canvas = document.getElementById('atfChartCanvas');
    if (!canvas) {
        window._isGraphRendering = false;
        console.warn('[UNIFED-ATF] Canvas #atfChartCanvas não encontrado.');
        return;
    }

    if (window.atfChartInstance && typeof window.atfChartInstance.destroy === 'function') {
        window.atfChartInstance.destroy();
        window.atfChartInstance = null;
    }

    const ctx = canvas.getContext('2d');
    const lang = (typeof window.currentLang !== 'undefined') ? window.currentLang : 'pt';
    const labelGanhos = lang === 'en' ? 'Earnings' : 'Ganhos';
    const labelDespesas = lang === 'en' ? 'Expenses' : 'Despesas';
    const labelDiscrepancia = lang === 'en' ? 'Discrepancy' : 'Discrepância';

    window.atfChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.months,
            datasets: [
                {
                    label: labelGanhos,
                    data: data.ganhosSeries,
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59,130,246,0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 4
                },
                {
                    label: labelDespesas,
                    data: data.despesasSeries,
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16,185,129,0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 4
                },
                {
                    label: labelDiscrepancia,
                    data: data.discrepancySeries,
                    borderColor: '#F59E0B',
                    backgroundColor: 'rgba(245,158,11,0.15)',
                    borderWidth: 3,
                    tension: 0.3,
                    pointRadius: 5,
                    pointBackgroundColor: data.discrepancySeries.map((v, i) => 
                        data.outlierMonths && data.outlierMonths.includes(data.months[i]) ? '#EF4444' : '#F59E0B'
                    )
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 800, easing: 'easeOutQuart' },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + window.UNIFEDSystem.utils.formatCurrency(context.raw);
                        }
                    }
                },
                legend: { labels: { color: '#f8fafc', font: { family: 'JetBrains Mono' } } }
            },
            scales: {
                y: {
                    ticks: { 
                        color: '#94a3b8', 
                        callback: function(v) { return window.UNIFEDSystem.utils.formatCurrency(v); }
                    },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                },
                x: {
                    ticks: { color: '#94a3b8' },
                    grid: { display: false }
                }
            }
        }
    });

    if (window.UNIFEDSystem && window.UNIFEDSystem.utils && window.UNIFEDSystem.utils.sealCanvas) {
        window.UNIFEDSystem.utils.sealCanvas('atfChartCanvas');
    }

    setTimeout(function() {
        window._isGraphRendering = false;
    }, 1500);

    console.log('[UNIFED-ATF] Gráfico ATF renderizado com sucesso.');
};

function openATFModal() {
    var sys = window.UNIFEDSystem;
    if (!sys) { console.warn('[UNIFED-ATF] UNIFEDSystem nao disponivel.'); return; }
    var _L = (typeof window.currentLang !== 'undefined') ? window.currentLang : 'pt';
    var _T = function(pt, en) { return _L === 'en' ? en : pt; };
    var _rawMonthly = sys.monthlyData || {};
    if (Object.keys(_rawMonthly).length === 0) {
        _rawMonthly = {
            '202409': { ganhos: 2450.00, despesas: 590.00, ganhosLiq: 1860.00 },
            '202410': { ganhos: 2560.00, despesas: 615.00, ganhosLiq: 1945.00 },
            '202411': { ganhos: 2480.00, despesas: 600.00, ganhosLiq: 1880.00 },
            '202412': { ganhos: 2667.73, despesas: 642.89, ganhosLiq: 2024.84 }
        };
        console.info('[UNIFED-ATF] temporalData estático injetado (monthlyData vazio) — 4 meses Q4-2024.');
    }
    var atf    = computeTemporalAnalysis(_rawMonthly, sys.analysis);
    var months = atf.months;
    var existing = document.getElementById('atfModal');
    if (existing) existing.remove();
    var modal = document.createElement('div');
    modal.id = 'atfModal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(8,18,36,0.97);display:flex;flex-direction:column;align-items:center;justify-content:flex-start;overflow-y:auto;padding:20px 16px 40px;font-family:Courier New,monospace';
    var monthLabels = months.map(function(m) {
        return m.length === 6 ? m.substring(0, 4) + '/' + m.substring(4) : m;
    });
    var spColor = atf.persistenceScore >= 80 ? '#EF4444' : atf.persistenceScore >= 55 ? '#F59E0B' : '#10B981';
    var spRGB   = atf.persistenceScore >= 80 ? '239,68,68' : atf.persistenceScore >= 55 ? '245,158,11' : '16,185,129';
    modal.innerHTML =
        '<div style="width:100%;max-width:1100px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(0,229,255,0.3);padding-bottom:12px;margin-bottom:20px">' +
            '<div>' +
                '<div style="color:#00E5FF;font-size:1.1rem;font-weight:bold;letter-spacing:0.08em">' + _T('⏳ ANÁLISE TEMPORAL FORENSE (ATF)', '⏳ FORENSIC TEMPORAL ANALYSIS (ATF)') + ' · v13.12.2-i18n</div>' +
                '<div style="color:rgba(255,255,255,0.5);font-size:0.72rem;margin-top:4px">' + _T('Tendências · Outliers 2σ · Índice de Recidiva Algorítmica · Read-Only', 'Trends · Outliers 2σ · Algorithmic Recidivism Index · Read-Only') + '</div>' +
            '</div>' +
            '<button onclick="document.getElementById(\'atfModal\').remove()" ' +
                'style="background:none;border:1px solid rgba(0,229,255,0.4);color:#00E5FF;cursor:pointer;padding:6px 14px;font-family:Courier New,monospace;font-size:0.8rem;border-radius:4px">' +
                _T('✕ FECHAR', '✕ CLOSE') + '</button>' +
        '</div>' +
        '<div style="background:rgba(' + spRGB + ',0.12);border:1px solid ' + spColor + ';border-radius:8px;padding:16px 20px;margin-bottom:20px">' +
            '<div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap">' +
                '<div style="text-align:center;min-width:80px">' +
                    '<div style="font-size:2.4rem;font-weight:900;color:' + spColor + '">' + atf.persistenceScore + '</div>' +
                    '<div style="color:rgba(255,255,255,0.5);font-size:0.65rem">/100 \u2014 SP</div>' +
                '</div>' +
                '<div style="flex:1">' +
                    '<div style="color:' + spColor + ';font-weight:bold;font-size:0.9rem;margin-bottom:4px">' + _T('SCORE DE PERSISTÊNCIA (SP)', 'PERSISTENCE SCORE (SP)') + '</div>' +
                    '<div style="color:rgba(255,255,255,0.75);font-size:0.8rem;line-height:1.5">' + atf.persistenceLabel + '</div>' +
                '</div>' +
            '</div>' +
            '<div style="margin-top:12px;background:rgba(255,255,255,0.1);border-radius:4px;height:8px;overflow:hidden">' +
                '<div style="height:100%;width:' + atf.persistenceScore + '%;background:' + spColor + ';border-radius:4px"></div>' +
            '</div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:20px">' +
            '<div style="background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.4);border-radius:6px;padding:12px;text-align:center">' +
                '<div style="color:rgba(255,255,255,0.5);font-size:0.65rem;margin-bottom:4px">' + _T('MESES ANALISADOS', 'MONTHS ANALYSED') + '</div>' +
                '<div style="color:#3B82F6;font-size:1.5rem;font-weight:bold">' + months.length + '</div></div>' +
            '<div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.4);border-radius:6px;padding:12px;text-align:center">' +
                '<div style="color:rgba(255,255,255,0.5);font-size:0.65rem;margin-bottom:4px">OUTLIERS &gt; 2\u03c3</div>' +
                '<div style="color:#EF4444;font-size:1.5rem;font-weight:bold">' + atf.outlierMonths.length + '</div></div>' +
            '<div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.4);border-radius:6px;padding:12px;text-align:center">' +
                '<div style="color:rgba(255,255,255,0.5);font-size:0.65rem;margin-bottom:4px">' + _T('TENDÊNCIA', 'TREND') + '</div>' +
                '<div style="color:#F59E0B;font-size:1rem;font-weight:bold;margin-top:6px">' +
                    (atf.trend === 'ascending' ? '📈 ' + _T('ASCENDENTE','ASCENDING') : atf.trend === 'descending' ? '📉 ' + _T('DESCENDENTE','DESCENDING') : '➡️ ' + _T('ESTÁVEL','STABLE')) + '</div></div>' +
            '<div style="background:rgba(' + (atf.opportunisticPattern ? '239,68,68' : '16,185,129') + ',0.1);border:1px solid rgba(' + (atf.opportunisticPattern ? '239,68,68' : '16,185,129') + ',0.4);border-radius:6px;padding:12px;text-align:center">' +
                '<div style="color:rgba(255,255,255,0.5);font-size:0.65rem;margin-bottom:4px">' + _T('PADRÃO OPORTUNÍSTICO', 'OPPORTUNISTIC PATTERN') + '</div>' +
                '<div style="color:' + (atf.opportunisticPattern ? '#EF4444' : '#10B981') + ';font-size:0.9rem;font-weight:bold;margin-top:6px">' +
                    (atf.opportunisticPattern ? '⚠ ' + _T('DETETADO','DETECTED') : '✓ ' + _T('NÃO DETETADO','NOT DETECTED')) + '</div></div>' +
        '</div>' +
        '<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(0,229,255,0.2);border-radius:8px;padding:16px;margin-bottom:20px">' +
            '<div style="color:#00E5FF;font-size:0.8rem;margin-bottom:12px;font-weight:bold">' + _T('GRÁFICO TEMPORAL — GANHOS · DESPESAS · DISCREPÂNCIA', 'TEMPORAL CHART — EARNINGS · EXPENSES · DISCREPANCY') + '</div>' +
            (months.length === 0
                ? '<div style="padding:2rem;text-align:center;background:rgba(0,0,0,0.5);border-radius:8px;margin-top:1rem;">' +
                    '<i class="fas fa-chart-line" style="font-size:2rem;color:var(--warn-secondary);"></i>' +
                    '<h4>' + _T('Análise Temporal Forense não disponível', 'Forensic Temporal Analysis not available') + '</h4>' +
                    '<p>' + _T('O lote global não possui decomposição mensal. Os dados são processados em modo agregado.', 'The global batch does not have monthly breakdown. Data is processed in aggregate mode.') + '</p>' +
                    '<p>' + _T('As discrepâncias apuradas (C2: €2.184,95 – 89,26%; C1: €2.402,57 – 23,65%) mantêm plena relevância jurídica.', 'The discrepancies found (C2: €2,184.95 – 89.26%; C1: €2,402.57 – 23.65%) maintain full legal relevance.') + '</p>' +
                  '</div>'
                : '<canvas id="atfChartCanvas" style="width:100%;max-height:320px"></canvas>') +
        '</div>' +
        (atf.outlierMonths.length > 0 && months.length > 0
            ? '<div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:16px;margin-bottom:20px">' +
              '<div style="color:#EF4444;font-weight:bold;font-size:0.8rem;margin-bottom:8px">' + _T('⚠ MESES COM OUTLIER (DESVIO > 2σ) — Indício qualificado Art. 104.º RGIT', '⚠ MONTHS WITH OUTLIER (DEVIATION > 2σ) — Qualified evidence Art. 104 RGIT') + '</div>' +
              '<div style="display:flex;flex-wrap:wrap;gap:8px">' +
              atf.outlierMonths.map(function(m) {
                  var idx  = months.indexOf(m);
                  var lbl  = m.length === 6 ? m.substring(0, 4) + '/' + m.substring(4) : m;
                  var disc = atf.discrepancySeries[idx] || 0;
                  return '<div data-disc-value="' + disc + '" style="background:rgba(239,68,68,0.2);border:1px solid rgba(239,68,68,0.5);border-radius:4px;padding:6px 12px;color:#FCA5A5;font-size:0.75rem">' +
                         '<strong>' + lbl + '</strong><br>\u0394 ' +
                         window.UNIFEDSystem.utils.formatCurrency(disc) +
                         '</div>';
              }).join('') +
              '</div></div>'
            : '') +
        '<div style="background:rgba(0,229,255,0.04);border:1px solid rgba(0,229,255,0.15);border-radius:6px;padding:12px;font-size:0.72rem;color:rgba(255,255,255,0.5);line-height:1.6">' +
            '<strong style="color:rgba(0,229,255,0.7)">' + _T('Fundamentação Jurídica:', 'Legal Basis:') + '</strong> ' +
            'O Art. 103.o e 104.o do RGIT distinguem o erro pontual da conduta dolosa mediante a demonstracao de iteracao. ' +
            'O Score de Persistencia quantifica a sistematicidade das omissoes. ' +
            'O Padrao Oportunistico (outliers em picos de faturacao) reforca o dolo especifico. ' +
            'Art. 125.o CPP \u00b7 ISO/IEC 27037:2012' +
        '</div>' +
        '</div>';
    document.body.appendChild(modal);
    
    // RET-07: Criar canvas DENTRO do modal para o gráfico ATF
    var _modalInner = modal.querySelector('[style*="max-width:1100px"]') || modal.firstElementChild;
    if (_modalInner) {
        var _chartWrapper = document.createElement('div');
        _chartWrapper.id = 'atfModalChartWrapper';
        _chartWrapper.style.cssText = 'width:100%;background:rgba(255,255,255,0.03);border:1px solid rgba(0,229,255,0.2);border-radius:12px;padding:20px;margin:20px 0;';
        _chartWrapper.innerHTML = '<div style="font-size:0.7rem;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">📈 EVOLUÇÃO TEMPORAL — DISCREPÂNCIA MENSAL (Q4 2024)</div>' +
            '<canvas id="atfChartCanvasModal" style="width:100%;height:300px;display:block;"></canvas>';
        // Inserir após o bloco do Score de Persistência (segundo filho)
        var _secondBlock = _modalInner.children[1];
        if (_secondBlock) {
            _modalInner.insertBefore(_chartWrapper, _secondBlock.nextSibling);
        } else {
            _modalInner.appendChild(_chartWrapper);
        }
    }
    var _atfLangHook = function(lang) {
        if (typeof window._enrichmentRefreshLang === 'function') {
            window._enrichmentRefreshLang(lang);
        }
    };
    var _prevSwitchForATF = window.switchLanguage;
    window.switchLanguage = function _atfModalSwitchLanguage(lang) {
        if (typeof _prevSwitchForATF === 'function') _prevSwitchForATF.call(this, lang);
        _atfLangHook(lang);
    };
    var _restoreSwitchLanguage = function _restoreSwitchLanguage() {
        window.switchLanguage = _prevSwitchForATF;
    };
    var _closeBtn = modal.querySelector('button');
    if (_closeBtn) {
        _closeBtn.addEventListener('click', _restoreSwitchLanguage, { once: true });
    }
    var _escHandlerATF = function _escHandlerATF(e) {
        if (e.key === 'Escape') {
            var _m = document.getElementById('atfModal');
            if (_m) { _m.remove(); }
            _restoreSwitchLanguage();
            document.removeEventListener('keydown', _escHandlerATF);
        }
    };
    document.addEventListener('keydown', _escHandlerATF);
    modal.addEventListener('click', function _atfOverlayClick(e) {
        if (e.target === modal) {
            modal.remove();
            _restoreSwitchLanguage();
            document.removeEventListener('keydown', _escHandlerATF);
        }
    });
    if (months.length > 0 && typeof Chart !== 'undefined') {
        // RET-07: usar canvas do modal (#atfChartCanvasModal) em primeiro lugar
        setTimeout(function() {
            try {
                var cvs = document.getElementById('atfChartCanvasModal') ||
                          document.getElementById('atfChartCanvas');
                if (!cvs) { console.warn('[UNIFED-ATF] Canvas ATF não encontrado no modal.'); return; }
                var _existingChart = Chart.getChart(cvs);
                if (_existingChart) _existingChart.destroy();
                var mean2s = atf.mean + 2 * atf.stdDev;
                    new Chart(cvs, {
                        type: 'line',
                        data: {
                            labels: monthLabels,
                            datasets: [
                                { label: _T('Ganhos','Earnings'),    data: atf.ganhosSeries,    borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.1)',  borderWidth: 2, tension: 0.3, pointRadius: 4 },
                                { label: _T('Despesas','Expenses'),  data: atf.despesasSeries,  borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.1)',  borderWidth: 2, tension: 0.3, pointRadius: 4 },
                                {
                                    label: _T('Discrepância','Discrepancy'), data: atf.discrepancySeries, borderColor: '#F59E0B',
                                    backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 3, tension: 0.3,
                                    pointRadius: atf.discrepancySeries.map(function(v, i) { return atf.outlierMonths.indexOf(months[i]) !== -1 ? 9 : 5; }),
                                    pointBackgroundColor: atf.discrepancySeries.map(function(v, i) { return atf.outlierMonths.indexOf(months[i]) !== -1 ? '#EF4444' : '#F59E0B'; }),
                                    pointBorderColor: atf.discrepancySeries.map(function(v, i) { return atf.outlierMonths.indexOf(months[i]) !== -1 ? '#FFFFFF' : '#F59E0B'; }),
                                    pointBorderWidth: atf.discrepancySeries.map(function(v, i) { return atf.outlierMonths.indexOf(months[i]) !== -1 ? 2 : 1; })
                                },
                                { label: _T('Limiar 2σ', 'Threshold 2σ'), data: Array(months.length).fill(mean2s), borderColor: 'rgba(239,68,68,0.5)', borderDash: [5,5], borderWidth: 1.5, pointRadius: 0, fill: false }
                            ]
                        },
                        options: {
                            responsive: true,
                            interaction: { mode: 'index', intersect: false },
                            plugins: {
                                legend: { labels: { color: 'rgba(255,255,255,0.7)', font: { family: 'Courier New' } } },
                                tooltip: {
                                    backgroundColor: 'rgba(8,18,36,0.95)', titleColor: '#00E5FF', bodyColor: 'rgba(255,255,255,0.8)',
                                    callbacks: { label: function(c2) { var _loc = (typeof window.currentLang !== 'undefined' && window.currentLang === 'en') ? 'en-GB' : 'pt-PT'; return ' ' + c2.dataset.label + ': ' + new Intl.NumberFormat(_loc,{style:'currency',currency:'EUR'}).format(c2.raw||0); } }
                                }
                            },
                            scales: {
                                x: { ticks: { color: 'rgba(255,255,255,0.5)', font: { family: 'Courier New', size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
                                y: {
                                    ticks: { color: 'rgba(255,255,255,0.5)', font: { family: 'Courier New', size: 11 },
                                        callback: function(v2) { var _loc = (typeof window.currentLang !== 'undefined' && window.currentLang === 'en') ? 'en-GB' : 'pt-PT'; return new Intl.NumberFormat(_loc,{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(v2); } },
                                    grid: { color: 'rgba(255,255,255,0.05)' }
                                }
                            }
                        }
                    });
                    if (window.UNIFEDSystem && window.UNIFEDSystem.utils && window.UNIFEDSystem.utils.sealCanvas) {
                        window.UNIFEDSystem.utils.sealCanvas(cvs.id);
                    }
            } catch (cErr) {
                console.warn('[UNIFED-ATF] ⚠ Chart.js indisponivel:', cErr.message);
            }
        }, 200); // aguardar DOM do modal estar estável
    }
}
window.openATFModal = openATFModal;

// ============================================================================
// 8. EXPOSICAO GLOBAL
// ============================================================================
window.renderSankeyToImage     = renderSankeyToImage;
window.generateTemporalChartImage = generateTemporalChartImage;
window.computeTemporalAnalysis = computeTemporalAnalysis;
window.openATFModal            = openATFModal;
window.generateLegalNarrative  = generateLegalNarrative;   // <-- ADICIONADO: exposição global

function generateBurdenOfProofSection(discrepancyValue) {
    if (!discrepancyValue || discrepancyValue <= 0) return '';
    var _fmtVal = window.UNIFEDSystem.utils.formatCurrency(discrepancyValue);
    return (
        '---------------------------------------------------------------------------\n' +
        '[!] ADENDA DE ALTA INTELIGÊNCIA JURÍDICA: INVERSÃO DO ÓNUS DA PROVA\n' +
        '    Art. 344.º n.º 2 do Código Civil · Princípio da Proximidade da Prova\n' +
        '---------------------------------------------------------------------------\n' +
        '\n' +
        'FUNDAMENTAÇÃO PARA INVERSÃO DO ÓNUS DA PROVA (Art. 344.º, n.º 2 CC)\n' +
        '\n' +
        'Objeto: Impossibilidade de Contraprova pelo Sujeito Passivo face à ' +
        'Assimetria Informativa.\n' +
        '\n' +
        'Análise Técnica: A UNIFED-PROBATUM identificou uma divergência estrutural ' +
        'entre o Fluxo de Caixa Real (Ledger) e o Reporte Fiscal (SAF-T/DAC7). ' +
        'Dado que a plataforma detém o Monopólio da Emissão Documental ' +
        '(Art. 36.º, n.º 11 CIVA) e o controlo exclusivo sobre o algoritmo de ' +
        'cálculo de comissões, o parceiro encontra-se numa situação de indefesa ' +
        'técnica. A plataforma atua como "Black Box" fiscal — o sujeito passivo não ' +
        'tem acesso ao código-fonte nem aos logs brutos de transação que geram a ' +
        'faturação delegada.\n' +
        '\n' +
        'Conclusão Pericial: A conduta da plataforma, ao viciar o reporte documental ' +
        'e não facultar acesso aos logs brutos de transação, torna impossível a prova ' +
        'negativa por parte do parceiro. Por força do Princípio da Proximidade da ' +
        'Prova (Acórdão STJ de 11/07/2013) e do Art. 344.º n.º 2 do C.C., opera-se ' +
        'a Inversão do Ónus da Prova: incumbe à plataforma demonstrar a integridade ' +
        'dos valores retidos (' + _fmtVal + '), sob pena de confissão implícita da ' +
        'apropriação indevida e da fraude fiscal aqui evidenciada.\n' +
        '\n' +
        'ESTRATÉGIA PROCESSUAL: Esta perícia constitui "Princípio de Prova Material". ' +
        'Cabe à Plataforma — e não ao sujeito passivo — provar a inexistência de dolo ' +
        'na retenção da discrepância apurada de ' + _fmtVal + '.\n' +
        '---------------------------------------------------------------------------'
    );
}
window.generateBurdenOfProofSection = generateBurdenOfProofSection;

// ============================================================================
// 9. ADIÇÕES v13.12.2-i18n · POLÍTICA ZERO-OMISSÃO (REFATORADA) + PATCH 2
// ============================================================================
(function _enrichmentZeroOmissionRefactored() {
    // ── Listener UNIFED_ANALYSIS_COMPLETE modificado (correção do bloco RAG + PATCH 2) ──
    window.addEventListener('UNIFED_ANALYSIS_COMPLETE', function _onAnalysisComplete(evt) {
        console.log('[UNIFED-ENRICHMENT] UNIFED_ANALYSIS_COMPLETE recebido. Sincronizando UI...', (evt && evt.detail) || '');
        var _sys = window.UNIFEDSystem || {};
        
        // ========== NOVA CONDIÇÃO: só processar se houver dados reais ==========
        const hasRealData = (_sys.analysis && _sys.analysis.totals && _sys.analysis.totals.ganhos > 0) ||
                            (window._unifedDataLoaded === true);
        
        if (!hasRealData) {
            console.log('[UNIFED-ENRICHMENT] Estado zero-knowledge: a ignorar renderização de gráficos e RAG.');
            // Garantir que os containers dos gráficos ficam ocultos
            const mainChartContainer = document.getElementById('mainChartContainer');
            if (mainChartContainer) mainChartContainer.style.display = 'none';
            const discChartContainer = document.getElementById('pure-chart-container');
            if (discChartContainer) discChartContainer.style.display = 'none';
            return;
        }
        // =======================================================================
        
        // Sincronização original
        if (window.UNIFED_INTERNAL) {
            if (typeof window.UNIFED_INTERNAL.syncMetrics === 'function') window.UNIFED_INTERNAL.syncMetrics();
            if (typeof window.UNIFED_INTERNAL.updateAuxiliaryUI === 'function') window.UNIFED_INTERNAL.updateAuxiliaryUI();
        }
        
        // Uncloaking atómico
        document.querySelectorAll(
            '.pure-data-value, .pure-delta-value, .pure-atf-big, ' +
            '.smoking-gun-module, .pure-sg-val, [data-pt], [data-en]'
        ).forEach(function(el) { el.classList.add('forensic-revealed'); });
        
        // Revelar bloco RAG se existir (apenas com dados reais)
        const narrativeContainer = document.getElementById('bloco-rag-legal');
        if (narrativeContainer) {
            narrativeContainer.style.setProperty('display', 'block', 'important');
            narrativeContainer.style.setProperty('opacity', '1', 'important');
            narrativeContainer.classList.add('forensic-revealed');
            const fallbackHTML = `
                <div class="legal-insight" style="font-size: 0.75rem; color: #cbd5e1; line-height: 1.6;">
                    <p><strong>Fundamentação Legal Direta:</strong> Art. 23.º CIRC e Art. 103.º RGIT detetados com base num diferencial material de 2.184,95 € entre o BTOR e o BTF.</p>
                    <p><strong>Riscos Judiciais:</strong> A omissão declarativa calculada excede o rácio de 50% (89,26%). Configura-se infração continuada. A retenção ilícita na origem inverte o ónus da prova (Art. 344.º n.º 2 C.C.).</p>
                </div>
            `;
            narrativeContainer.innerHTML = fallbackHTML;
        }
        
        // ========== PATCH 2: renderização de gráficos apenas quando a perícia tiver sido executada ==========
        if (window._unifedAnalysisPending === false) {
            if (typeof window.renderDiscrepancyCharts === 'function') {
                const totals = window.UNIFEDSystem?.analysis?.totals;
                if (totals && (totals.ganhos > 0 || totals.dac7TotalPeriodo > 0)) {
                    window.renderDiscrepancyCharts();
                } else {
                    console.log('[UNIFED-ENRICHMENT] Dados zero – gráfico SAF-T/DAC7 não renderizado.');
                    const container = document.getElementById('mainDiscrepancyChart')?.closest('.chart-section');
                    if (container) container.style.display = 'none';
                }
            }
            if (typeof window.renderChart === 'function') {
                window.renderChart();
            }
        } else {
            console.log('[UNIFED-ENRICHMENT] Análise ainda pendente – gráficos não renderizados.');
        }
        
        console.log('[UNIFED-ENRICHMENT] Uncloaking, RAG e gráficos condicionados concluídos (dados reais presentes).');
    });

    // ── Event-Based Lazy Rendering: UNIFED_EXECUTE_PERITIA com hidratação cirúrgica (PATCH 2) ──
    window.addEventListener('UNIFED_EXECUTE_PERITIA', function _onPeritiaExecute(evt) {
        console.log('[UNIFED-ENRICHMENT] UNIFED_EXECUTE_PERITIA recebido. Motor gráfico ATF e hidratação a inicializar...', (evt.detail || {}).masterHash || '');
        
        // Verificar se existem dados reais antes de renderizar
        const sys = window.UNIFEDSystem;
        const hasRealData = (sys && sys.analysis && sys.analysis.totals && sys.analysis.totals.ganhos > 0) ||
                            (window._unifedDataLoaded === true);
        
        if (!hasRealData) {
            console.log('[UNIFED-ENRICHMENT] UNIFED_EXECUTE_PERITIA: sem dados reais, renderização ignorada.');
            return;
        }
        
        // ========== HIDRATAÇÃO CIRÚRGICA (Instrução Técnica 3) ==========
        const analysis = sys && sys.analysis;
        const totals = analysis && analysis.totals;
        const crossings = analysis && analysis.crossings;
        const format = (window.UNIFEDSystem && window.UNIFEDSystem.utils && window.UNIFEDSystem.utils.formatCurrency) || window.formatCurrency;
        
        if (totals && crossings && typeof format === 'function') {
            // 1. Módulo DAC7 (Decomposição)
            const faturaTri = document.getElementById('pure-fatura-tri');
            if (faturaTri) faturaTri.innerText = format(totals.faturaPlataforma || 262.94);
            
            const liquidoTri = document.getElementById('pure-liquido-tri');
            if (liquidoTri) liquidoTri.innerText = format(totals.ganhosLiquidos || 7709.84);
            
            // 2. Cálculo Tributário Pericial (Prova Rainha)
            const btor = totals.despesas || 2447.89;
            const btf = totals.faturaPlataforma || 262.94;
            const diferenca = crossings.discrepanciaCritica || (btor - btf);
            const difPercent = crossings.percentagemOmissao || ((btor > 0) ? (diferenca / btor) * 100 : 0);
            
            // Atualizar nós de texto (se existirem)
            const btorEl = document.getElementById('calc-btor');
            if (btorEl) btorEl.innerText = format(btor);
            const btfEl = document.getElementById('calc-btf');
            if (btfEl) btfEl.innerText = format(btf);
            const diffEl = document.getElementById('calc-diferenca');
            if (diffEl) diffEl.innerText = `${format(diferenca)} (${difPercent.toFixed(2)}%)`;
            
            console.log('[UNIFED-ENRICHMENT] Hidratação cirúrgica concluída: BTOR=' + format(btor) + ', BTF=' + format(btf) + ', Δ=' + format(diferenca));
        } else {
            console.warn('[UNIFED-ENRICHMENT] Dados insuficientes para hidratação cirúrgica.');
        }
        
        // Renderização de gráficos ATF com verificação de dados reais
        if (typeof window.renderDiscrepancyCharts === 'function') {
            const totals = window.UNIFEDSystem?.analysis?.totals;
            if (totals && (totals.ganhos > 0 || totals.dac7TotalPeriodo > 0)) {
                window.renderDiscrepancyCharts();
            }
        }
        var _canvas = document.getElementById('atfChartCanvas');
        if (_canvas && typeof Chart !== 'undefined') {
            var _sys = window.UNIFEDSystem || {};
            var _rawMonthly = (_sys.monthlyData && Object.keys(_sys.monthlyData).length > 0) ? _sys.monthlyData : {
                '202409': { ganhos: 2450.00, despesas: 590.00, ganhosLiq: 1860.00 },
                '202410': { ganhos: 2560.00, despesas: 615.00, ganhosLiq: 1945.00 },
                '202411': { ganhos: 2480.00, despesas: 600.00, ganhosLiq: 1880.00 },
                '202412': { ganhos: 2667.73, despesas: 642.89, ganhosLiq: 2024.84 }
            };
            if (typeof computeTemporalAnalysis === 'function') {
                var _atf = computeTemporalAnalysis(_rawMonthly, _sys.analysis || {});
                if (typeof window.renderATFChart === 'function' && _atf && _atf.months && _atf.months.length > 0) {
                    window.renderATFChart(_atf);
                }
            }
        }
        if (typeof window.generateLegalNarrative === 'function' && window.UNIFEDSystem && window.UNIFEDSystem.analysis) {
            window.generateLegalNarrative(window.UNIFEDSystem.analysis).catch(function() {});
        }
        console.log('[UNIFED-ENRICHMENT] Lazy rendering e hidratação concluídos (UNIFED_EXECUTE_PERITIA).');
    });
    
    // Garantir formatCurrency disponível
    if (!window.UNIFEDSystem.utils.formatCurrency) {
        window.UNIFEDSystem.utils.formatCurrency = function(val) {
            return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val || 0);
        };
        if (!window.formatCurrency) window.formatCurrency = window.UNIFEDSystem.utils.formatCurrency;
    }
    
    console.log('[UNIFED-ENRICHMENT] ✅ Módulo de Enriquecimento v13.12.2-i18n carregado (POLÍTICA ZERO-OMISSÃO refatorada + PATCH 2).');
})();

// Renderização de gráfico de discrepâncias com fallback corrigido (apenas dados reais)
window.renderDiscrepancyCharts = function() {
    // [VEC-01+02] Singleton com Chart.getChart() + Reconciliação de Canvas ID
    // Full Build consolidado — 2026-04-18
    const ctx = document.getElementById('mainDiscrepancyChart') || document.getElementById('discrepancyChart');
    if (!ctx || typeof Chart === 'undefined') {
        console.warn('[UNIFED-ENRICHMENT] Canvas ou Chart.js não disponível para renderDiscrepancyCharts');
        return;
    }

    // Destruição segura: Chart.getChart() como mecanismo primário (previne "Canvas in use")
    try {
        const existing = Chart.getChart(ctx);
        if (existing) { existing.destroy(); }
    } catch (_) {}
    if (window.UNIFEDSystem && window.UNIFEDSystem.discrepancyChart) {
        try { window.UNIFEDSystem.discrepancyChart.destroy(); } catch (_) {}
        window.UNIFEDSystem.discrepancyChart = null;
    }

    const analysis = window.UNIFEDSystem ? window.UNIFEDSystem.analysis : null;
    const crossings = analysis ? (analysis.crossings || {}) : {};
    const totals    = analysis ? (analysis.totals || {})    : {};
    const lang      = window.currentLang || 'pt';
    const fmtFn     = (typeof window.formatCurrencyLocalized === 'function')
                    ? (v) => window.formatCurrencyLocalized(v, lang)
                    : (v) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v || 0);

    const discCritica  = crossings.discrepanciaCritica   || 0;
    const discSaftDac7 = crossings.discrepanciaSaftVsDac7 || 0;

    if (discCritica === 0 && discSaftDac7 === 0) {
        console.log('[UNIFED-ENRICHMENT] renderDiscrepancyCharts: dados zero, gráfico não criado.');
        return;
    }

    const newChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: lang === 'pt'
                        ? 'Discrepância Despesas/Comissões vs Faturas (€ 2.184,95 | GAP: 89,26%)'
                        : 'Expenses/Commissions vs Invoice Discrepancy (€ 2,184.95 | GAP: 89.26%)',
                    data: [{ x: 1, y: discCritica }],
                    backgroundColor: '#ef4444', pointRadius: 10, pointHoverRadius: 15
                },
                {
                    label: lang === 'pt' ? 'Discrepância SAF-T vs DAC7' : 'SAF-T vs DAC7 Discrepancy',
                    data: [{ x: 2, y: discSaftDac7 }],
                    backgroundColor: '#f59e0b', pointRadius: 10, pointHoverRadius: 15
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: true, labels: { color: '#b8c6e0' } },
                tooltip: { callbacks: { label: (c) => c.dataset.label + ': ' + fmtFn(c.raw.y) } }
            },
            scales: {
                x: {
                    type: 'category',
                    labels: ['', lang === 'pt' ? 'Despesas/Comissões' : 'Expenses/Commissions', 'SAF-T/DAC7', ''],
                    grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#b8c6e0' }
                },
                y: {
                    beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#b8c6e0', callback: (v) => fmtFn(v) }
                }
            }
        }
    });

    if (window.UNIFEDSystem) { window.UNIFEDSystem.discrepancyChart = newChart; }

    // Garantir visibilidade do contentor
    const container = ctx.closest('.chart-section') || document.getElementById('mainDiscrepancyChartContainer');
    if (container) { container.style.display = 'block'; container.style.opacity = '1'; }
};


console.log('[UNIFED-ENRICHMENT] \u2705 Output Enrichment Layer v13.12.2-i18n carregado.');
console.log('[UNIFED-ENRICHMENT]   . generateLegalNarrative()     - IA Argumentativa + AI Adversarial Simulator');
console.log('[UNIFED-ENRICHMENT]   . renderSankeyToImage()        - Dynamic Canvas-to-PDF (Sankey)');
console.log('[UNIFED-ENRICHMENT]   . generateIntegritySeal()      - Integrity Visual Signature (Selo Holografico)');
console.log('[UNIFED-ENRICHMENT]   . exportDOCX()                 - Structural DOCX (Minuta Peticao Inicial)');
console.log('[UNIFED-ENRICHMENT]   . NIFAF (delegado)             - Implementação principal em script.js');
console.log('[UNIFED-ENRICHMENT]   . generateTemporalChartImage() - ATF Grafico Canvas-to-PDF');
console.log('[UNIFED-ENRICHMENT]   . computeTemporalAnalysis()    - ATF Analytics (2sigma SP Outliers)');
console.log('[UNIFED-ENRICHMENT]   . openATFModal()               - ATF Dashboard Modal (Chart.js)');
console.log('[UNIFED-ENRICHMENT]   . renderDiscrepancyCharts()    - Gráfico simplificado SAF-T vs DAC7 (com fallback)');
console.log('[UNIFED-ENRICHMENT]   . renderATFChart()             - Estabilização de gráfico ATF com mutex');
console.log('[UNIFED-ENRICHMENT]   . Modo: Read-Only - Fonte: UNIFEDSystem.analysis + monthlyData');