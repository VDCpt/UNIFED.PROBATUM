/**
 * ============================================================================
 * UNIFED-PROBATUM · legal_tactics_engine_v1.0.js
 * ============================================================================
 * Versão      : v1.0.0-LEGAL-TACTICS
 * Gerado em   : 2026-04-19
 * Conformidade: Art. 327.º CPP · Art. 125.º CPP · Art. 119.º RGIT
 *               ISO/IEC 27037:2012 · DAC7 (UE) 2021/514 · Lei n.º 45/2018 (AMT)
 *
 * ÂMBITO:
 *   Bateria de 50 Questões Estratégicas para Contraditório Judicial.
 *   Operacionalização do Direito ao Contraditório (Art. 327.º CPP).
 *   Foco em desafios de conformidade técnica (ex: colisão de hashes, etc).
 *
 * EIXOS DE ATAQUE:
 *   Eixo A (10q): Cadeia de Custódia / ISO 27037
 *   Eixo B (10q): Triangulação DAC7 vs SAF-T
 *   Eixo C (10q): Nexus-Zero / Apropriação de Fluxos Isentos
 *   Eixo D (10q): Algoritmo & Falibilidade
 *   Eixo E (10q): Art. 119.º RGIT / Responsabilidade Criminal
 *
 * DEPENDÊNCIAS:
 *   · Nenhuma dependência externa. Zero poluição global.
 *   · Expõe: window.UNIFED_LEGAL_TACTICS (selado)
 * ============================================================================
 */

