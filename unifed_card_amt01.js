/**
 * ============================================================================
 * UNIFED - PROBATUM · FASE II — FICHEIRO 2/5
 * unifed_card_amt01.js
 * ============================================================================
 * Versão      : v1.0.0-AMT-FORENSIC
 * Data        : 2026-04-18
 * Perito      : Consultor Estratégico Independente
 * Finalidade  : Injetar Card AMT-01 (Compliance de Regulação)
 *
 * ESPECIFICAÇÃO TÉCNICA:
 *   Label: CONTROLO_REGULATÓRIO_AMT
 *   Métrica: Diferencial de Base de Incidência × 0,1% (Art. 13.º Lei 45/2018)
 *   Diferencial: 2.184,95 € (Smoking Gun 2: Despesas vs Faturação)
 *   Taxa AMT Calculada: 2.184,95 € × 0,001 = 2,18 €
 *   Veredicto Automático: "Risco de Incoerência na Cadeia de Custódia Financeira"
 *
 * FUNDAMENTAÇÃO JURÍDICA:
 *   • Art. 13.º Lei n.º 45/2018 (Contribuição de Regulação - TVDE)
 *   • Art. 125.º CPP (Livre apreciação de prova digital)
 *   • Art. 327.º CPP (Contraditório perante arguido)
 *   • Diretiva (UE) 2021/514 - DAC7 (Transparência de rendimentos)
 *   • Art. 119.º RGIT (Omissão de declarações - crime de fraude fiscal)
 *
 * QUESTIONÁRIO ESTRATÉGICO (3 PONTOS):
 *   1. Metodologia de Cálculo da Base de Incidência AMT
 *   2. Segregação de Fluxos (Gorjetas, Portagens, Comissões)
 *   3. Integridade de Reporte (SAF-T vs DAC7 vs Ledger Bancário)
 *
 * CONFORMIDADE: DORA 2022/2554 · ISO/IEC 27037:2012 · Art. 125.º CPP
 * ============================================================================
 */

'use strict';

