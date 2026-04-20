/**
 * ============================================================================
 * UNIFED-PROBATUM · legal_tactics_orchestrator_v1.0.js
 * ============================================================================
 * Versão      : v1.0.0-ORCHESTRATOR
 * Gerado em   : 2026-04-19
 *
 * ÂMBITO:
 *   Orquestrador central da Bateria de Contraditório.
 *   Coordena desbloqueio, sinalização de eventos, integração de módulos.
 *
 * SEQUÊNCIA DE CARREGAMENTO:
 *   1. legal_tactics_engine_v1.0.js (Motor + 50 questões)
 *   2. legal_tactics_ui_v1.0.js (Interface + Acordeão)
 *   3. legal_tactics_pdf_export_v1.0.js (Export PDF)
 *   4. legal_tactics_orchestrator_v1.0.js (Este arquivo)
 *
 * USO:
 *   <script src="legal_tactics_engine_v1.0.js"></script>
 *   <script src="legal_tactics_ui_v1.0.js"></script>
 *   <script src="legal_tactics_pdf_export_v1.0.js"></script>
 *   <script src="legal_tactics_orchestrator_v1.0.js"></script>
 *
 * INTEGRAÇÃO COM PANEL.HTML:
 *   Chamar: window.UNIFED_LEGAL_TACTICS_ORCHESTRATOR.unlockOnForensicComplete()
 *   Após: engine de perícia executado (ex: após botão EXECUTAR PERÍCIA)
 * ============================================================================
 */

