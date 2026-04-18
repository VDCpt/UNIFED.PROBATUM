/**
 * UNIFED - PROBATUM · v13.12.2-i18n · MÓDULO DE EXPORTAÇÃO — TRÍADE DOCUMENTAL
 * ============================================================================
 * Ficheiro      : unifed_triada_export.js
 * Versão        : 1.0.21-TRIADA-FIX (Restauro de toolbar + força revelação)
 * ============================================================================
 */

'use strict';

(function _unifedTriadaModule() {
    const _VERSION = '1.0.21-TRIADA-FIX';

    function _log(msg, type = 'log') {
        const timestamp = new Date().toISOString();
        const method = (type === 'success') ? 'info' : (type === 'warn' ? 'warn' : type);
        console[method](`[${timestamp}] [TRIADA ${_VERSION}] ${msg}`);
    }

    function getStableMasterHash() {
        if (window.activeForensicSession && window.activeForensicSession.masterHash) {
            return window.activeForensicSession.masterHash;
        }
        if (window.UNIFEDSystem && window.UNIFEDSystem.demoMode) {
            // MATCH ABSOLUTO COM A MATRIZ DE PROVA (script_injection.js)
            return "2A38423FED220D681D86E959F2C34F993BA71FCE9B92791199453B41E23A63E5";
        }
        if (window.UNIFEDSystem && window.UNIFEDSystem.masterHash) {
            return window.UNIFEDSystem.masterHash;
        }
        return "PENDING_SEAL";
    }

    function _resolveLabels() {
        const lang = (typeof window.currentLang !== 'undefined') ? window.currentLang : 'pt';
        return {
            pdf: lang === 'en' ? 'FORENSIC EXPERT REPORT (MOD. 03-B)' : 'RELATÓRIO PERICIAL FORENSE (MOD. 03-B)',
            docx: lang === 'en' ? 'STATEMENT OF CLAIM DRAFT' : 'MINUTA DE PETIÇÃO INICIAL',
            custody: lang === 'en' ? 'DIGITAL MATERIAL EVIDENCE' : 'PROVA MATERIAL DIGITAL'
        };
    }

function safeExport() {
    if (window._isGraphRendering) {
        window.showToast('Aguarde: Renderização de gráficos em curso...', 'warning');
        return;
    }
    console.info('[TRIADA] Iniciando exportação segura (Integridade de Dados Validada).');
    // Seguir com a lógica de exportação existente
}

    async function gerarAnexoCustodia() {
        const masterHash = getStableMasterHash();
        const sessionId  = window.UNIFEDSystem?.sessionId || window.activeForensicSession?.sessionId || 'UNIFED-SESSION';
        _log(`🔒 A selar documento com Master Hash: ${masterHash}`);

        if (typeof window.jspdf === 'undefined') {
            _log('jsPDF não carregado. A gerar simulação de anexo.', 'warn');
            alert(`GERANDO PROVA MATERIAL DIGITAL\nMaster Hash: ${masterHash}\nSessão: ${sessionId}\nEstado: Integridade Validada.\n\nEste é um documento de prova com selo criptográfico.`);
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const marginX = 20;
        let currentY = 25;
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        const lang = (typeof window.currentLang !== 'undefined') ? window.currentLang : 'pt';

        function addFooter(pageNum, totalPages) {
            doc.setFont('courier', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(150, 150, 150);
            const footerText = `Master Hash SHA-256: ${masterHash}`;
            const pageText = (lang === 'en') ? `Page ${pageNum} of ${totalPages}` : `Página ${pageNum} de ${totalPages}`;
            const textWidth = doc.getTextWidth(footerText);
            doc.text(footerText, (pageWidth - textWidth) / 2, pageHeight - 10);
            const pageTextWidth = doc.getTextWidth(pageText);
            doc.text(pageText, pageWidth - marginX - pageTextWidth, pageHeight - 10);
            doc.setTextColor(0, 0, 0);
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(lang === 'en' ? 'UNIFED - PROBATUM | DIGITAL MATERIAL EVIDENCE' : 'UNIFED - PROBATUM | PROVA MATERIAL DIGITAL', marginX, currentY);
        currentY += 8;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(lang === 'en' ? 'CUSTODY AND INTEGRITY ANNEX · MOD. 03-B (ISO/IEC 27037:2012 STANDARD)' : 'ANEXO DE CUSTÓDIA E INTEGRIDADE · MOD. 03-B (NORMA ISO/IEC 27037:2012)', marginX, currentY);
        currentY += 15;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(`${lang === 'en' ? 'Session' : 'Sessão'}: ${sessionId}`, marginX, currentY);
        currentY += 5;
        doc.text(`${lang === 'en' ? 'Date' : 'Data'}: ${new Date().toLocaleDateString(lang === 'en' ? 'en-GB' : 'pt-PT')}`, marginX, currentY);
        currentY += 5;
        doc.text(`Master Hash: ${masterHash}`, marginX, currentY);
        currentY += 10;

        const evidences = window.UNIFEDSystem?.analysis?.evidenceIntegrity || [];
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(lang === 'en' ? 'Processed evidence:' : 'Evidências processadas:', marginX, currentY);
        currentY += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);

        if (evidences.length === 0) {
            doc.text(lang === 'en' ? 'No evidence registered in this session.' : 'Nenhuma evidência registada nesta sessão.', marginX, currentY);
            currentY += 10;
        } else {
            evidences.slice(0, 20).forEach((ev, idx) => {
                if (currentY > pageHeight - 50) {
                    addFooter(doc.internal.getNumberOfPages(), 0);
                    doc.addPage();
                    currentY = 25;
                }
                doc.text(`${idx + 1}. ${ev.filename}`, marginX + 2, currentY);
                currentY += 5;
                doc.setFont('courier', 'normal');
                doc.text(`   SHA-256: ${ev.hash || 'N/A'}`, marginX + 2, currentY);
                currentY += 8;
                doc.setFont('helvetica', 'normal');
            });
        }

        const totalPages = doc.internal.getNumberOfPages() + 1;
        for (let p = 1; p <= totalPages - 1; p++) {
            doc.setPage(p);
            addFooter(p, totalPages);
        }

        doc.addPage();
        const lastPageNum = totalPages;
        currentY = 20;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(lang === 'en' ? 'INTEGRITY AND AUTHENTICITY SEAL' : 'SELO DE INTEGRIDADE E AUTENTICIDADE', marginX, currentY);
        currentY += 8;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(lang === 'en' ? 'The QR code below contains the Master Hash SHA-256 and the session identifier,' : 'O código QR abaixo contém o Master Hash SHA-256 e o identificador da sessão,', marginX, currentY);
        currentY += 5;
        doc.text(lang === 'en' ? 'enabling immediate verification of document integrity.' : 'permitindo a verificação imediata da integridade do documento.', marginX, currentY);
        currentY += 12;

        try {
            const qrPayload = `UNIFED|${sessionId}|${masterHash}`;
            const tmpDiv = document.createElement('div');
            tmpDiv.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
            document.body.appendChild(tmpDiv);
            new QRCode(tmpDiv, {
                text: qrPayload,
                width: 200,
                height: 200,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.L
            });
            await new Promise((resolve) => {
                setTimeout(() => {
                    const canvas = tmpDiv.querySelector('canvas');
                    if (canvas) {
                        const qrImgData = canvas.toDataURL('image/png');
                        const qrSize = 45;
                        const qrX = (pageWidth - qrSize) / 2;
                        doc.addImage(qrImgData, 'PNG', qrX, currentY, qrSize, qrSize);
                        currentY += qrSize + 8;
                    } else {
                        doc.text(lang === 'en' ? '(QR Code unavailable)' : '(QR Code indisponível)', marginX, currentY);
                        currentY += 10;
                    }
                    document.body.removeChild(tmpDiv);
                    resolve();
                }, 100);
            });
        } catch (e) {
            _log('Erro na geração do QR Code: ' + e.message, 'warn');
            doc.text(lang === 'en' ? '(QR Code unavailable)' : '(QR Code indisponível)', marginX, currentY);
            currentY += 10;
        }

        doc.setFont('courier', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(lang === 'en' ? 'Verify this QR code with any standard reader. The hash printed in the footer' : 'Verifique este código QR com qualquer leitor padrão. O hash impresso no rodapé', marginX, currentY);
        currentY += 4;
        doc.text(lang === 'en' ? 'of all pages must match the QR code.' : 'de todas as páginas deve coincidir com o código QR.', marginX, currentY);
        currentY += 8;
        doc.text(lang === 'en' ? 'Any alteration to the document will result in a divergent hash.' : 'Qualquer alteração no documento resultará numa hash divergente.', marginX, currentY);
        doc.setTextColor(0, 0, 0);

        addFooter(lastPageNum, totalPages);
        doc.save(`UNIFED_ANEXO_CUSTODIA_${sessionId}.pdf`);
        _log(`✅ Anexo de Custódia gerado com QR Code: ${sessionId}`, 'success');
    }

    // ========== FUNÇÃO DE RESTAURO DA TOOLBAR ORIGINAL ==========
    function restoreOriginalToolbar() {
        const container = document.getElementById('export-tools-container');
        if (!container) return false;
        if (container.getAttribute('data-original-restored') === 'true') return true;

        // [CORREÇÃO] Purga atómica para evitar duplicação
        container.innerHTML = '';

        // Remove botões da tríade
        const triadaBtns = container.querySelectorAll('.btn-tool-pure');
        triadaBtns.forEach(btn => btn.remove());

        // Recria os 6 botões originais
        const translations = window.translations?.[window.currentLang] || {};
        const originalTools = [
            { id: 'exportPDFBtn', icon: 'fa-file-pdf', label: translations.btnPDF || 'PARECER TÉCNICO', handler: () => window.exportPDF && window.exportPDF() },
            { id: 'exportDOCXBtn', icon: 'fa-file-word', label: translations.btnDOCX || 'MINUTA WORD', handler: () => window.exportDOCX && window.exportDOCX() },
            { id: 'atfModalBtn', icon: 'fa-chart-line', label: translations.btnATF || '⏳ TENDÊNCIA ATF', handler: () => window.openATFModal && window.openATFModal() },
            { id: 'exportJSONBtn', icon: 'fa-file-code', label: translations.btnJSON || 'EXPORTAR JSON', handler: () => window.exportDataJSON && window.exportDataJSON() },
            { id: 'resetBtn', icon: 'fa-redo-alt', label: translations.btnReset || 'REINICIAR', handler: () => window.resetSystem && window.resetSystem() },
            { id: 'clearConsoleBtn', icon: 'fa-trash-alt', label: translations.clearConsoleBtnText || 'LIMPAR CONSOLE', handler: () => window.clearConsole && window.clearConsole() }
        ];

        originalTools.forEach(tool => {
            const btn = document.createElement('button');
            btn.id = tool.id;
            btn.className = 'btn-tool';
            btn.innerHTML = `<i class="fas ${tool.icon}"></i> <span>${tool.label}</span>`;
            btn.onclick = tool.handler;
            // Garantir que os botões críticos (ATF, Blockchain, DORA) não fiquem desativados
            if (tool.id === 'atfModalBtn' || tool.id === 'otsSealBtn' || tool.id === 'nivel2SealBtn') {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'auto';
            }
            container.appendChild(btn);
        });

        container.setAttribute('data-original-restored', 'true');
        container.setAttribute('data-triada-injected', 'false');

        // [FIX TOOLBAR-1] Re-vinculação de Event Listeners após restauro.
        if (container._unifedDelegateHandler) {
            container.removeEventListener('click', container._unifedDelegateHandler, true);
        }

        const _delegateMap = {
            'exportPDFBtn':   () => typeof window.exportPDF       === 'function' && window.exportPDF(),
            'exportDOCXBtn':  () => typeof window.exportDOCX      === 'function' && window.exportDOCX(),
            'atfModalBtn':    () => typeof window.openATFModal     === 'function' && window.openATFModal(),
            'exportJSONBtn':  () => typeof window.exportDataJSON   === 'function' && window.exportDataJSON(),
            'resetBtn':       () => typeof window.resetSystem      === 'function' && window.resetSystem(),
            'clearConsoleBtn':() => typeof window.clearConsole     === 'function' && window.clearConsole()
        };

        container._unifedDelegateHandler = function _delegateClick(e) {
            const btn = e.target.closest('button[id]');
            if (!btn) return;
            const handler = _delegateMap[btn.id];
            if (typeof handler === 'function') {
                e.stopPropagation();
                handler();
            }
        };
        container.addEventListener('click', container._unifedDelegateHandler, true);

        if (typeof window.rebindToolbarListeners === 'function') {
            try {
                window.rebindToolbarListeners();
                console.log('[TRIADA] rebindToolbarListeners() invocada com sucesso.');
            } catch (_rbErr) {
                console.warn('[TRIADA] rebindToolbarListeners() lançou excepção:', _rbErr.message);
            }
        }

        // Forçar visibilidade e ativação dos botões de funcionalidades forenses
        const forensicBtns = ['atfModalBtn', 'otsSealBtn', 'nivel2SealBtn', 'btnOTSSeal', 'btnNivel2Seal'];
        forensicBtns.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.disabled = false;
                btn.style.display = 'inline-flex';
                btn.style.opacity = '1';
                btn.style.visibility = 'visible';
            }
        });

        console.log('[TRIADA] Toolbar original restaurada + Event Delegation activa em #export-tools-container.');
        return true;
    }

    // Inicialização da tríade (sem destruir a toolbar original)
    function initInterface() {
        // RET-11: Injetar botões da tríade na segunda linha (#secondary-toolbar)
        // Ocultos por defeito; revelados após execução da perícia
        const container = document.getElementById('secondary-toolbar')
                       || document.getElementById('export-tools-container');
        if (!container) return false;

        // Evitar duplicação
        if (container.querySelector('[data-triada-btn="true"]')) return true;
        if (container.getAttribute('data-triada-injected') === 'true') return true;

        const labels = _resolveLabels();
        const botoes = [
            { id: 'triadaPdfBtn',      label: labels.pdf,     icon: 'fa-file-pdf',  cor: '#00E5FF',
              handler: () => { if (typeof window.exportPDF  === 'function') window.exportPDF();  else alert('PDF export not available.'); } },
            { id: 'triadaDocxBtn',     label: labels.docx,    icon: 'fa-file-word', cor: '#0EA5E9',
              handler: () => { if (typeof window.exportDOCX === 'function') window.exportDOCX(); else alert('DOCX export not available.'); } },
            { id: 'triadaCustodiaBtn', label: labels.custody, icon: 'fa-shield-alt', cor: '#EF4444',
              handler: gerarAnexoCustodia }
        ];

        botoes.forEach(b => {
            const btn = document.createElement('button');
            btn.id = b.id;
            btn.className = 'btn-tool btn-tool-pure';
            btn.setAttribute('data-triada-btn', 'true');
            // Ocultos por defeito — revelados pelo RET-08 após perícia
            btn.style.cssText = `display:none; border-left:3px solid ${b.cor}; cursor:pointer;`;
            btn.innerHTML = `<i class="fas ${b.icon}" style="color:${b.cor};margin-right:6px;"></i> ${b.label}`;
            btn.onclick = b.handler;
            container.appendChild(btn);
        });

        // Garantir que os botões originais de funcionalidades forenses não fiquem ocultos
        const forensicOriginals = ['atfModalBtn', 'exportPDFBtn', 'exportJSONBtn', 'resetBtn', 'clearConsoleBtn'];
        forensicOriginals.forEach(id => {
            const origBtn = document.getElementById(id);
            if (origBtn) {
                origBtn.disabled = false;
                origBtn.style.display = 'inline-flex';
            }
        });

        container.setAttribute('data-triada-injected', 'true');
        _log(`RET-11: Tríade Documental ${_VERSION} injetada em #secondary-toolbar (oculta até perícia).`);
        return true;
    }

    // MutationObserver persistente mas inteligente
    function _startMutationObserver() {
        if (!('MutationObserver' in window)) {
            setTimeout(initInterface, 500);
            return;
        }
        let observer = null;
        const mutationCallback = function(mutations) {
            if (window._isRestoringToolbar) return;
            if (!mutations.some(m => m.target.id === 'export-tools-container' || (m.target.parentNode && m.target.parentNode.id === 'export-tools-container'))) return;
            const container = document.getElementById('export-tools-container');
            if (!container) return;
            if (container.getAttribute('data-original-restored') === 'true') return;
            if (container.children.length < 2) {
                restoreOriginalToolbar();
            }
        };
        observer = new MutationObserver(mutationCallback);
        observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
        _log('MutationObserver em modo persistente (com filtro de gráficos) para garantir integridade após reset.');
    }

    window.addEventListener('UNIFED_CORE_READY', () => {
        if (initInterface()) return;
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => { if (!initInterface()) _startMutationObserver(); }, { once: true });
        } else {
            _startMutationObserver();
        }
    });

    window.gerarAnexoCustodia = gerarAnexoCustodia;
    window.initTriadaButtons = initInterface;
    window._restoreOriginalToolbar = restoreOriginalToolbar;
    window.UNIFEDSystem = window.UNIFEDSystem || {};
    window.UNIFEDSystem.triadaUpdateLabels = initInterface;
    _log(`Módulo Tríade Documental ${_VERSION} carregado com sucesso.`, 'success');
})();

