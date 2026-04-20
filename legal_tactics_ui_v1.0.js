/**
 * ============================================================================
 * UNIFED-PROBATUM · legal_tactics_ui_v1.0.js
 * ============================================================================
 * Versão      : v1.0.0-UI
 * Gerado em   : 2026-04-19
 *
 * ÂMBITO:
 *   Interface HTML/CSS para Bateria de Contraditório.
 *   Acordeão dinâmico, desbloqueio condicional pós-perícia.
 *
 * DEPENDÊNCIAS:
 *   · window.UNIFED_LEGAL_TACTICS (FASE 1)
 * ============================================================================
 */

(function _installLegalTacticsUI(root) {
    'use strict';

    if (root.UNIFED_LEGAL_TACTICS_UI && root.UNIFED_LEGAL_TACTICS_UI._INSTALLED === true) {
        console.info('[LEGAL_TACTICS_UI] Módulo já instalado.');
        return;
    }

    /* ======================================================================
       ELEMENTO HTML ESTRUTURADO (INJEÇÃO NO PANEL)
       ====================================================================== */

    const PANEL_HTML = `
    <div class="pure-card pure-card-contradictory" id="pureContradictoryCard" style="display: none; margin-top: 1.5rem;">
        <div class="pure-section-header">
            <div class="pure-section-title">
                <span id="pure-contradictory-icon" style="font-size: 1.4rem;">⚔️</span>
                <span id="pure-contradictory-title" style="font-size: 1.1rem; font-weight: 600; background: linear-gradient(135deg, #f97316, #ef4444); background-clip: text; -webkit-background-clip: text; color: transparent;">
                    BATERIA DE CONTRADITÓRIO: 50 QUESTÕES ESTRATÉGICAS
                </span>
                <span class="pure-badge-version" id="pure-contradictory-version">v1.0.0-LEGAL-TACTICS</span>
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: baseline;">
                <span id="pure-contradictory-status" style="font-size: 0.8rem; color: #34d399; font-weight: 600;">✓ SISTEMA ARMADO</span>
                <span id="pure-contradictory-count" style="font-size: 0.8rem; color: #94a3b8;">0/50 selecionadas</span>
            </div>
        </div>

        <div style="background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0; font-size: 0.9rem; color: #fca5a5;">
            <strong>⚡ Aviso Operacional:</strong> Este painel contém questões desenhadas para operacionalizar o <strong>Direito ao Contraditório (Art. 327.º CPP)</strong>. 
            Recomenda-se revisão por advogado especializado antes de audição em tribunal.
        </div>

        <div id="pure-contradictory-filters" style="display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem; padding: 1rem; background: rgba(15, 23, 42, 0.6); border-radius: 0.75rem;">
            <button onclick="UNIFED_LEGAL_TACTICS_UI.filterByPriority('ALL')" class="pure-filter-btn" id="filter-all" style="background: #3b82f6; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; font-size: 0.85rem;">
                📋 Todas (50)
            </button>
            <button onclick="UNIFED_LEGAL_TACTICS_UI.filterByPriority('CRÍTICO')" class="pure-filter-btn" id="filter-critico" style="background: #ef4444; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; font-size: 0.85rem;">
                🔴 Críticas (20)
            </button>
            <button onclick="UNIFED_LEGAL_TACTICS_UI.filterByPriority('ALTO')" class="pure-filter-btn" id="filter-alto" style="background: #f97316; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; font-size: 0.85rem;">
                🟠 Alto (30)
            </button>
            <button onclick="UNIFED_LEGAL_TACTICS_UI.selectSmartQuestions()" class="pure-filter-btn" style="background: #10b981; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; font-size: 0.85rem;">
                🧠 Seleção Inteligente
            </button>
            <button onclick="UNIFED_LEGAL_TACTICS_UI.deselectAll()" class="pure-filter-btn" style="background: #6b7280; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; font-size: 0.85rem;">
                ✗ Desselecionar Tudo
            </button>
        </div>

        <div id="pure-contradictory-accordion-container" style="display: flex; flex-direction: column; gap: 1rem;">
            <!-- Acordeão será populado dinamicamente -->
        </div>

        <div style="display: flex; gap: 1rem; margin-top: 2rem; flex-wrap: wrap;">
            <button onclick="UNIFED_LEGAL_TACTICS_UI.exportPDF()" class="pure-export-btn" style="flex: 1; min-width: 200px; background: #10b981; color: white; border: none; padding: 0.75rem; border-radius: 0.75rem; cursor: pointer; font-weight: 600; font-size: 0.95rem;">
                📄 EXPORTAR GUIÃO DE AUDIÊNCIA (PDF)
            </button>
            <button onclick="UNIFED_LEGAL_TACTICS_UI.toggleStats()" class="pure-stats-btn" style="flex: 1; min-width: 200px; background: #6366f1; color: white; border: none; padding: 0.75rem; border-radius: 0.75rem; cursor: pointer; font-weight: 600; font-size: 0.95rem;">
                📊 ESTATÍSTICAS
            </button>
        </div>

        <div id="pure-contradictory-stats" style="display: none; margin-top: 1.5rem; padding: 1rem; background: rgba(99, 102, 241, 0.1); border-radius: 0.75rem; border-left: 3px solid #6366f1;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">
                <div style="text-align: center;">
                    <div style="font-size: 0.8rem; color: #94a3b8; text-transform: uppercase;">Eixo A (Custódia)</div>
                    <div id="stat-eixo-a" style="font-size: 1.8rem; font-weight: 700; color: #3b82f6; font-family: monospace;">0/10</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 0.8rem; color: #94a3b8; text-transform: uppercase;">Eixo B (DAC7)</div>
                    <div id="stat-eixo-b" style="font-size: 1.8rem; font-weight: 700; color: #8b5cf6; font-family: monospace;">0/10</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 0.8rem; color: #94a3b8; text-transform: uppercase;">Eixo C (Nexus)</div>
                    <div id="stat-eixo-c" style="font-size: 1.8rem; font-weight: 700; color: #f97316; font-family: monospace;">0/10</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 0.8rem; color: #94a3b8; text-transform: uppercase;">Eixo D (Algoritmo)</div>
                    <div id="stat-eixo-d" style="font-size: 1.8rem; font-weight: 700; color: #06b6d4; font-family: monospace;">0/10</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 0.8rem; color: #94a3b8; text-transform: uppercase;">Eixo E (RGIT)</div>
                    <div id="stat-eixo-e" style="font-size: 1.8rem; font-weight: 700; color: #ef4444; font-family: monospace;">0/10</div>
                </div>
            </div>
        </div>

        <div id="pure-contradictory-export-status" style="display: none; margin-top: 1.5rem; padding: 1rem; background: rgba(16, 185, 129, 0.1); border-radius: 0.75rem; border-left: 3px solid #10b981; color: #10b981; font-size: 0.9rem;">
            <!-- Status de export será atualizado aqui -->
        </div>
    </div>
    `;

    const STYLES = `
    .pure-card-contradictory {
        background: rgba(10, 14, 23, 0.95) !important;
        border: 1.5px solid rgba(239, 68, 68, 0.3) !important;
        box-shadow: 0 0 20px rgba(239, 68, 68, 0.1) !important;
    }

    .pure-accordion-item {
        background: rgba(30, 41, 59, 0.8);
        border: 1px solid rgba(71, 85, 105, 0.4);
        border-radius: 0.75rem;
        overflow: hidden;
        transition: all 0.2s ease;
    }

    .pure-accordion-item.active {
        border-color: rgba(239, 68, 68, 0.6);
        box-shadow: 0 0 10px rgba(239, 68, 68, 0.15);
    }

    .pure-accordion-header {
        display: flex;
        align-items: center;
        padding: 1rem;
        background: rgba(20, 28, 45, 0.9);
        cursor: pointer;
        user-select: none;
        transition: background 0.15s ease;
        gap: 0.75rem;
    }

    .pure-accordion-header:hover {
        background: rgba(30, 41, 59, 0.95);
    }

    .pure-accordion-checkbox {
        width: 20px;
        height: 20px;
        cursor: pointer;
        accent-color: #ef4444;
    }

    .pure-accordion-title {
        flex: 1;
        font-weight: 600;
        font-size: 0.95rem;
        color: #e2e8f0;
    }

    .pure-accordion-priority {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .pure-accordion-priority.critico {
        background: rgba(239, 68, 68, 0.2);
        color: #fca5a5;
        border: 1px solid rgba(239, 68, 68, 0.4);
    }

    .pure-accordion-priority.alto {
        background: rgba(249, 115, 22, 0.2);
        color: #fbd38a;
        border: 1px solid rgba(249, 115, 22, 0.4);
    }

    .pure-accordion-toggle {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease;
        color: #94a3b8;
    }

    .pure-accordion-item.active .pure-accordion-toggle {
        transform: rotate(180deg);
    }

    .pure-accordion-content {
        display: none;
        padding: 0;
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease, padding 0.3s ease;
    }

    .pure-accordion-item.active .pure-accordion-content {
        display: block;
        max-height: 1000px;
        padding: 1rem;
        border-top: 1px solid rgba(71, 85, 105, 0.3);
        background: rgba(15, 20, 30, 0.8);
    }

    .pure-question-text {
        font-size: 0.95rem;
        line-height: 1.5;
        color: #cbd5e6;
        margin-bottom: 0.75rem;
    }

    .pure-question-norma {
        font-size: 0.8rem;
        color: #94a3b8;
        background: rgba(71, 85, 105, 0.2);
        padding: 0.5rem 0.75rem;
        border-radius: 0.5rem;
        margin-bottom: 0.75rem;
        border-left: 2px solid #3b82f6;
    }

    .pure-question-implicacao {
        font-size: 0.85rem;
        color: #fca5a5;
        background: rgba(239, 68, 68, 0.1);
        padding: 0.75rem;
        border-radius: 0.5rem;
        margin-bottom: 0.5rem;
        border-left: 2px solid #ef4444;
    }

    .pure-question-contraditorio {
        font-size: 0.85rem;
        color: #86efac;
        background: rgba(16, 185, 129, 0.1);
        padding: 0.75rem;
        border-radius: 0.5rem;
        border-left: 2px solid #10b981;
    }

    .pure-filter-btn:hover {
        opacity: 0.9;
        transform: translateY(-2px);
    }

    .pure-export-btn:hover, .pure-stats-btn:hover {
        opacity: 0.9;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
    `;

    /* ======================================================================
       GERENCIAMENTO DE UI
       ====================================================================== */

    class LegalTacticsUI {
        constructor() {
            this.engine = null;
            this.selectedQuestions = new Set();
            this.currentFilter = 'ALL';
            this.isUnlocked = false;
            this._waitForEngine();
        }

        _waitForEngine() {
            if (root.UNIFED_LEGAL_TACTICS) {
                this.engine = root.UNIFED_LEGAL_TACTICS.getInstance();
                this._injectStyles();
                this._injectHTML();
                this._attachEventListeners();
            } else {
                root.addEventListener('UNIFED_LEGAL_TACTICS_READY', () => {
                    this.engine = root.UNIFED_LEGAL_TACTICS.getInstance();
                    this._injectStyles();
                    this._injectHTML();
                    this._attachEventListeners();
                }, { once: true });
            }
        }

        _injectStyles() {
            const styleEl = document.createElement('style');
            styleEl.textContent = STYLES;
            document.head.appendChild(styleEl);
        }

        _injectHTML() {
            // Encontrar painel pai (pure-container)
            const parentPanel = document.querySelector('.pure-container');
            if (parentPanel) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = PANEL_HTML;
                const cardEl = tempDiv.firstElementChild;
                parentPanel.appendChild(cardEl);
            }
        }

        _attachEventListeners() {
            root.addEventListener('UNIFED_PERICIA_EXECUTADA', (e) => {
                this._unlockPanel(e.detail || {});
            });
        }

        /**
         * _unlockPanel(forensicData) → void
         * Desbloqueio visual e lógico pós-perícia.
         */
        _unlockPanel(forensicData) {
            const card = document.getElementById('pureContradictoryCard');
            if (card) {
                card.style.display = 'block';
                this.isUnlocked = true;

                // Renderizar acordeão com todas as questões
                this._renderAccordion(this.engine.getAllQuestions());

                // Se há discrepância, seleção inteligente
                if (forensicData.discrepancia_c2 || forensicData.comissaoIndevida) {
                    setTimeout(() => this.selectSmartQuestions(), 500);
                }

                console.log('[LEGAL_TACTICS_UI] ✓ Painel desbloqueado após perícia executada.');
            }
        }

        /**
         * _renderAccordion(questions) → void
         * Renderiza acordeão HTML com questões.
         */
        _renderAccordion(questions) {
            const container = document.getElementById('pure-contradictory-accordion-container');
            if (!container) return;

            container.innerHTML = '';

            const eixos = ['a', 'b', 'c', 'd', 'e'];
            const eixoLabels = {
                a: '🔒 Eixo A: Cadeia de Custódia (ISO 27037)',
                b: '📊 Eixo B: Triangulação DAC7 vs SAF-T',
                c: '⚔️ Eixo C: Nexus-Zero / Apropriação Indevida',
                d: '🔧 Eixo D: Algoritmo & Falibilidade',
                e: '⚖️ Eixo E: Art. 119.º RGIT / Responsabilidade Criminal'
            };

            eixos.forEach(eixo => {
                const eixoQuestions = questions.filter(q => q.id.startsWith(eixo.toUpperCase()));

                const eixoGroup = document.createElement('div');
                eixoGroup.style.marginBottom = '1.5rem';

                const eixoHeader = document.createElement('div');
                eixoHeader.style.cssText = 'font-size: 1rem; font-weight: 700; color: #cbd5e6; margin-bottom: 0.75rem; padding-bottom: 0.5rem; border-bottom: 1px solid rgba(71, 85, 105, 0.3);';
                eixoHeader.textContent = eixoLabels[eixo];
                eixoGroup.appendChild(eixoHeader);

                eixoQuestions.forEach((q, idx) => {
                    const item = document.createElement('div');
                    item.className = 'pure-accordion-item';
                    item.id = 'accordion-' + q.id;

                    const headerHTML = `
                    <div class="pure-accordion-header" onclick="UNIFED_LEGAL_TACTICS_UI.toggleAccordion('${q.id}')">
                        <input type="checkbox" class="pure-accordion-checkbox" id="cb-${q.id}" onclick="event.stopPropagation(); UNIFED_LEGAL_TACTICS_UI.toggleQuestion('${q.id}')">
                        <div class="pure-accordion-title">${q.id} — ${q.categoria}</div>
                        <span class="pure-accordion-priority ${q.prioridade === 'CRÍTICO' ? 'critico' : 'alto'}">
                            ${q.prioridade === 'CRÍTICO' ? '🔴' : '🟠'} ${q.prioridade}
                        </span>
                        <div class="pure-accordion-toggle">▼</div>
                    </div>
                    <div class="pure-accordion-content">
                        <div class="pure-question-text"><strong>Questão:</strong> ${q.questao}</div>
                        <div class="pure-question-norma"><strong>Norma:</strong> ${q.norma}</div>
                        <div class="pure-question-implicacao"><strong>⚠️ Implicação:</strong> ${q.implicacao}</div>
                        <div class="pure-question-contraditorio"><strong>🛡️ Contraditório:</strong> ${q.contraditorio}</div>
                    </div>
                    `;

                    item.innerHTML = headerHTML;
                    eixoGroup.appendChild(item);
                });

                container.appendChild(eixoGroup);
            });
        }

        toggleAccordion(questionId) {
            const item = document.getElementById('accordion-' + questionId);
            if (item) {
                item.classList.toggle('active');
            }
        }

        toggleQuestion(questionId) {
            const checkbox = document.getElementById('cb-' + questionId);
            if (checkbox && checkbox.checked) {
                this.selectedQuestions.add(questionId);
            } else {
                this.selectedQuestions.delete(questionId);
            }
            this._updateCounter();
        }

        _updateCounter() {
            const countEl = document.getElementById('pure-contradictory-count');
            if (countEl) {
                countEl.textContent = this.selectedQuestions.size + '/50 selecionadas';
            }
            this._updateStats();
        }

        _updateStats() {
            const stats = {
                A: 0, B: 0, C: 0, D: 0, E: 0
            };
            this.selectedQuestions.forEach(id => {
                const eixo = id.charAt(0);
                stats[eixo]++;
            });
            ['A', 'B', 'C', 'D', 'E'].forEach(eixo => {
                const el = document.getElementById('stat-eixo-' + eixo.toLowerCase());
                if (el) el.textContent = stats[eixo] + '/10';
            });
        }

        filterByPriority(priority) {
            this.currentFilter = priority;
            const all = this.engine.getAllQuestions();
            const filtered = priority === 'ALL' ? all : all.filter(q => q.prioridade === priority);
            // Mostrar/ocultar apenas as relevantes
            document.querySelectorAll('.pure-accordion-item').forEach(item => {
                const id = item.id.replace('accordion-', '');
                const q = all.find(x => x.id === id);
                if (filtered.includes(q)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        }

        selectSmartQuestions() {
            // Selecionar questões críticas por padrão
            const critical = this.engine.getQuestionsByPrioridade('CRÍTICO');
            this.selectedQuestions.clear();
            critical.forEach(q => {
                this.selectedQuestions.add(q.id);
                const cb = document.getElementById('cb-' + q.id);
                if (cb) cb.checked = true;
            });
            this._updateCounter();
        }

        deselectAll() {
            this.selectedQuestions.clear();
            document.querySelectorAll('.pure-accordion-checkbox').forEach(cb => cb.checked = false);
            this._updateCounter();
        }

        toggleStats() {
            const statsDiv = document.getElementById('pure-contradictory-stats');
            if (statsDiv) {
                statsDiv.style.display = statsDiv.style.display === 'none' ? 'block' : 'none';
            }
        }

        exportPDF() {
            if (this.selectedQuestions.size === 0) {
                alert('⚠️ Selecione pelo menos uma questão para exportar.');
                return;
            }

            const metadata = {
                caseId: 'CASE-2024-' + Date.now(),
                perito: 'Sistema UNIFED Probatum v13.12.3-PRO',
                data: new Date().toLocaleDateString('pt-PT'),
                discrepancia: '€ [conforme perícia]',
                periodo: 'Outubro 2024'
            };

            const guiao = this.engine.generateGuiaoAudiencia(Array.from(this.selectedQuestions), metadata);

            // Placeholder para PDF (será implementado em FASE 3)
            const statusEl = document.getElementById('pure-contradictory-export-status');
            if (statusEl) {
                statusEl.style.display = 'block';
                statusEl.innerHTML = `
                    <strong>✓ Guião Técnico Preparado</strong><br>
                    Questões: ${guiao.questoes_selecionadas.length}<br>
                    Eixos: A(${guiao.distribuicao_eixos.A}) B(${guiao.distribuicao_eixos.B}) C(${guiao.distribuicao_eixos.C}) D(${guiao.distribuicao_eixos.D}) E(${guiao.distribuicao_eixos.E})<br>
                    <em>A geração do PDF será acionada em breve. Integração com jsPDF em progresso...</em>
                `;
            }

            console.log('[EXPORT] Guião preparado:', guiao);
        }
    }

    /* ======================================================================
       INTERFACE PÚBLICA
       ====================================================================== */

    const uiInstance = new LegalTacticsUI();

    const PUBLIC_API = Object.freeze({
        _INSTALLED: true,
        _VERSION: '1.0.0-UI',

        // Métodos públicos
        toggleAccordion: (qId) => uiInstance.toggleAccordion(qId),
        toggleQuestion: (qId) => uiInstance.toggleQuestion(qId),
        filterByPriority: (p) => uiInstance.filterByPriority(p),
        selectSmartQuestions: () => uiInstance.selectSmartQuestions(),
        deselectAll: () => uiInstance.deselectAll(),
        toggleStats: () => uiInstance.toggleStats(),
        exportPDF: () => uiInstance.exportPDF(),

        // Método de desbloqueio (chamado manualmente ou por evento)
        unlockPanel: (data) => uiInstance._unlockPanel(data)
    });

    Object.defineProperty(root, 'UNIFED_LEGAL_TACTICS_UI', {
        value: PUBLIC_API,
        writable: false,
        configurable: false,
        enumerable: true
    });

    root.dispatchEvent(new CustomEvent('UNIFED_LEGAL_TACTICS_UI_READY', {
        detail: { version: PUBLIC_API._VERSION }
    }));

    console.log('[LEGAL_TACTICS_UI] ✅ Interface de tática jurídica instalada e ativa.');

})(window);