(function _installLegalTacticsOrchestrator(root) {
    'use strict';

    if (root.UNIFED_LEGAL_TACTICS_ORCHESTRATOR && root.UNIFED_LEGAL_TACTICS_ORCHESTRATOR._INSTALLED === true) {
        console.info('[LEGAL_TACTICS_ORCHESTRATOR] Módulo já instalado.');
        return;
    }

    /* ======================================================================
       VERIFICAÇÃO DE DEPENDÊNCIAS
       ====================================================================== */

    class DependencyChecker {
        static checkAll() {
            const deps = {
                engine: root.UNIFED_LEGAL_TACTICS ? 'OK' : 'MISSING',
                ui: root.UNIFED_LEGAL_TACTICS_UI ? 'OK' : 'MISSING',
                pdf: root.UNIFED_LEGAL_TACTICS_PDF ? 'OK' : 'MISSING'
            };
            return deps;
        }

        static waitForAll(callback, timeout = 10000) {
            let elapsed = 0;
            const interval = setInterval(() => {
                const deps = this.checkAll();
                if (deps.engine === 'OK' && deps.ui === 'OK' && deps.pdf === 'OK') {
                    clearInterval(interval);
                    callback();
                } else if (elapsed > timeout) {
                    clearInterval(interval);
                    console.error('[DEPENDENCY_CHECKER] Timeout aguardando módulos. Estado:', deps);
                }
                elapsed += 100;
            }, 100);
        }
    }

    /* ======================================================================
       ORQUESTRADOR CENTRAL
       ====================================================================== */

    class LegalTacticsOrchestrator {
        constructor() {
            this.isInitialized = false;
            this.forensicState = {};
            this.unlockCallback = null;
            this._initialize();
        }

        /**
         * _initialize() → void
         * Aguarda todas as dependências e procede ao setup.
         */
        _initialize() {
            DependencyChecker.waitForAll(() => {
                this.isInitialized = true;
                this._setupEventListeners();
                console.log('[LEGAL_TACTICS_ORCHESTRATOR] ✓ Todas as dependências carregadas. Sistema pronto.');
            });
        }

        /**
         * _setupEventListeners() → void
         * Configura listeners para eventos de perícia.
         */
        _setupEventListeners() {
            // Event: Perícia executada
            root.addEventListener('UNIFED_PERICIA_EXECUTADA', (e) => {
                this.forensicState = e.detail || {};
                this._onForensicComplete(this.forensicState);
            });

            // Fallback: verificar se há dados no localStorage (para teste manual)
            root.addEventListener('UNIFED_FORENSIC_MANUAL_TRIGGER', (e) => {
                this._onForensicComplete(e.detail || {});
            });
        }

        /**
         * _onForensicComplete(forensicData) → void
         * Chamado quando perícia termina. Desbloqueia painel.
         */
        _onForensicComplete(forensicData) {
            console.log('[LEGAL_TACTICS_ORCHESTRATOR] Perícia completada. Dados:', forensicData);
            this.unlockPanel(forensicData);
        }

        /**
         * unlockPanel(forensicData) → void
         * Desbloqueia painel de contraditório com base em dados forenses.
         * @param {Object} forensicData - {discrepancia_c2, comissaoIndevida, etc}
         */
        unlockPanel(forensicData) {
            if (!this.isInitialized) {
                console.warn('[LEGAL_TACTICS_ORCHESTRATOR] Sistema ainda não inicializado.');
                return;
            }

            // Chamar desbloqueio na UI
            if (root.UNIFED_LEGAL_TACTICS_UI && typeof root.UNIFED_LEGAL_TACTICS_UI.unlockPanel === 'function') {
                root.UNIFED_LEGAL_TACTICS_UI.unlockPanel(forensicData);
            }

            // Dispatch evento de confirmação
            root.dispatchEvent(new CustomEvent('UNIFED_CONTRADICTORY_UNLOCKED', {
                detail: {
                    timestamp: new Date().toISOString(),
                    forensicData: forensicData
                }
            }));

            console.log('[LEGAL_TACTICS_ORCHESTRATOR] ✓ Painel de contraditório desbloqueado.');
        }

        /**
         * triggerSmartSelection() → void
         * Ativa seleção inteligente baseada em discrepâncias.
         */
        triggerSmartSelection() {
            if (root.UNIFED_LEGAL_TACTICS_UI && typeof root.UNIFED_LEGAL_TACTICS_UI.selectSmartQuestions === 'function') {
                root.UNIFED_LEGAL_TACTICS_UI.selectSmartQuestions();
            }
        }

        /**
         * exportGuiao(selectedQuestionIds) → Promise<Blob>
         * Exporta guião técnico em PDF.
         */
        async exportGuiao(selectedQuestionIds) {
            if (!root.UNIFED_LEGAL_TACTICS_PDF) {
                throw new Error('Módulo PDF não carregado.');
            }

            const metadata = {
                caseId: this.forensicState.caseId || 'CASE-UNIFED-' + Date.now(),
                perito: this.forensicState.perito || 'Sistema UNIFED Probatum',
                data: new Date().toLocaleDateString('pt-PT'),
                discrepancia: this.forensicState.discrepancia_c2 || '€ 0,00',
                periodo: this.forensicState.periodo || 'N/A'
            };

            const exporter = new root.UNIFED_LEGAL_TACTICS_PDF.PDFExporter();
            return exporter.generatePDF(selectedQuestionIds, metadata);
        }

        /**
         * summary() → Object
         * Retorna sumário do estado atual.
         */
        summary() {
            return Object.freeze({
                initialized: this.isInitialized,
                dependencies: DependencyChecker.checkAll(),
                version: '1.0.0-ORCHESTRATOR',
                forensic_state: this.forensicState,
                timestamp: new Date().toISOString()
            });
        }
    }

    /* ======================================================================
       INTEGRAÇÃO COM UNIFORMED_PROBATUM (HOOK MANUAL)
       ====================================================================== */

    /**
     * Hook para chamar após execução de perícia.
     * Uso no panel.html ou script.js:
     *   window.UNIFED_LEGAL_TACTICS_ORCHESTRATOR.unlockOnForensicComplete({
     *       discrepancia_c2: 2184.95,
     *       comissaoIndevida: 500.00,
     *       ...
     *   });
     */
    class OrchestrationHooks {
        static unlockOnForensicComplete(forensicData) {
            const orchestrator = root.UNIFED_LEGAL_TACTICS_ORCHESTRATOR;
            if (orchestrator && orchestrator.isInitialized) {
                orchestrator.unlockPanel(forensicData);
            } else {
                console.warn('[ORCHESTRATION_HOOKS] Orquestrador não está pronto.');
            }
        }

        static dispatchForensicEvent(forensicData) {
            root.dispatchEvent(new CustomEvent('UNIFED_PERICIA_EXECUTADA', {
                detail: forensicData
            }));
        }
    }

    /* ======================================================================
       INTERFACE PÚBLICA (NAMESPACE SELADO)
       ====================================================================== */

    const orchestratorInstance = new LegalTacticsOrchestrator();

    const PUBLIC_API = Object.freeze({
        _INSTALLED: true,
        _VERSION: '1.0.0-ORCHESTRATOR',
        _TIMESTAMP: new Date().toISOString(),

        // Instância singleton
        getInstance: function() {
            return orchestratorInstance;
        },

        // Métodos públicos
        unlockPanel: (data) => orchestratorInstance.unlockPanel(data),
        triggerSmartSelection: () => orchestratorInstance.triggerSmartSelection(),
        exportGuiao: (qIds) => orchestratorInstance.exportGuiao(qIds),
        summary: () => orchestratorInstance.summary(),

        // Hooks de integração
        unlockOnForensicComplete: (data) => OrchestrationHooks.unlockOnForensicComplete(data),
        dispatchForensicEvent: (data) => OrchestrationHooks.dispatchForensicEvent(data),

        // Verificação de dependências
        checkDependencies: () => DependencyChecker.checkAll(),
        waitForDependencies: (cb, timeout) => DependencyChecker.waitForAll(cb, timeout)
    });

    Object.defineProperty(root, 'UNIFED_LEGAL_TACTICS_ORCHESTRATOR', {
        value: PUBLIC_API,
        writable: false,
        configurable: false,
        enumerable: true
    });

    root.dispatchEvent(new CustomEvent('UNIFED_LEGAL_TACTICS_ORCHESTRATOR_READY', {
        detail: {
            version: PUBLIC_API._VERSION,
            timestamp: PUBLIC_API._TIMESTAMP
        }
    }));

    console.log('[LEGAL_TACTICS_ORCHESTRATOR] ✅ Orquestrador instalado v' + PUBLIC_API._VERSION + '. Bateria de Contraditório operacional.');

})(window);