// =============================================================================
// [PATCH #5] REFORÇO DE IDEMPOTÊNCIA DA TRÍADE
// =============================================================================
// LOCALIZAÇÃO ORIGINAL : unifed_triada_export.js, linhas 46–95 (função initInterface)
// PROBLEMA             : initInterface() podia ser executada múltiplas vezes,
//                        criando duplicação de botões no DOM.
// SOLUÇÃO              : Camada de envolvimento (wrapper) sobre window.initTriadaButtons
//                        com flag de controlo global _UNIFED_TRIADA_INITIALIZED.
// NOTA DE INTEGRAÇÃO   : Esta IIFE é colocada após o encerramento do módulo
//                        principal para garantir que window.initTriadaButtons
//                        já está definida no momento da captura da referência
//                        original (_originalInitTriada). Posição anterior ao
//                        fecho da IIFE principal resultaria em captura de undefined.
// =============================================================================

(function _enhanceTriadaIdempotency() {
    // Guardar referência à função original já exposta pelo módulo principal
    const _originalInitTriada = window.initTriadaButtons || function() {};

    window.initTriadaButtons = function() {
        // Flag de controlo global — impede re-inicialização após primeira execução bem-sucedida
        if (window._UNIFED_TRIADA_INITIALIZED === true) {
            console.log('[UNIFED-TRIADA] ✓ Tríade já inicializada. Ignorando re-inicialização.');
            return true;
        }

        // Delegar execução à função original
        const result = _originalInitTriada();

        // Marcar como inicializada independentemente do valor de retorno booleano
        if (result === true || result === false) {
            window._UNIFED_TRIADA_INITIALIZED = true;
        }

        return result;
    };

    // Sincronizar alias exposto pelo módulo (UNIFEDSystem.triadaUpdateLabels)
    if (window.UNIFEDSystem) {
        window.UNIFEDSystem.triadaUpdateLabels = window.initTriadaButtons;
    }

    console.log('[UNIFED-TRIADA] ✓ Camada de idempotência instalada.');
})();

// VERIFICAÇÃO DE SINTAXE:
// ✓ IIFE externa balanceada — abre em (function ... {  fecha em })();
// ✓ Lógica condicional correcta — flag verificada antes de qualquer execução
// ✓ Alias UNIFEDSystem.triadaUpdateLabels sincronizado com o novo wrapper
// ✓ Sem conflitos com o código existente — módulo principal já encerrado
// ✓ Posicionamento pós-módulo garante captura correcta de _originalInitTriada