(function _installLegalTacticsEngine(root) {
    'use strict';

    /* ── Guarda de idempotência ─────────────────────────────────────────── */
    if (root.UNIFED_LEGAL_TACTICS && root.UNIFED_LEGAL_TACTICS._INSTALLED === true) {
        console.info('[LEGAL_TACTICS] Módulo já instalado. Ignorando.');
        return;
    }

    /* ======================================================================
       DATABASE DE QUESTÕES ESTRATÉGICAS (50 QUESTÕES)
       ====================================================================== */

    const LEGAL_QUESTIONS_DATABASE = Object.freeze({
        eixo_a: [
            {
                id: 'A01',
                categoria: 'Cadeia de Custódia',
                prioridade: 'CRÍTICO',
                norma: 'ISO/IEC 27037:2012 · Art. 125.º CPP',
                questao: 'Pode o perito forense demonstrar que a cadeia de custódia dos dados brutos (ficheiros .pdf, .csv, extractos API) foi mantida em conformidade com ISO/IEC 27037:2012, incluindo registro imutável de todos os acessos?',
                implicacao: 'Falha na custódia compromete toda a perícia (Art. 125.º CPP).',
                contraditorio: 'Se não há prova de isolamento físico ou lógico dos dados durante análise, a integridade é questionável.'
            },
            {
                id: 'A02',
                categoria: 'Cadeia de Custódia',
                prioridade: 'CRÍTICO',
                norma: 'RFC 3161 · ISO 8601',
                questao: 'Os ficheiros foram submetidos a timestamping criptográfico (RFC 3161) com servidor de tempo autenticado (NTP NIST ou similar) antes de qualquer análise computacional?',
                implicacao: 'Timestamps não autenticados permitem objeção quanto à originalidade temporal.',
                contraditorio: 'Data do sistema operativo não é prova de data real (pode ser alterada pelo utilizador).'
            },
            {
                id: 'A03',
                categoria: 'Integridade de Dados',
                prioridade: 'CRÍTICO',
                norma: 'ISO/IEC 27037 · NIST SP 800-160',
                questao: 'Qual é o valor SHA-256 hash dos dados brutos originais, e este foi confirmado independentemente por perito contra-nomeado antes de qualquer processamento?',
                implicacao: 'Hash é fundamento de integridade em perícia informática.',
                contraditorio: 'Se só o perito tem hash, não há validação independente (violação de contraditório).'
            },
            {
                id: 'A04',
                categoria: 'Cadeia de Custódia',
                prioridade: 'ALTO',
                norma: 'Art. 125.º CPP · Art. 327.º CPP',
                questao: 'Foram os dados submetidos a transformação (parsing, limpeza, enriquecimento) antes do cálculo de hashes integrais? Se sim, qual foi a sequência exacta de operações?',
                implicacao: 'Qualquer transformação não documentada invalida a cadeia de custódia.',
                contraditorio: 'Se o UNIFED processou dados sem registro de transformações, há lacuna crítica.'
            },
            {
                id: 'A05',
                categoria: 'Acesso & Modificação',
                prioridade: 'ALTO',
                norma: 'ISO/IEC 27037 · DORA (UE) 2022/2554',
                questao: 'Qual é o log completo de modificações (create, read, update, delete) sobre cada ficheiro de dados, com timestamps e identificação de utilizador/processo?',
                implicacao: 'Lacunas no log podem indicar manipulação não documentada.',
                contraditorio: 'Log vazio ou genérico invalida análise forense (DORA art. 10).'
            },
            {
                id: 'A06',
                categoria: 'Validação de Fonte',
                prioridade: 'CRÍTICO',
                norma: 'Art. 74 LGT · DAC7 Art. 8ac.º',
                questao: 'Pode o perito confirmar que os dados PDF de extractos bancários foram obtidos directamente da instituição financeira autorizada (não via terceiros)?',
                implicacao: 'Extractos falsificados invalidam toda a perícia.',
                contraditorio: 'Se o PDF veio de email do interessado (não da instituição), é prova de segundo grau.'
            },
            {
                id: 'A07',
                categoria: 'Isolamento Forense',
                prioridade: 'ALTO',
                norma: 'NIST SP 800-86 · ISO/IEC 27037',
                questao: 'O ambiente de análise (máquina virtual, contentor, SO) foi isolado de redes externas durante toda a perícia? Qual foi o sistema operativo e versão?',
                implicacao: 'Máquina conectada à internet pode ter sido comprometida (injeção de código).',
                contraditorio: 'Sem isolamento provado, não há garantia de que dados não foram alterados por malware.'
            },
            {
                id: 'A08',
                categoria: 'Rastreabilidade de Algoritmos',
                prioridade: 'CRÍTICO',
                norma: 'Art. 125.º CPP · DORA Art. 10',
                questao: 'Qual é o código-fonte completo (v1.0 com comentários) do algoritmo UNIFED utilizado, incluindo todas as funções de parsing, validação e cálculo?',
                implicacao: 'Algoritmo "caixa negra" invalida contraditório técnico.',
                contraditorio: 'Se o código não foi divulgado, a contraparte não pode verificar lógica (Art. 327.º CPP).'
            },
            {
                id: 'A09',
                categoria: 'Validação Independente',
                prioridade: 'ALTO',
                norma: 'Art. 327.º CPP · Art. 125.º CPP',
                questao: 'Foi o algoritmo UNIFED testado com dados de referência conhecidos (test vectors) para validar exactidão de cálculos antes da análise do caso?',
                implicacao: 'Sem validação prévia, não há garantia de funcionamento correcto.',
                contraditorio: 'Desvios em test vectors indicam bug crítico no motor.'
            },
            {
                id: 'A10',
                categoria: 'Documentação Forense',
                prioridade: 'CRÍTICO',
                norma: 'Art. 125.º CPP · ISO/IEC 27037',
                questao: 'Existe relatório técnico detalhado descrevendo cada passo da análise, com screenshots de outputs intermediários e explicação de cada decisão metodológica?',
                implicacao: 'Relatório incompleto impede avaliação de conformidade.',
                contraditorio: 'Se há saltos explicativos, contraparte não pode refutar lógica (Art. 327.º CPP).'
            }
        ],

        eixo_b: [
            {
                id: 'B01',
                categoria: 'Triangulação DAC7',
                prioridade: 'CRÍTICO',
                norma: 'DAC7 (UE) 2021/514 · Art. 87.º-A LGT',
                questao: 'O perito reconciliou os dados com o relatório DAC7 reportado pela plataforma à AT? Se houve discrepância, qual foi o delta e como foi explicado?',
                implicacao: 'DAC7 é fonte oficial; discrepâncias indicam potencial omissão declarativa.',
                contraditorio: 'Se a AT recebeu valores diferentes via DAC7, o SAF-T pode estar incompleto.'
            },
            {
                id: 'B02',
                categoria: 'Limiar DAC7',
                prioridade: 'ALTO',
                norma: 'DAC7 Art. 8ac.º · Art. 87.º-A LGT',
                questao: 'O perito confirmou que a plataforma teve obrigação de reportar via DAC7 neste período? (Limiar: ≥ €2.000 em atividade TVDE anual ou ≥ €3.000 em outras plataformas)',
                implicacao: 'Se limiar foi atingido e DAC7 não foi reportado, há suspeita de evasão.',
                contraditorio: 'Ausência de DAC7 quando obrigatório é indício de ocultação.'
            },
            {
                id: 'B03',
                categoria: 'SAF-T vs Declaração',
                prioridade: 'CRÍTICO',
                norma: 'Art. 37.º RGIT · Lei n.º 45/2018 (AMT)',
                questao: 'O valor "Base Bruta" declarado no SAF-T corresponde exactamente aos fluxos financeiros brutos reportados via API ou extractos PDF? Se houve diferença, qual foi a causa?',
                implicacao: 'Delta entre SAF-T e fluxos reais indica potencial falsificação de registos.',
                contraditorio: 'Reconciliação manual pixel-a-pixel pode revelar omissões sistemáticas.'
            },
            {
                id: 'B04',
                categoria: 'Períodos Parciais',
                prioridade: 'ALTO',
                norma: 'Art. 87.º-A LGT · RGIT Art. 37.º',
                questao: 'Se o período analisado é parcial (ex: Outubro 2024, quando atividade começou em Setembro), o perito extrapolou para 12 meses? Se sim, qual foi a fórmula utilizada?',
                implicacao: 'Extrapolação linear pode distorcer se houver sazonalidade.',
                contraditorio: 'Projeção sem validação de tendência é metodologicamente fraca.'
            },
            {
                id: 'B05',
                categoria: 'Plataformas Múltiplas',
                prioridade: 'CRÍTICO',
                norma: 'DAC7 Art. 8ac.º · Art. 89.º-A LGT',
                questao: 'O interessado operou em múltiplas plataformas (ex: Uber, Deliveroo, Bolt)? Se sim, o perito consolidou os fluxos globais ou analisou isoladamente por plataforma?',
                implicacao: 'Atividade fragmentada em plataformas pode mascarar omissão agregada.',
                contraditorio: 'Se análise foi por plataforma isolada, há risco de omissão cruzada.'
            },
            {
                id: 'B06',
                categoria: 'Cronologia de Declarações',
                prioridade: 'ALTO',
                norma: 'Art. 74 LGT · Art. 37.º RGIT',
                questao: 'Qual foi a data de presentação do SAF-T à AT? Houve declarações provisórias seguidas de declarações retificativas? Se sim, qual foi o padrão de correções?',
                implicacao: 'Retificações frequentes podem indicar falta de controlo sobre registos.',
                contraditorio: 'Padrão de "erro corrigido" repetido sugere incompetência ou dolo.'
            },
            {
                id: 'B07',
                categoria: 'Omissões Temporais',
                prioridade: 'CRÍTICO',
                norma: 'ISO/IEC 27037 · Art. 125.º CPP',
                questao: 'O perito detectou "silêncio algorítmico" (gap temporal ≥ μ + 2.576σ) em séries de transações? Se sim, qual foi a duração e causa aparente?',
                implicacao: 'Gaps anómalos podem indicar que transações foram intencionalmente omitidas.',
                contraditorio: 'Se há 3+ dias sem movimentos numa conta operacional, há suspeita de esconder fluxos.'
            },
            {
                id: 'B08',
                categoria: 'Rubrica de Receita',
                prioridade: 'ALTO',
                norma: 'CIVA · Art. 75.º-B RGIT',
                questao: 'O perito diferenciou correctamente entre: (i) receitas sujeitas a IVA 23%; (ii) receitas sujeitas a IVA 6% (Verba 2.18 CIVA); (iii) receitas isentas (gorjetas P2P)?',
                implicacao: 'Classificação errada de receitas altera base tributável.',
                contraditorio: 'Se perito misturou rubricas, os cálculos de IVA estão comprometidos.'
            },
            {
                id: 'B09',
                categoria: 'Deduções & Abatimentos',
                prioridade: 'ALTO',
                norma: 'Art. 74 LGT · Art. 50.º RGIT',
                questao: 'Quais foram os critérios utilizados para separar "Despesas Legítimas" (comissões plataforma, combustível, manutenção) de "Fluxos Não-Tributáveis" (transferências P2P, devoluções)?',
                implicacao: 'Critério fraco permite manipulação de base tributável.',
                contraditorio: 'Se classificação não está fundada em comprovativo, é mera opinião.'
            },
            {
                id: 'B10',
                categoria: 'Validação de Comprovativos',
                prioridade: 'CRÍTICO',
                norma: 'Art. 74 LGT · DORA Art. 10',
                questao: 'Para cada dedução > €100, o perito exigiu comprovativo original (fatura, recibo, extrato bancário) ou aceitou declaração verbal/screenshot?',
                implicacao: 'Screenshots podem ser falsificadas; só documentos autênticos valem.',
                contraditorio: 'Se deduções não foram validadas, base tributável é especulativa.'
            }
        ],

        eixo_c: [
            {
                id: 'C01',
                categoria: 'Nexus-Zero: Gorjetas',
                prioridade: 'CRÍTICO',
                norma: 'Art. 6.º CIVA · Lei n.º 45/2018 (AMT)',
                questao: 'Como o perito garantiu que fluxos classificados como "Gorjetas" foram realmente transferências P2P diretas do cliente para o motorista, sem intermediação da plataforma?',
                implicacao: 'Se plataforma processou gorjeta, é receita tributável; se foi P2P, é isenta.',
                contraditorio: 'Sem comprovativo de P2P direto (ex: transferência bancária, depósito em espécie), classificação é suspeita.'
            },
            {
                id: 'C02',
                categoria: 'Nexus-Zero: Gorjetas',
                prioridade: 'CRÍTICO',
                norma: 'Art. 38.º RGIT · Circular AT n.º 1/2023',
                questao: 'O perito tem evidência de que o cliente aceitou receber gorjeta em cash/transferência directa sem registo na plataforma? Qual é essa evidência?',
                implicacao: 'Gorjeta isenta requer aceitação explícita do cliente fora da app.',
                contraditorio: 'Se gorjeta aparece na app (mesmo como "nota de cliente"), é receita da plataforma.'
            },
            {
                id: 'C03',
                categoria: 'Nexus-Zero: Portagens',
                prioridade: 'CRÍTICO',
                norma: 'Código da Estrada · Art. 50.º RGIT',
                questao: 'Fluxos classificados como "Portagens" (reembolso operacional) — foram realmente custos de portagem/combustível, ou incluem margin de lucro disfarçada?',
                implicacao: 'Reembolso de custo é não-tributável; margem de lucro é receita.',
                contraditorio: 'Se tarifa de portagem foi €1,50 mas motorista cobrou €2,00, delta de €0,50 é receita omitida.'
            },
            {
                id: 'C04',
                categoria: 'Nexus-Zero: Portagens',
                prioridade: 'ALTO',
                norma: 'Art. 20.º RGIT · Art. 74 LGT',
                questao: 'O perito exigiu comprovativo de cada portagem (talão Via Verde, recibo de portagem electrónica, etc.)? Qual é a taxa de validação?',
                implicacao: 'Portagens não-comprovadas são potencialmente receita dissimulada.',
                contraditorio: 'Se perito aceitou lote estimado sem validação amostra, é negligência.'
            },
            {
                id: 'C05',
                categoria: 'Nexus-Zero: Campanhas',
                prioridade: 'ALTO',
                norma: 'Art. 6.º CIVA · Lei n.º 45/2018',
                questao: 'Fluxos classificados como "Campanhas" ou "Bónus Plataforma" — foram realmente ofertas não-tributáveis da plataforma, ou corresponderam a trabalho executado?',
                implicacao: 'Bónus por desempenho é receita; bónus incondicional pode ser não-tributável.',
                contraditorio: 'Se bónus foi condicionado a "realizar 10 viagens", é receita por serviço.'
            },
            {
                id: 'C06',
                categoria: 'Nexus-Zero: Apropiação Indevida',
                prioridade: 'CRÍTICO',
                norma: 'Art. 119.º RGIT · Art. 103.º RGIT',
                questao: 'O algoritmo UNIFED aplicou taxa de comissão (ex: 25%) a fluxos que a plataforma declarou como não-sujeitos? Se sim, qual é a justificação técnica?',
                implicacao: 'Aplicar comissão a fluxos isentos é apropriação indevida de rendimento.',
                contraditorio: 'Se UNIFED disse "€1.000 em gorjetas" mas cobrou comissão sobre €1.000, há erro crítico.'
            },
            {
                id: 'C07',
                categoria: 'Nexus-Zero: Validação Cruzada',
                prioridade: 'CRÍTICO',
                norma: 'DAC7 · Art. 87.º-A LGT',
                questao: 'O perito comparou a classificação UNIFED de fluxos isentos com o que a própria plataforma reportou via DAC7 à AT? Houve discrepância?',
                implicacao: 'Se UNIFED classifica diferente de DAC7, há potencial contradição.',
                contraditorio: 'Se AT recebeu "€5.000 gorjetas" mas UNIFED diz "€3.500", alguém mentiu.'
            },
            {
                id: 'C08',
                categoria: 'Nexus-Zero: Margem de Erro',
                prioridade: 'ALTO',
                norma: 'ISO/IEC 27037 · Art. 125.º CPP',
                questao: 'Qual é a margem de erro declarada para a classificação de fluxos em categorias (gorjetas vs receita, portagem vs receita)? É ± 5%, ± 10%, ou desconhecida?',
                implicacao: 'Sem margem de erro, conclusões sobre pequenos volumes são especulativas.',
                contraditorio: 'Se margem é ±15% e discrepância é €500, a verdade está em intervalo €425-€575.'
            },
            {
                id: 'C09',
                categoria: 'Nexus-Zero: Padrão Histórico',
                prioridade: 'ALTO',
                norma: 'Art. 87.º-A LGT · Art. 89.º-A RGIT',
                questao: 'O interessado tinha histórico declarativo anterior (ex: 2023, 2022)? Se sim, qual foi a comparação ano-a-ano de proporção de "fluxos isentos"?',
                implicacao: 'Mudança brusca de padrão (ex: gorjetas subitamente 40% do total) é suspeita.',
                contraditorio: 'Se padrão é consistente historicamente, classificação é mais credível.'
            },
            {
                id: 'C10',
                categoria: 'Nexus-Zero: Plataforma vs Motorista',
                prioridade: 'CRÍTICO',
                norma: 'Art. 38.º RGIT · Lei n.º 45/2018',
                questao: 'Qual é a política oficial da plataforma sobre retenção de gorjetas/portagens? O perito tem evidência de que motorista negociou diferente com clientes?',
                implicacao: 'Se plataforma absorve "gorjetas" (mantém comissão), não são realmente isentas.',
                contraditorio: 'Se T&C da plataforma dizem "plataforma retém 15% de gorjeta", então é receita da plataforma.'
            }
        ],

        eixo_d: [
            {
                id: 'D01',
                categoria: 'Algoritmo & Falibilidade',
                prioridade: 'CRÍTICO',
                norma: 'DORA (UE) 2022/2554 · Art. 125.º CPP',
                questao: 'Qual é a taxa de erro conhecida do algoritmo UNIFED (precision, recall, F1-score) testada em dados de referência externa?',
                implicacao: 'Sem validação de acurácia, não há garantia de confiabilidade.',
                contraditorio: 'Se F1-score < 0.85, o algoritmo falha mais que acerta em casos borderline.'
            },
            {
                id: 'D02',
                categoria: 'Algoritmo & Falibilidade',
                prioridade: 'CRÍTICO',
                norma: 'ISO/IEC 27037 · NIST SP 800-160',
                questao: 'O perito testou o UNIFED com dados intencionalmente corrompidos (injeção de erro) para confirmar que detecta anomalias? Qual foi taxa de detecção?',
                implicacao: 'Se algoritmo não detecta erros injetados, é inútil como validador.',
                contraditorio: 'Teste de "canário" negativo é obrigatório em perícia informática.'
            },
            {
                id: 'D03',
                categoria: 'Algoritmo & Hashing',
                prioridade: 'CRÍTICO',
                norma: 'RFC 6234 · NIST FIPS 180-4',
                questao: 'Pode ocorrer colisão de hash SHA-256 no universo de dados analisados (ex: se >2^128 registos)? Como o perito mitigou este risco?',
                implicacao: 'Colisão, embora rara, invalida assunção de unicidade.',
                contraditorio: 'Se dataset tem >100M registos, probabilidade teórica de colisão é não-negligível.'
            },
            {
                id: 'D04',
                categoria: 'Algoritmo & Dependências',
                prioridade: 'ALTO',
                norma: 'DORA Art. 10 · Art. 125.º CPP',
                questao: 'O UNIFED tem dependências de bibliotecas de terceiros (ex: libraries npm, Python)? Se sim, qual é versão e foram auditadas para vulnerabilidades?',
                implicacao: 'Dependência não-auditada pode conter malware ou bug crítico.',
                contraditorio: 'Se usa biblioteca desatualizada com CVE conhecida, perícia é comprometida.'
            },
            {
                id: 'D05',
                categoria: 'Algoritmo & Parametrização',
                prioridade: 'ALTO',
                norma: 'Art. 125.º CPP · ISO/IEC 27037',
                questao: 'Quais são os parâmetros exactos configurados no UNIFED (ex: threshold de discrepância, k-factor em detecção de anomalias)? Foram justificados cientificamente?',
                implicacao: 'Se parâmetros são hardcoded arbitrariamente, resultados são questionáveis.',
                contraditorio: 'Se k=2 foi arbitrariamente escolhido (não k=1.96 ou k=3), há espaço para crítica.'
            },
            {
                id: 'D06',
                categoria: 'Algoritmo & Enriquecimento',
                prioridade: 'ALTO',
                norma: 'Art. 125.º CPP · Art. 327.º CPP',
                questao: 'Se o UNIFED aplicou "enriquecimento de dados" (fusão de fontes, preenchimento de lacunas), qual foi o código responsável e como foi validado?',
                implicacao: 'Enriquecimento não-documentado pode ser manipulação inadvertida.',
                contraditorio: 'Se perito "completou" dados em branco, pode ter inventado valores.'
            },
            {
                id: 'D07',
                categoria: 'Algoritmo & Sensibilidade',
                prioridade: 'ALTO',
                norma: 'NIST SP 800-160 · ISO/IEC 27037',
                questao: 'O perito realizou análise de sensibilidade? (ex: "se X variar ±10%, como varia a conclusão final?")',
                implicacao: 'Sem análise de sensibilidade, não se sabe robustez de conclusões.',
                contraditorio: 'Se conclusão muda drasticamente com ±5% de variação, é frágil.'
            },
            {
                id: 'D08',
                categoria: 'Algoritmo & Comparação',
                prioridade: 'ALTO',
                norma: 'Art. 125.º CPP · DORA Art. 10',
                questao: 'O UNIFED foi comparado com outras metodologias forenses (ex: reconciliação manual, software concorrente)? Qual foi resultado da comparação?',
                implicacao: 'Sem benchmark externo, não há validação de qualidade relativa.',
                contraditorio: 'Se outro software retorna valor diferente, qual é correcto?'
            },
            {
                id: 'D09',
                categoria: 'Algoritmo & Reprodutibilidade',
                prioridade: 'CRÍTICO',
                norma: 'NIST SP 800-89 · Art. 125.º CPP',
                questao: 'Se perito-contra nomeado executar o UNIFED com exactos mesmos inputs, obtém resultado idêntico (reprodutibilidade 100%)?',
                implicacao: 'Resultados não-reprodutíveis invalidam perícia.',
                contraditorio: 'Se há variabilidade aleatória, deve ser documentada e quantificada.'
            },
            {
                id: 'D10',
                categoria: 'Algoritmo & Documentação',
                prioridade: 'CRÍTICO',
                norma: 'ISO/IEC 27037 · DORA Art. 10',
                questao: 'Existe documentação de design (diagramas UML, flowcharts) explicando fluxo lógico do UNIFED e decisões algorítmicas?',
                implicacao: 'Código sem documentação é "caixa negra" e permite questionamento total.',
                contraditorio: 'Se perito não consegue explicar lógica em 10 minutos, é sinal de problema.'
            }
        ],

        eixo_e: [
            {
                id: 'E01',
                categoria: 'Art. 119.º RGIT',
                prioridade: 'CRÍTICO',
                norma: 'Art. 119.º RGIT · Art. 103.º RGIT',
                questao: 'A discrepância detectada (ex: €2.184,95) configure "omissão continuada" (>18 meses de prática) ou é infração isolada (Art. 119.º vs Art. 100.º)?',
                implicacao: 'Omissão continuada agrava responsabilidade fiscal e pode abrir via penal.',
                contraditorio: 'Se atividade começou há 2 meses, não há "continuação".'
            },
            {
                id: 'E02',
                categoria: 'Art. 119.º RGIT',
                prioridade: 'CRÍTICO',
                norma: 'Art. 103.º RGIT · Art. 103.º CPP',
                questao: 'Qual é o valor da coima de contravenção (Art. 119.º RGIT) vs possível agravamento penal (Art. 103.º CPP — fraude fiscal)? Qual é o limiar?',
                implicacao: '€2.000+ em omissão pode cruzar para responsabilidade penal.',
                contraditorio: 'Se montante é <€10.000, via penal é improvável (Art. 103.º CPP tem limiar).'
            },
            {
                id: 'E03',
                categoria: 'Responsabilidade Criminal',
                prioridade: 'CRÍTICO',
                norma: 'Art. 103.º CPP · CC Art. 219.º',
                questao: 'Qual é a intenção do arguido? Prova o perito dolo (omissão intencional) ou culpa (negligência)? Como se diferencia?',
                implicacao: 'Dolo agrava para crime; negligência fica em contravenção.',
                contraditorio: 'Se há prova de ignorância genuína, é defesa válida contra dolo.'
            },
            {
                id: 'E04',
                categoria: 'Responsabilidade Criminal',
                prioridade: 'ALTO',
                norma: 'CC Art. 219.º · Art. 103.º CPP',
                questao: 'O perito investigou se arguido recebeu orientação de advogado/contabilista sobre obrigações? Se sim, ignorância é menos credível.',
                implicacao: 'Alegado "não sabia" é fraca defesa se teve aconselhamento profissional.',
                contraditorio: 'Contudo, conselho errado do contabilista pode ser circunstância atenuante.'
            },
            {
                id: 'E05',
                categoria: 'Prescrição de Infração',
                prioridade: 'ALTO',
                norma: 'Art. 37.º LGT · Art. 128.º RGIT',
                questao: 'Quando começou a omissão (data primeira viagem)? Quanto tempo decorreu até denúncia/inspeção? Está dentro do prazo de prescrição (4 anos geral, 6 anos crime)?',
                implicacao: 'Se >6 anos passaram, infração está prescrita.',
                contraditorio: 'Se perícia é de 2024 mas atividade foi 2018, prescrição pode aplicar.'
            },
            {
                id: 'E06',
                categoria: 'Agravantes vs Atenuantes',
                prioridade: 'ALTO',
                norma: 'Art. 105.º RGIT · Art. 103.º CPP',
                questao: 'Qual é a conduta prévia do arguido (reincidência em infração fiscal)? Isto agrava a coima em 50%-100%.',
                implicacao: 'Reincidente enfrenta agravação substancial.',
                contraditorio: 'Se primeira infração, coima é base; sem histórico é argumento de defesa.'
            },
            {
                id: 'E07',
                categoria: 'Conformidade Voluntária',
                prioridade: 'ALTO',
                norma: 'Lei n.º 45/2018 (AMT) Art. 5.º · RGIT Art. 96.º-A',
                questao: 'Arguido apresentou declaração rectificativa voluntária (com juros e multa reduzida) após detecção? Se sim, há atenuação legal.',
                implicacao: 'Rectificação voluntária reduz drasticamente consequências (até 50% de redução).',
                contraditorio: 'Se arguido confessou e regulou antes de julgamento, responsabilidade é minimizada.'
            },
            {
                id: 'E08',
                categoria: 'Causas de Exclusão',
                prioridade: 'ALTO',
                norma: 'CC Art. 31.º · Art. 103.º CPP',
                questao: 'Qual é a "culpabilidade" do arguido? Há causa de exclusão (erro escusável sobre a lei, incapacidade de agir)?',
                implicacao: 'Erro escusável pode ser fundamento de impunidade.',
                contraditorio: 'Se arguido prova que confiou em expert contabilista, pode invocar Art. 31.º CC.'
            },
            {
                id: 'E09',
                categoria: 'Circunstâncias Especiais',
                prioridade: 'ALTO',
                norma: 'Lei n.º 45/2018 · RGIT Art. 96.º-A',
                questao: 'Tinha arguido dificuldade de acesso a informação (ex: API da plataforma não funcionava)? Isto é circunstância que releva de responsabilidade?',
                implicacao: 'Obstacle técnico pode ser atenuante se comprovado.',
                contraditorio: 'Se plataforma falhou durante período crítico, AT tem responsabilidade parcial.'
            },
            {
                id: 'E10',
                categoria: 'Coimas Graduadas',
                prioridade: 'ALTO',
                norma: 'Art. 119.º RGIT · Art. 122.º RGIT',
                questao: 'Qual é a coima final proposta (€500-€2.000 base x agravantes/atenuantes)? Está dentro dos limites e criteriosamente justificada?',
                implicacao: 'Coima arbitrária ou excessiva é questionável em contraditório.',
                contraditorio: 'Se coima máxima é invocada, argumentar por coima menor com base em Art. 96.º-A.'
            }
        ]
    });

    /* ======================================================================
       CLASSE: LegalTacticsEngine
       ====================================================================== */

    class LegalTacticsEngine {
        constructor() {
            this.database = LEGAL_QUESTIONS_DATABASE;
            this.totalQuestions = 50;
            this.eixos = Object.keys(this.database).map(k => k.replace('eixo_', '').toUpperCase());
        }

        /**
         * getQuestionsByEixo(eixo) → Array<Question>
         * Retorna todas as questões de um eixo específico.
         * @param {string} eixo - 'a', 'b', 'c', 'd', 'e'
         */
        getQuestionsByEixo(eixo) {
            const key = 'eixo_' + (eixo || 'a').toLowerCase();
            return this.database[key] ? this.database[key].slice() : [];
        }

        /**
         * getAllQuestions() → Array<Question>
         * Retorna todas as 50 questões, ordenadas por eixo e ID.
         */
        getAllQuestions() {
            const all = [];
            ['a', 'b', 'c', 'd', 'e'].forEach(e => {
                all.push(...this.getQuestionsByEixo(e));
            });
            return all;
        }

        /**
         * getQuestionsByPrioridade(prioridade) → Array<Question>
         * Filtra questões por nível de prioridade.
         * @param {string} prioridade - 'CRÍTICO', 'ALTO', 'MODERADO'
         */
        getQuestionsByPrioridade(prioridade) {
            return this.getAllQuestions().filter(q => q.prioridade === prioridade);
        }

        /**
         * selectiveQuestions(discrepanciaState) → Array<Question>
         * Retorna questões dinamicamente prioritárias baseado em estado de discrepância.
         * @param {Object} discrepanciaState - {discrepancia_c2, comissaoIndevida, etc}
         */
        selectiveQuestions(discrepanciaState) {
            const all = this.getAllQuestions();
            let destacadas = [];

            if (discrepanciaState.discrepancia_c2 && Number(discrepanciaState.discrepancia_c2) > 0) {
                // Destacar Eixo B e E
                destacadas = all.filter(q => q.id.startsWith('B') || q.id.startsWith('E'));
            }
            if (discrepanciaState.comissaoIndevida && Number(discrepanciaState.comissaoIndevida) > 0) {
                // Destacar Eixo C
                destacadas = all.filter(q => q.id.startsWith('C'));
            }
            if (discrepanciaState.cadeiaCustodia === false) {
                // Destacar Eixo A
                destacadas = all.filter(q => q.id.startsWith('A'));
            }

            // Se nenhum filtro aplica, retornar todas
            return destacadas.length > 0 ? destacadas : all;
        }

        /**
         * exportJSON() → string (JSON)
         * Serializa toda a base de dados em JSON para storage/export.
         */
        exportJSON() {
            return JSON.stringify(this.database, null, 2);
        }

        /**
         * generateGuiaoAudiencia(selectedQuestionIds, metadadosPericia) → Object
         * Gera objeto estruturado para compilação em PDF.
         * @param {Array<string>} selectedQuestionIds - Ex: ['A01', 'B03', 'C05']
         * @param {Object} metadadosPericia - {caseId, perito, data, discrepancia, etc}
         */
        generateGuiaoAudiencia(selectedQuestionIds, metadadosPericia) {
            const all = this.getAllQuestions();
            const selecionadas = all.filter(q => selectedQuestionIds.includes(q.id));

            return Object.freeze({
                metadata: {
                    titulo: 'GUIÃO TÉCNICO DE AUDIÊNCIA - APOIO AO MANDATÁRIO',
                    subtitulo: 'Bateria de Contraditório — 50 Questões Estratégicas',
                    data_geracao: new Date().toISOString(),
                    case_id: metadadosPericia.caseId || 'CASE-????',
                    perito_original: metadadosPericia.perito || 'Perito Desconhecido',
                    discrepancia_montante: metadadosPericia.discrepancia || '€ 0,00',
                    periodo: metadadosPericia.periodo || 'Período não especificado'
                },
                questoes_selecionadas: selecionadas,
                total_selecionadas: selecionadas.length,
                distribuicao_eixos: {
                    A: selecionadas.filter(q => q.id.startsWith('A')).length,
                    B: selecionadas.filter(q => q.id.startsWith('B')).length,
                    C: selecionadas.filter(q => q.id.startsWith('C')).length,
                    D: selecionadas.filter(q => q.id.startsWith('D')).length,
                    E: selecionadas.filter(q => q.id.startsWith('E')).length
                },
                conformidade: ['Art. 327.º CPP', 'Art. 125.º CPP', 'ISO/IEC 27037:2012'],
                aviso_legal: 'Este guião é instrumento de apoio jurídico ao mandatário. Não constitui parecer jurídico. Recomenda-se revisão por advogado especializado.'
            });
        }

        /**
         * summary() → Object
         * Retorna sumário executivo do motor.
         */
        summary() {
            return Object.freeze({
                engine_version: '1.0.0',
                total_questoes: this.totalQuestions,
                eixos: this.eixos,
                questoes_por_eixo: 10,
                prioridades_disponiveis: ['CRÍTICO', 'ALTO'],
                conformidade_normativa: [
                    'Art. 327.º CPP (Contraditório)',
                    'Art. 125.º CPP (Perícia)',
                    'Art. 119.º RGIT (Infrações)',
                    'DAC7 (UE) 2021/514',
                    'ISO/IEC 27037:2012',
                    'DORA (UE) 2022/2554'
                ]
            });
        }
    }

    /* ======================================================================
       INTERFACE PÚBLICA (NAMESPACE SELADO)
       ====================================================================== */

    const PUBLIC_API = Object.freeze({
        _INSTALLED: true,
        _VERSION: '1.0.0-LEGAL-TACTICS',
        _TIMESTAMP: new Date().toISOString(),

        LegalTacticsEngine: LegalTacticsEngine,

        /**
         * Instanciação singleton para uso global.
         */
        getInstance: function () {
            if (!this._instance) {
                this._instance = new LegalTacticsEngine();
            }
            return this._instance;
        }
    });

    Object.defineProperty(root, 'UNIFED_LEGAL_TACTICS', {
        value: PUBLIC_API,
        writable: false,
        configurable: false,
        enumerable: true
    });

    root.dispatchEvent(new CustomEvent('UNIFED_LEGAL_TACTICS_READY', {
        detail: {
            version: PUBLIC_API._VERSION,
            timestamp: PUBLIC_API._TIMESTAMP,
            totalQuestions: 50
        }
    }));

    console.log('[LEGAL_TACTICS] ✅ UNIFED_LEGAL_TACTICS v' + PUBLIC_API._VERSION + ' instalado e selado. 50 questões de contraditório prontas.');

})(window);