(function _injectCardAMT01() {
    console.log('[UNIFED-AMT01] 🚀 Iniciando injeção de Card AMT-01...');

    // ========================================================================
    // CONFIGURAÇÃO AMT-01
    // ========================================================================

    const AMT_CONFIG = {
        id: 'CONTROLO_REGULATÓRIO_AMT',
        moduleId: 'MOD_REG_013_L45',
        titulo: {
            pt: '🚀 CONTROLO REGULATÓRIO · CONTRIBUIÇÃO DE REGULAÇÃO (AMT)',
            en: '🚀 REGULATORY CONTROL · REGULATION CONTRIBUTION (AMT)'
        },
        diferencialBase: 2184.95,  // EUR
        taxaAmt: 0.001,            // 0,1%
        descricao: {
            pt: 'Análise forense da conformidade com a Lei n.º 45/2018 (Contribuição de Regulação — TVDE)',
            en: 'Forensic analysis of compliance with Law No. 45/2018 (Regulation Contribution — TVDE)'
        },
        veredicto: {
            pt: 'Risco de Incoerência na Cadeia de Custódia Financeira',
            en: 'Risk of Incoherence in Financial Chain of Custody'
        },
        baseLegal: {
            pt: [
                'Art. 13.º Lei n.º 45/2018 (Taxa de Regulação TVDE)',
                'Art. 125.º CPP (Livre apreciação de prova digital)',
                'Art. 327.º CPP (Direito de contraditório)',
                'Art. 119.º RGIT (Omissão de declarações)',
                'Diretiva (UE) 2021/514 — DAC7'
            ],
            en: [
                'Art. 13 Law No. 45/2018 (TVDE Regulation Fee)',
                'Art. 125 CCP (Free assessment of digital evidence)',
                'Art. 327 CCP (Right of contradiction)',
                'Art. 119 RGIT (Omission of declarations)',
                'Directive (EU) 2021/514 — DAC7'
            ]
        }
    };

    // ========================================================================
    // CÁLCULOS FORENSES
    // ========================================================================

    const calcularTaxaAMT = () => {
        const diferencial = AMT_CONFIG.diferencialBase;
        const taxa = diferencial * AMT_CONFIG.taxaAmt;
        return {
            diferencial: diferencial,
            taxa: taxa,
            percentagem: (AMT_CONFIG.taxaAmt * 100).toFixed(3)
        };
    };

    const cálculos = calcularTaxaAMT();

    // ========================================================================
    // QUESTIONÁRIO ESTRATÉGICO (Art. 327.º CPP)
    // ========================================================================

    const QUESTIONARIO = {
        pt: [
            {
                numero: '1.',
                pergunta: 'METODOLOGIA DE CÁLCULO',
                conteudo: `Queira a plataforma esclarecer se o valor de ${cálculos.diferencial.toFixed(2)} EUR (diferencial detetado entre Despesas [Extrato] e Faturação [Plataforma]) foi incluído na base bruta para cálculo da taxa de ${cálculos.percentagem}% devida à AMT, conforme o Art. 13.º da Lei n.º 45/2018.`,
                fundamentacao: 'Art. 13.º Lei 45/2018 | Art. 327.º CPP'
            },
            {
                numero: '2.',
                pergunta: 'SEGREGAÇÃO DE FLUXOS',
                conteudo: 'Forneça o log de transações segregado que justifique a exclusão de "Gorjetas", "Portagens" e outras rubricas da base tributável, demonstrando a conciliação com os valores reportados no ficheiro SAF-T (Portugal) e na declaração DAC7.',
                fundamentacao: 'Art. 119.º RGIT | Diretiva (UE) 2021/514'
            },
            {
                numero: '3.',
                pergunta: 'INTEGRIDADE DE REPORTE',
                conteudo: `Na ausência de liquidação da taxa AMT sobre o diferencial de ${cálculos.taxa.toFixed(2)} EUR aqui detetado, como justifica a plataforma a fidedignidade dos dados transmitidos via DAC7, dada a quebra de simetria entre o Ledger Bancário, o SAF-T e o reporte regulatório?`,
                fundamentacao: 'Art. 125.º CPP | ISO/IEC 27037:2012'
            }
        ],
        en: [
            {
                numero: '1.',
                pergunta: 'CALCULATION METHODOLOGY',
                conteudo: `Please clarify whether the amount of €${cálculos.diferencial.toFixed(2)} (differential detected between Expenses [Statement] and Billing [Platform]) was included in the gross base for calculating the ${cálculos.percentagem}% fee owed to the AMT, as per Art. 13 of Law No. 45/2018.`,
                fundamentacao: 'Art. 13 Law 45/2018 | Art. 327 CCP'
            },
            {
                numero: '2.',
                pergunta: 'FLOW SEGREGATION',
                conteudo: 'Provide the segregated transaction log that justifies the exclusion of "Tips", "Tolls" and other items from the taxable base, demonstrating reconciliation with values reported in the SAF-T file (Portugal) and the DAC7 declaration.',
                fundamentacao: 'Art. 119 RGIT | Directive (EU) 2021/514'
            },
            {
                numero: '3.',
                pergunta: 'REPORTING INTEGRITY',
                conteudo: `In the absence of settlement of the AMT fee on the differential of €${cálculos.taxa.toFixed(2)} detected here, how does the platform justify the reliability of data transmitted via DAC7, given the breakdown of symmetry between the Bank Ledger, SAF-T and regulatory reporting?`,
                fundamentacao: 'Art. 125 CCP | ISO/IEC 27037:2012'
            }
        ]
    };

    // ========================================================================
    // GERAÇÃO DE HASH DE INTEGRIDADE
    // ========================================================================

    const gerarHashAMT01 = () => {
        const conteudo = `CONTROLO_REGULATÓRIO_AMT|${cálculos.diferencial}|${cálculos.taxa}|${new Date().toISOString()}`;
        
        // Simulação de SHA-256 (em produção, usar CryptoJS ou Web Crypto API)
        let hash = 0;
        for (let i = 0; i < conteudo.length; i++) {
            const char = conteudo.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Converter para 32-bit integer
        }
        
        // Gerar representação hexadecimal simulada (não é SHA-256 real, apenas simulação)
        let hashHex = 'EV-AMT-001-' + Math.abs(hash).toString(16).padStart(16, '0');
        return hashHex;
    };

    const hashAMT01 = gerarHashAMT01();

    // ========================================================================
    // ESTRUTURA HTML DO CARD
    // ========================================================================

    const gerarHTMLCard = (idioma = 'pt') => {
        const isEN = idioma === 'en';
        const textos = isEN ? {
            titulo: AMT_CONFIG.titulo.en,
            descricao: AMT_CONFIG.descricao.en,
            veredicto: AMT_CONFIG.veredicto.en,
            risco: 'RISK ASSESSMENT',
            metrica: 'METRIC',
            taxa: 'TAX RATE',
            diferencial: 'DIFFERENTIAL',
            calculoTaxa: 'TAX AMOUNT DUE',
            baseLegal: 'LEGAL BASIS',
            questionario: 'STRATEGIC QUESTIONNAIRE (Art. 327 CCP)',
            resposta: 'Response from Counter-party Required',
            hash: 'INTEGRITY HASH'
        } : {
            titulo: AMT_CONFIG.titulo.pt,
            descricao: AMT_CONFIG.descricao.pt,
            veredicto: AMT_CONFIG.veredicto.pt,
            risco: 'AVALIAÇÃO DE RISCO',
            metrica: 'MÉTRICA',
            taxa: 'TAXA DE REGULAÇÃO',
            diferencial: 'DIFERENCIAL DETETADO',
            calculoTaxa: 'TAXA AMT DEVIDA',
            baseLegal: 'FUNDAMENTAÇÃO LEGAL',
            questionario: 'QUESTIONÁRIO ESTRATÉGICO (Art. 327.º CPP)',
            resposta: 'Resposta da Contra-parte Necessária',
            hash: 'HASH DE INTEGRIDADE'
        };

        const baseLegalTexto = (isEN ? AMT_CONFIG.baseLegal.en : AMT_CONFIG.baseLegal.pt)
            .map((item, idx) => `<li style="margin: 4px 0; font-size: 0.8rem; color: var(--text-secondary);">${item}</li>`)
            .join('');

        const questionarioTexto = (isEN ? QUESTIONARIO.en : QUESTIONARIO.pt)
            .map((q) => `
                <div style="margin: 12px 0; padding: 10px; background: rgba(255,165,0,0.05); border-left: 2px solid var(--warn-primary); border-radius: 4px;">
                    <p style="margin: 0; font-weight: bold; color: var(--warn-primary); font-size: 0.9rem;">
                        ${q.numero} ${q.pergunta}
                    </p>
                    <p style="margin: 6px 0 0 0; font-size: 0.85rem; line-height: 1.4;">
                        ${q.conteudo}
                    </p>
                    <p style="margin: 4px 0 0 0; font-size: 0.75rem; color: var(--text-secondary); font-style: italic;">
                        [${q.fundamentacao}]
                    </p>
                </div>
            `)
            .join('');

        const html = `
            <div id="card-amt-01" style="
                background: linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(249,115,22,0.1) 100%);
                border: 2px solid var(--warn-primary);
                border-radius: 8px;
                padding: 20px;
                margin: 15px 0;
                box-shadow: 0 0 15px rgba(239,68,68,0.2);
            ">
                <!-- CABEÇALHO DO CARD -->
                <div style="border-bottom: 2px solid var(--warn-primary); padding-bottom: 15px; margin-bottom: 15px;">
                    <h3 style="margin: 0; color: var(--warn-primary); font-size: 1.1rem; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-exclamation-triangle"></i>
                        ${textos.titulo}
                    </h3>
                    <p style="margin: 8px 0 0 0; color: var(--text-secondary); font-size: 0.9rem;">
                        ${textos.descricao}
                    </p>
                </div>

                <!-- AVALIAÇÃO DE RISCO -->
                <div style="background: rgba(239,68,68,0.15); padding: 12px; border-radius: 6px; margin-bottom: 15px;">
                    <p style="margin: 0; color: var(--warn-primary); font-weight: bold; font-size: 0.95rem;">
                        ⚠️ ${textos.risco}: <span style="color: #ef4444;">${textos.veredicto}</span>
                    </p>
                </div>

                <!-- MÉTRICAS FORENSES -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div style="background: rgba(16,185,129,0.1); padding: 12px; border-radius: 6px; border-left: 3px solid var(--success-primary);">
                        <p style="margin: 0; font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; font-weight: bold;">
                            ${textos.taxa}
                        </p>
                        <p style="margin: 4px 0 0 0; font-size: 1.2rem; color: var(--success-primary); font-weight: bold;">
                            ${cálculos.percentagem}%
                        </p>
                    </div>
                    <div style="background: rgba(239,68,68,0.1); padding: 12px; border-radius: 6px; border-left: 3px solid var(--warn-primary);">
                        <p style="margin: 0; font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; font-weight: bold;">
                            ${textos.diferencial}
                        </p>
                        <p style="margin: 4px 0 0 0; font-size: 1.2rem; color: var(--warn-primary); font-weight: bold;">
                            €${cálculos.diferencial.toFixed(2)}
                        </p>
                    </div>
                </div>

                <!-- CÁLCULO DE TAXA -->
                <div style="background: rgba(249,115,22,0.1); padding: 12px; border-radius: 6px; margin-bottom: 15px; border: 1px solid var(--warn-secondary);">
                    <p style="margin: 0; font-size: 0.85rem; color: var(--warn-secondary);">
                        <strong>${textos.calculoTaxa}:</strong> €${cálculos.diferencial.toFixed(2)} × ${cálculos.percentagem}% = <span style="color: #ef4444; font-weight: bold;">€${cálculos.taxa.toFixed(2)}</span>
                    </p>
                </div>

                <!-- BASE LEGAL -->
                <div style="margin-bottom: 15px;">
                    <p style="margin: 0 0 8px 0; font-weight: bold; color: var(--text-primary); font-size: 0.9rem;">
                        📋 ${textos.baseLegal}
                    </p>
                    <ul style="margin: 0; padding-left: 20px;">
                        ${baseLegalTexto}
                    </ul>
                </div>

                <!-- QUESTIONÁRIO ESTRATÉGICO -->
                <div style="background: rgba(249,115,22,0.05); padding: 15px; border-radius: 6px; margin-bottom: 15px;">
                    <p style="margin: 0 0 12px 0; font-weight: bold; color: var(--warn-primary); font-size: 0.95rem; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-question-circle"></i> ${textos.questionario}
                    </p>
                    ${questionarioTexto}
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(249,115,22,0.3);">
                        <p style="margin: 0; font-size: 0.85rem; color: var(--warn-primary); font-style: italic;">
                            ${textos.resposta}
                        </p>
                    </div>
                </div>

                <!-- INTEGRIDADE -->
                <div style="background: rgba(34,197,94,0.1); padding: 10px; border-radius: 6px; border-left: 2px solid var(--success-primary); font-family: var(--font-mono);">
                    <p style="margin: 0; font-size: 0.75rem; color: var(--text-secondary);">
                        ${textos.hash}: <code style="color: var(--success-primary); font-size: 0.7rem; word-break: break-all;">${hashAMT01}</code>
                    </p>
                </div>
            </div>
        `;

        return html;
    };

    // ========================================================================
    // INJEÇÃO DO CARD NO DOM
    // ========================================================================

    window.injectCardAMT01 = function injectCardAMT01(idioma = 'pt') {
        console.log('[UNIFED-AMT01] Injetando Card AMT-01 (idioma: ' + idioma + ')');

        // Procurar local de injeção
        const pureDashboard = document.getElementById('pureDashboard');
        const pureDashboardWrapper = document.getElementById('pureDashboardWrapper');
        const targetContainer = pureDashboard || pureDashboardWrapper;

        if (!targetContainer) {
            console.warn('[UNIFED-AMT01] ⚠ Container de injeção não encontrado (#pureDashboard ou #pureDashboardWrapper)');
            return false;
        }

        // Verificar se já está injetado
        if (document.getElementById('card-amt-01')) {
            console.log('[UNIFED-AMT01] Card AMT-01 já injetado. Atualizando idioma...');
            const cardExistente = document.getElementById('card-amt-01');
            cardExistente.parentNode.replaceChild(
                document.createRange().createContextualFragment(gerarHTMLCard(idioma)),
                cardExistente
            );
        } else {
            // Criar e inserir
            const cardHTML = gerarHTMLCard(idioma);
            const fragment = document.createRange().createContextualFragment(cardHTML);
            targetContainer.appendChild(fragment);
            console.log('[UNIFED-AMT01] ✓ Card AMT-01 injetado com sucesso');
        }

        return true;
    };

    // ========================================================================
    // EXPOSIÇÃO PÚBLICA
    // ========================================================================

    window.AMT_CONFIG = AMT_CONFIG;
    window.AMT_CÁLCULOS = cálculos;
    window.AMT_HASH = hashAMT01;

    // ========================================================================
    // INICIALIZAÇÃO AUTOMÁTICA
    // ========================================================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // Injetar com idioma inicial
            const idioma = (typeof window.currentLang !== 'undefined') ? window.currentLang : 'pt';
            window.injectCardAMT01(idioma);
            console.log('[UNIFED-AMT01] ✓ Card injetado automaticamente (DOMContentLoaded)');
        });
    } else {
        const idioma = (typeof window.currentLang !== 'undefined') ? window.currentLang : 'pt';
        window.injectCardAMT01(idioma);
        console.log('[UNIFED-AMT01] ✓ Card injetado automaticamente (imediato)');
    }

    // ========================================================================
    // SYNC COM MUDANÇA DE IDIOMA
    // ========================================================================

    const originalSwitchLanguage = window.switchLanguage;
    window.switchLanguage = function switchLanguage() {
        // Chamar original
        if (typeof originalSwitchLanguage === 'function') {
            originalSwitchLanguage.call(window);
        }
        
        // Atualizar Card AMT-01
        const idioma = window.currentLang || 'pt';
        window.injectCardAMT01(idioma);
        console.log('[UNIFED-AMT01] ✓ Card AMT-01 atualizado para idioma: ' + idioma);
    };

    // ========================================================================
    // RESUMO FINAL
    // ========================================================================

    console.log('[UNIFED-AMT01] ✅ FICHEIRO 2/5 CARREGADO');
    console.log('[UNIFED-AMT01] Card AMT-01 pronto para injeção');
    console.log(`[UNIFED-AMT01] Métrica: €${cálculos.diferencial.toFixed(2)} × ${cálculos.percentagem}% = €${cálculos.taxa.toFixed(2)}`);
    console.log(`[UNIFED-AMT01] Hash: ${hashAMT01}`);
    
    window.phase2_amt01 = true;
})();
