/**
 * ============================================================================
 * UNIFED-PROBATUM · unifed_orchestrator.js
 * ============================================================================
 * Versão      : v1.0.0-ORCHESTRATOR
 * Gerado em   : 2026-04-19
 * Conformidade: DORA (UE) 2022/2554 · Art. 125.º CPP · ISO/IEC 27037:2012
 *
 * ÂMBITO:
 *   Módulo de integração das FASES 1, 2 e 3.
 *   Aguarda os eventos de prontidão de cada módulo antes de orquestrar
 *   o fluxo completo. Expõe window.UNIFED_ORCHESTRATOR.
 *
 * ORDEM DE CARREGAMENTO REQUERIDA (após unifed_access_control.js):
 *   1. unifed_custody_engine.js       (FASE 1)
 *   2. unifed_contradictory_engine.js (FASE 2)
 *   3. unifed_holographic_dashboard.js (FASE 3)
 *   4. unifed_orchestrator.js         (este ficheiro — deve ser ÚLTIMO)
 *
 * USO:
 *   window.UNIFED_ORCHESTRATOR.run(caseData) → Promise<FullResult>
 * ============================================================================
 */

(function _installOrchestrator(root) {
    'use strict';

    if (root.UNIFED_ORCHESTRATOR && root.UNIFED_ORCHESTRATOR._INSTALLED) return;

    /* ── Aguardar os três módulos ────────────────────────────────────────── */
    const _readyFlags = { CUSTODY: false, CONTRADICTORY: false, HOLOGRAPHIC: false };

    function _checkAllReady() {
        return _readyFlags.CUSTODY && _readyFlags.CONTRADICTORY && _readyFlags.HOLOGRAPHIC;
    }

    root.addEventListener('UNIFED_CUSTODY_READY',        function () { _readyFlags.CUSTODY       = true; _tryInit(); }, { once: true });
    root.addEventListener('UNIFED_CONTRADICTORY_READY',  function () { _readyFlags.CONTRADICTORY  = true; _tryInit(); }, { once: true });
    root.addEventListener('UNIFED_HOLOGRAPHIC_READY',    function () { _readyFlags.HOLOGRAPHIC    = true; _tryInit(); }, { once: true });

    /* Verificar se já estão instalados (carregamento síncrono) */
    if (root.UNIFED_CUSTODY       && root.UNIFED_CUSTODY._INSTALLED)       _readyFlags.CUSTODY      = true;
    if (root.UNIFED_CONTRADICTORY && root.UNIFED_CONTRADICTORY._INSTALLED) _readyFlags.CONTRADICTORY = true;
    if (root.UNIFED_HOLOGRAPHIC   && root.UNIFED_HOLOGRAPHIC._INSTALLED)   _readyFlags.HOLOGRAPHIC  = true;

    function _tryInit() {
        if (!_checkAllReady()) return;

        const PUBLIC_API = Object.freeze({
            _INSTALLED: true,
            _VERSION:   '1.0.0-ORCHESTRATOR',

            /**
             * run(caseData, uiConfig) → Promise<FullForensicResult>
             *
             * caseData: {
             *   manifest:      Array<{file, sha256}>,   // do MANIFEST_SHA256.json
             *   payload:       Object,                   // dados brutos do caso
             *   forensicState: Object,                   // estado para contraditório
             *   discrepancias: Array,                    // discrepâncias DAC7
             *   timeSeries:    Array,                    // {timestamp, amount}
             *   monthlyData:   Array,                    // {month, amount}
             *   sankeyNodes:   Array,
             *   sankeyEdges:   Array
             * }
             *
             * uiConfig: {
             *   authenticated:        boolean,
             *   hydrationContainerId: string,
             *   sankey3dCanvasId:     string,
             *   heatmapCanvasId:      string
             * }
             */
            run: async function (caseData, uiConfig) {
                console.log('════════════════════════════════════════════════════════════');
                console.log('[ORCHESTRATOR] Iniciando pipeline forense completo...');
                console.log('════════════════════════════════════════════════════════════');

                /* ── FASE 1: Custódia ─────────────────────────────────────── */
                const manifestHashes = (caseData.manifest || []).map(function (f) { return f.sha256; });
                const pot = new root.UNIFED_CUSTODY.ProofOfTruthProtocol(
                    manifestHashes.length > 0 ? manifestHashes : ['0'.repeat(64)]
                );
                const potResult = await pot.execute(caseData.payload || { _empty: true });
                console.log('[ORCHESTRATOR] FASE 1 concluída — PoT hash:', potResult.canonicalHash.slice(0, 16) + '...');

                /* ── FASE 2: Contraditório + DAC7 ────────────────────────── */
                const analysisResult = await root.UNIFED_CONTRADICTORY.runFullAnalysis(
                    caseData.forensicState  || {},
                    caseData.discrepancias  || [],
                    caseData.timeSeries     || []
                );
                console.log('[ORCHESTRATOR] FASE 2 concluída —',
                    analysisResult.simulacao_contraditorio.vectores_ataque.length,
                    'vectores de ataque gerados.'
                );

                /* ── FASE 3: Dashboard Holográfico ───────────────────────── */
                await root.UNIFED_HOLOGRAPHIC.initDashboard({
                    ...(uiConfig || {}),
                    potResult,
                    sankeyNodes:  caseData.sankeyNodes  || _defaultSankeyNodes(),
                    sankeyEdges:  caseData.sankeyEdges  || _defaultSankeyEdges(),
                    monthlyData:  caseData.monthlyData  || [],
                    projection6m: analysisResult.analise_timeseries
                        ? analysisResult.analise_timeseries.projection_6m
                        : []
                });
                console.log('[ORCHESTRATOR] FASE 3 concluída — Dashboard holográfico activo.');

                const fullResult = Object.freeze({
                    fase1_custody:       potResult,
                    fase2_contradictory: analysisResult,
                    timestamp:           new Date().toISOString(),
                    conformidade:        [
                        'DORA (UE) 2022/2554',
                        'Art. 125.º CPP',
                        'ISO/IEC 27037:2012',
                        'DAC7 (UE) 2021/514',
                        'Art. 74 LGT'
                    ]
                });

                console.log('[ORCHESTRATOR] ✅ Pipeline completo. Resultado selado.');
                root.dispatchEvent(new CustomEvent('UNIFED_PIPELINE_COMPLETE', {
                    detail: { timestamp: fullResult.timestamp }
                }));

                return fullResult;
            }
        });

        Object.defineProperty(root, 'UNIFED_ORCHESTRATOR', {
            value: PUBLIC_API, writable: false, configurable: false, enumerable: true
        });

        root.dispatchEvent(new CustomEvent('UNIFED_ORCHESTRATOR_READY', {
            detail: { version: PUBLIC_API._VERSION, timestamp: new Date().toISOString() }
        }));

        console.log('[ORCHESTRATOR] ✅ UNIFED_ORCHESTRATOR v1.0.0 instalado e pronto.');
    }

    /* Nós Sankey de demonstração (substituir com dados reais do caso) */
    function _defaultSankeyNodes() {
        return [
            { id: 'plat_a',   label: 'Plataforma A', type: 'income',  value: 1200 },
            { id: 'plat_b',   label: 'Plataforma B', type: 'income',  value: 800  },
            { id: 'plat_c',   label: 'Plataforma C', type: 'income',  value: 450  },
            { id: 'agregado', label: 'Agregado',      type: 'neutral', value: 2450 },
            { id: 'declar',   label: 'Declarado',     type: 'neutral', value: 265  },
            { id: 'omitido',  label: 'Omitido',       type: 'expense', value: 2185 }
        ];
    }

    function _defaultSankeyEdges() {
        return [
            { source: 'plat_a',   target: 'agregado', value: 1200 },
            { source: 'plat_b',   target: 'agregado', value: 800  },
            { source: 'plat_c',   target: 'agregado', value: 450  },
            { source: 'agregado', target: 'declar',   value: 265  },
            { source: 'agregado', target: 'omitido',  value: 2185 }
        ];
    }

    /* Tentar inicialização imediata */
    _tryInit();

})(window);
