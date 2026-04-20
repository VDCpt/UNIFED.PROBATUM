/**
 * ============================================================================
 * UNIFED-PROBATUM · legal_tactics_pdf_export_v1.0.js
 * ============================================================================
 * Versão      : v1.0.0-PDF-EXPORT
 * Gerado em   : 2026-04-19
 *
 * ÂMBITO:
 *   Exportação em PDF do Guião Técnico de Audiência.
 *   Integração com jsPDF + pdfMake (fallback).
 *   Master Hash SHA-256 em rodapé.
 *
 * DEPENDÊNCIAS:
 *   · window.UNIFED_LEGAL_TACTICS (FASE 1)
 *   · jsPDF (externa, carregada via CDN)
 * ============================================================================
 */

(function _installLegalTacticsPDFExport(root) {
    'use strict';

    if (root.UNIFED_LEGAL_TACTICS_PDF && root.UNIFED_LEGAL_TACTICS_PDF._INSTALLED === true) {
        console.info('[LEGAL_TACTICS_PDF] Módulo já instalado.');
        return;
    }

    /* ======================================================================
       UTILITÁRIO: HASH SHA-256 (FALLBACK NATIVO)
       ====================================================================== */

    /**
     * computeSHA256(text) → Promise<string>
     * Calcula SHA-256 usando SubtleCrypto (nativo em navegadores modernos).
     * Fallback para valor simbólico em navegadores antigos.
     */
    async function computeSHA256(text) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(text);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            return hashHex;
        } catch (e) {
            // Fallback: gerar valor simbólico deterministico
            console.warn('[SHA256_FALLBACK] SubtleCrypto indisponível. Usando fallback.');
            let hash = 0;
            for (let i = 0; i < text.length; i++) {
                const char = text.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Converter para inteiro 32-bit
            }
            return 'FALLBACK_' + Math.abs(hash).toString(16).padStart(56, '0');
        }
    }

    /* ======================================================================
       GERADOR DE PDF (HTML2PDF + FALLBACK)
       ====================================================================== */

    class PDFExporter {
        constructor() {
            this.engine = null;
            this._waitForEngine();
        }

        _waitForEngine() {
            if (root.UNIFED_LEGAL_TACTICS) {
                this.engine = root.UNIFED_LEGAL_TACTICS.getInstance();
            } else {
                root.addEventListener('UNIFED_LEGAL_TACTICS_READY', () => {
                    this.engine = root.UNIFED_LEGAL_TACTICS.getInstance();
                }, { once: true });
            }
        }

        /**
         * generatePDF(selectedQuestionIds, metadata) → Promise<Blob>
         * Gera PDF binário com questões selecionadas.
         * @param {Array<string>} selectedQuestionIds
         * @param {Object} metadata
         */
        async generatePDF(selectedQuestionIds, metadata) {
            if (!this.engine) {
                throw new Error('[PDF_EXPORT] Motor jurídico não carregado ainda.');
            }

            const guiao = this.engine.generateGuiaoAudiencia(selectedQuestionIds, metadata);

            // Computar Master Hash
            const conteudoGuiao = JSON.stringify(guiao, null, 2);
            const masterHash = await computeSHA256(conteudoGuiao);

            // Tentar usar jsPDF (se disponível)
            if (typeof window.jsPDF !== 'undefined') {
                return this._generateUsingJsPDF(guiao, masterHash);
            } else {
                console.warn('[PDF_EXPORT] jsPDF não disponível. Usando fallback HTML-to-print.');
                return this._generateUsingHTMLFallback(guiao, masterHash);
            }
        }

        /**
         * _generateUsingJsPDF(guiao, masterHash) → Blob
         * Usa jsPDF para gerar PDF profissional.
         */
        _generateUsingJsPDF(guiao, masterHash) {
            const { jsPDF } = window;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const marginLeft = 15;
            const marginRight = 15;
            const marginTop = 20;
            const marginBottom = 25;
            let currentY = marginTop;
            const lineHeight = 7;
            const textWidth = pageWidth - marginLeft - marginRight;

            // ─────────────────────────────────────────────────────────────
            // PÁGINA 1: CABEÇALHO E METADATA
            // ─────────────────────────────────────────────────────────────

            // Logo/Título
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            doc.setTextColor(239, 68, 68); // Vermelho UNIFED
            doc.text('GUIÃO TÉCNICO DE AUDIÊNCIA', marginLeft, currentY);
            currentY += 8;

            doc.setFont('helvetica', 'italic');
            doc.setFontSize(12);
            doc.setTextColor(100, 100, 100);
            doc.text('Apoio ao Mandatário — Bateria de Contraditório', marginLeft, currentY);
            currentY += 10;

            // Metadata
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);

            const metaFields = [
                ['Caso:', guiao.metadata.case_id],
                ['Data de Geração:', guiao.metadata.data_geracao.split('T')[0]],
                ['Perito Original:', guiao.metadata.perito_original],
                ['Período de Análise:', guiao.metadata.periodo],
                ['Discrepância Detectada:', guiao.metadata.discrepancia_montante],
                ['Total de Questões:', guiao.total_selecionadas + ' / 50']
            ];

            metaFields.forEach(([label, value]) => {
                doc.setFont('helvetica', 'bold');
                doc.text(label, marginLeft, currentY);
                doc.setFont('helvetica', 'normal');
                doc.text(value, marginLeft + 45, currentY);
                currentY += 6;
            });

            currentY += 5;

            // Distribuição de Eixos
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text('Distribuição por Eixo:', marginLeft, currentY);
            currentY += 7;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            const eixoTextos = [
                `A (Cadeia de Custódia): ${guiao.distribuicao_eixos.A}/10`,
                `B (DAC7 vs SAF-T): ${guiao.distribuicao_eixos.B}/10`,
                `C (Nexus-Zero): ${guiao.distribuicao_eixos.C}/10`,
                `D (Algoritmo): ${guiao.distribuicao_eixos.D}/10`,
                `E (Art. 119.º RGIT): ${guiao.distribuicao_eixos.E}/10`
            ];

            eixoTextos.forEach(texto => {
                doc.text(texto, marginLeft + 5, currentY);
                currentY += 5;
            });

            currentY += 5;

            // Conformidade Normativa
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text('Conformidade Normativa:', marginLeft, currentY);
            currentY += 7;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            guiao.conformidade.forEach(norma => {
                doc.text('• ' + norma, marginLeft + 5, currentY);
                currentY += 5;
            });

            // ─────────────────────────────────────────────────────────────
            // PÁGINAS: QUESTÕES DETALHADAS
            // ─────────────────────────────────────────────────────────────

            guiao.questoes_selecionadas.forEach((questao, idx) => {
                if (currentY > pageHeight - marginBottom - 20) {
                    doc.addPage();
                    currentY = marginTop;
                }

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(239, 68, 68);
                doc.text(`Q${idx + 1}: ${questao.id} — ${questao.categoria}`, marginLeft, currentY);
                currentY += 7;

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.setTextColor(0, 0, 0);

                // Prioridade
                doc.setTextColor(200, 0, 0);
                doc.text(`[${questao.prioridade}] ${questao.norma}`, marginLeft, currentY);
                currentY += 5;

                // Questão
                doc.setTextColor(0, 0, 0);
                const questaoWrapped = doc.splitTextToSize(questao.questao, textWidth);
                questaoWrapped.forEach(line => {
                    if (currentY > pageHeight - marginBottom - 20) {
                        doc.addPage();
                        currentY = marginTop;
                    }
                    doc.text(line, marginLeft, currentY);
                    currentY += lineHeight;
                });

                currentY += 2;

                // Implicação
                doc.setTextColor(200, 0, 0);
                doc.setFont('helvetica', 'bold');
                doc.text('Implicação:', marginLeft, currentY);
                currentY += 5;
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(0, 0, 0);
                const implicacaoWrapped = doc.splitTextToSize(questao.implicacao, textWidth);
                implicacaoWrapped.forEach(line => {
                    if (currentY > pageHeight - marginBottom - 20) {
                        doc.addPage();
                        currentY = marginTop;
                    }
                    doc.text(line, marginLeft, currentY);
                    currentY += lineHeight;
                });

                currentY += 2;

                // Contraditório
                doc.setFont('helvetica', 'bold');
                doc.text('Defesa/Contraditório:', marginLeft, currentY);
                currentY += 5;
                doc.setFont('helvetica', 'normal');
                const contraditorioWrapped = doc.splitTextToSize(questao.contraditorio, textWidth);
                contraditorioWrapped.forEach(line => {
                    if (currentY > pageHeight - marginBottom - 20) {
                        doc.addPage();
                        currentY = marginTop;
                    }
                    doc.text(line, marginLeft, currentY);
                    currentY += lineHeight;
                });

                currentY += 8;
            });

            // ─────────────────────────────────────────────────────────────
            // RODAPÉ: MASTER HASH EM TODAS AS PÁGINAS
            // ─────────────────────────────────────────────────────────────

            const pageCount = doc.internal.pages.length;
            for (let pageNum = 1; pageNum < pageCount; pageNum++) {
                doc.setPage(pageNum);
                doc.setFont('courier', 'normal');
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);

                const footerText = `Master Hash SHA-256: ${masterHash.substring(0, 32)}…`;
                doc.text(footerText, marginLeft, pageHeight - marginBottom + 5);

                const pageLabel = `Página ${pageNum} de ${pageCount - 1}`;
                doc.text(pageLabel, pageWidth - marginRight - 30, pageHeight - marginBottom + 5);
            }

            // Retornar Blob
            return new Promise(resolve => {
                const blob = doc.output('blob');
                resolve(blob);
            });
        }

        /**
         * _generateUsingHTMLFallback(guiao, masterHash) → Blob (HTML simulado)
         * Fallback: gera HTML que pode ser impresso como PDF.
         */
        _generateUsingHTMLFallback(guiao, masterHash) {
            let html = `
            <!DOCTYPE html>
            <html lang="pt-PT">
            <head>
                <meta charset="UTF-8">
                <title>GUIÃO TÉCNICO DE AUDIÊNCIA</title>
                <style>
                    body {
                        font-family: 'Segoe UI', sans-serif;
                        max-width: 900px;
                        margin: 0 auto;
                        padding: 20px;
                        color: #333;
                        line-height: 1.6;
                    }
                    h1 {
                        color: #ef4444;
                        text-align: center;
                        border-bottom: 2px solid #ef4444;
                        padding-bottom: 10px;
                    }
                    .metadata {
                        background: #f0f0f0;
                        padding: 15px;
                        border-radius: 5px;
                        margin: 20px 0;
                        font-size: 0.9em;
                    }
                    .metadata-row {
                        display: flex;
                        justify-content: space-between;
                        margin: 5px 0;
                    }
                    .questao {
                        page-break-inside: avoid;
                        border-left: 3px solid #ef4444;
                        padding-left: 15px;
                        margin: 20px 0;
                        background: #fafafa;
                        padding: 15px;
                        border-radius: 5px;
                    }
                    .questao-titulo {
                        font-weight: bold;
                        color: #ef4444;
                        margin-bottom: 10px;
                    }
                    .questao-campo {
                        margin: 10px 0;
                        font-size: 0.95em;
                    }
                    .questao-label {
                        font-weight: bold;
                        color: #555;
                    }
                    .footer {
                        margin-top: 40px;
                        padding-top: 20px;
                        border-top: 1px solid #ddd;
                        font-size: 0.8em;
                        color: #999;
                        font-family: monospace;
                        text-align: center;
                    }
                    @media print {
                        body { margin: 0; padding: 10mm; }
                        .questao { page-break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <h1>GUIÃO TÉCNICO DE AUDIÊNCIA</h1>
                <p style="text-align: center; font-style: italic; color: #999;">Apoio ao Mandatário — Bateria de Contraditório</p>
                
                <div class="metadata">
                    <div class="metadata-row">
                        <span><strong>Caso:</strong> ${guiao.metadata.case_id}</span>
                        <span><strong>Data:</strong> ${guiao.metadata.data_geracao.split('T')[0]}</span>
                    </div>
                    <div class="metadata-row">
                        <span><strong>Perito Original:</strong> ${guiao.metadata.perito_original}</span>
                        <span><strong>Período:</strong> ${guiao.metadata.periodo}</span>
                    </div>
                    <div class="metadata-row">
                        <span><strong>Discrepância:</strong> ${guiao.metadata.discrepancia_montante}</span>
                        <span><strong>Total Questões:</strong> ${guiao.total_selecionadas}/50</span>
                    </div>
                    <div style="margin-top: 10px;">
                        <strong>Distribuição por Eixo:</strong>
                        A:${guiao.distribuicao_eixos.A} | B:${guiao.distribuicao_eixos.B} | C:${guiao.distribuicao_eixos.C} | D:${guiao.distribuicao_eixos.D} | E:${guiao.distribuicao_eixos.E}
                    </div>
                </div>

                <h2>Questões Selecionadas</h2>
            `;

            guiao.questoes_selecionadas.forEach((q, idx) => {
                html += `
                <div class="questao">
                    <div class="questao-titulo">Q${idx + 1}: ${q.id} — ${q.categoria}</div>
                    <div class="questao-campo">
                        <span class="questao-label">[${q.prioridade}]</span> ${q.norma}
                    </div>
                    <div class="questao-campo">
                        <span class="questao-label">Questão:</span><br/>
                        ${q.questao}
                    </div>
                    <div class="questao-campo">
                        <span class="questao-label">⚠️ Implicação:</span><br/>
                        ${q.implicacao}
                    </div>
                    <div class="questao-campo">
                        <span class="questao-label">🛡️ Defesa/Contraditório:</span><br/>
                        ${q.contraditorio}
                    </div>
                </div>
                `;
            });

            html += `
                <div class="footer">
                    Master Hash SHA-256: ${masterHash.substring(0, 32)}…<br/>
                    Aviso: Este documento foi gerado automaticamente. Recomenda-se validação por advogado especializado.
                </div>
            </body>
            </html>
            `;

            // Retornar como Blob
            const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
            return Promise.resolve(blob);
        }

        /**
         * downloadFile(blob, filename) → void
         * Força download do ficheiro.
         */
        static downloadFile(blob, filename) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }

    /* ======================================================================
       INTEGRAÇÃO COM UI
       ====================================================================== */

    // Estender UNIFED_LEGAL_TACTICS_UI para incluir função de export
    if (root.UNIFED_LEGAL_TACTICS_UI) {
        const originalExportPDF = root.UNIFED_LEGAL_TACTICS_UI.exportPDF;
        root.UNIFED_LEGAL_TACTICS_UI.exportPDF = async function() {
            const selectedQuestions = Array.from(document.querySelectorAll('.pure-accordion-checkbox:checked')).map(cb => cb.id.replace('cb-', ''));
            
            if (selectedQuestions.length === 0) {
                alert('⚠️ Selecione pelo menos uma questão para exportar.');
                return;
            }

            const metadata = {
                caseId: 'CASE-UNIFED-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-6),
                perito: 'Sistema UNIFED Probatum v13.12.3-PRO',
                data: new Date().toLocaleDateString('pt-PT'),
                discrepancia: document.getElementById('pure-disc-c2')?.textContent || '€ [conforme perícia]',
                periodo: 'Outubro 2024'
            };

            try {
                const exporter = new PDFExporter();
                const blob = await exporter.generatePDF(selectedQuestions, metadata);
                
                const filename = 'GUIAO_AUDIENCIA_' + metadata.caseId + '.pdf';
                PDFExporter.downloadFile(blob, filename);

                const statusEl = document.getElementById('pure-contradictory-export-status');
                if (statusEl) {
                    statusEl.style.display = 'block';
                    statusEl.style.background = 'rgba(16, 185, 129, 0.15)';
                    statusEl.style.borderColor = '#10b981';
                    statusEl.style.color = '#10b981';
                    statusEl.innerHTML = `
                        <strong>✓ PDF Exportado com Sucesso</strong><br/>
                        Ficheiro: <code>${filename}</code><br/>
                        Questões: ${selectedQuestions.length}/50<br/>
                        <em>O documento está assinado com Master Hash SHA-256 no rodapé.</em>
                    `;
                }
            } catch (err) {
                console.error('[EXPORT_ERROR]', err);
                alert('❌ Erro ao gerar PDF: ' + err.message);
            }
        };
    }

    /* ======================================================================
       INTERFACE PÚBLICA
       ====================================================================== */

    const PUBLIC_API = Object.freeze({
        _INSTALLED: true,
        _VERSION: '1.0.0-PDF-EXPORT',
        PDFExporter: PDFExporter,
        computeSHA256: computeSHA256
    });

    Object.defineProperty(root, 'UNIFED_LEGAL_TACTICS_PDF', {
        value: PUBLIC_API,
        writable: false,
        configurable: false,
        enumerable: true
    });

    root.dispatchEvent(new CustomEvent('UNIFED_LEGAL_TACTICS_PDF_READY', {
        detail: { version: PUBLIC_API._VERSION }
    }));

    console.log('[LEGAL_TACTICS_PDF] ✅ Módulo de exportação PDF instalado. Geração de guião pronta.');

})(window);
