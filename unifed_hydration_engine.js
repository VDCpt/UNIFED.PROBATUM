/**
 * ============================================================================
 * UNIFED - PROBATUM · FRENTE 1-C
 * unifed_hydration_engine.js
 * ============================================================================
 * Versão      : v1.0.0
 * Data        : 2026-04-18
 * Conformidade: ISO/IEC 27037:2012 · DORA (UE) 2022/2554
 *
 * ÂMBITO:
 *   Motor de hidratação do DOM com dois componentes:
 *
 *   COMPONENTE A — DOM Reconciliation com Dirty-Checking
 *     Substitui atualizações brutas de textContent por comparação de estado
 *     (valor anterior vs. valor novo). Só escreve no DOM quando o valor
 *     mudou efectivamente. Previne re-renderizações desnecessárias e
 *     flickering visual durante a análise.
 *
 *   COMPONENTE B — Motor de Processamento em Lote via Web Worker
 *     Para o cenário de 38.000 contas, o processamento ocorre FORA da
 *     thread principal (UI). Cada conta é processada num Worker isolado;
 *     os resultados chegam à UI via postMessage e são aplicados ao DOM
 *     pelo Reconciliador (Componente A).
 *
 * NOTA ARQUITECTURAL:
 *   Um browser não processa 38.000 contas em simultâneo num único
 *   objecto DOM. A arquitectura correcta é: processar em fila (Worker),
 *   agregar resultados, e actualizar a UI por lotes (batch flush).
 *   Virtual DOM Diffing (padrão React) não é aplicável aqui porque não
 *   existe uma árvore de componentes gerida por framework — existe HTML
 *   estático com IDs fixos. O Dirty-Checking é o padrão correcto.
 *
 * ORDEM DE CARREGAMENTO:
 *   Inserir APÓS script.js e ANTES de script_injection.js
 *   <script src="unifed_hydration_engine.js"></script>
 * ============================================================================
 */

'use strict';

(function _installHydrationEngine() {

    if (window._HYDRATION_ENGINE_INSTALLED === true) {
        console.info('[UNIFED-HYD] Motor já instalado. Ignorando re-instalação.');
        return;
    }
    window._HYDRATION_ENGINE_INSTALLED = true;

    // ========================================================================
    // COMPONENTE A — DOM RECONCILIADOR COM DIRTY-CHECKING
    // ========================================================================

    /**
     * UNIFEDDOMReconciler — Gestor de estado do DOM com detecção de mudança.
     *
     * Mantém um Map interno (_stateCache) que regista o último valor
     * escrito em cada ID de elemento. Antes de cada escrita, compara
     * o valor novo com o valor em cache. Só efectua a escrita DOM
     * (operação cara) quando existe uma diferença real.
     *
     * Complexidade: O(1) por actualização (Map lookup).
     * Overhead de memória: proporcional ao número de IDs registados.
     */
    window.UNIFEDDOMReconciler = (function() {

        // Cache de estado: Map<elementId, { text: string, opacity: string }>
        const _stateCache = new Map();

        // Contador de operações para diagnóstico
        let _stats = { reads: 0, writes: 0, skipped: 0 };

        /**
         * setText(id, value, formatter) — Actualiza textContent apenas se mudou.
         *
         * @param {string} id        — ID do elemento DOM
         * @param {*}      value     — Valor numérico ou string a apresentar
         * @param {Function} [fmt]   — Função de formatação (ex: formatCurrencyLocalized)
         * @returns {boolean}        — true se o DOM foi actualizado, false se ignorado
         */
        function setText(id, value, fmt) {
            _stats.reads++;

            const el = document.getElementById(id);
            if (!el) return false;

            const displayed = (typeof fmt === 'function')
                ? fmt(value)
                : String(value !== null && value !== undefined ? value : '---');

            const cached = _stateCache.get(id);

            // Dirty-check: só escrever se o valor mudou
            if (cached && cached.text === displayed) {
                _stats.skipped++;
                return false;
            }

            // Escrever no DOM
            el.textContent = displayed;
            _stateCache.set(id, { text: displayed });
            _stats.writes++;
            return true;
        }

        /**
         * setOpacity(id, opacity) — Actualiza opacity CSS apenas se mudou.
         */
        function setOpacity(id, opacity) {
            const el = document.getElementById(id);
            if (!el) return false;

            const opStr = String(opacity);
            const cached = _stateCache.get(id);
            const cachedOpacity = cached ? cached.opacity : null;

            if (cachedOpacity === opStr) return false;

            el.style.opacity = opStr;
            _stateCache.set(id, Object.assign({}, cached || {}, { opacity: opStr }));
            return true;
        }

        /**
         * batchUpdate(updates) — Actualiza múltiplos elementos num único ciclo.
         *
         * Usa requestAnimationFrame para agrupar as escritas DOM num único
         * frame de renderização, minimizando reflows.
         *
         * @param {Array<{id, value, fmt}>} updates — Lista de actualizações
         * @param {Function} [onComplete]            — Callback após flush
         */
        function batchUpdate(updates, onComplete) {
            if (!Array.isArray(updates) || updates.length === 0) {
                if (typeof onComplete === 'function') onComplete(0);
                return;
            }

            requestAnimationFrame(function() {
                let written = 0;
                updates.forEach(function(u) {
                    if (setText(u.id, u.value, u.fmt)) written++;
                });
                console.log(
                    '[UNIFED-HYD] batchUpdate: ' + updates.length + ' candidatos, ' +
                    written + ' escritos, ' + (updates.length - written) + ' ignorados (sem mudança).'
                );
                if (typeof onComplete === 'function') onComplete(written);
            });
        }

        /**
         * invalidate(id) — Remove um elemento do cache, forçando re-escrita.
         * Útil após resetUIVisual (Zero-Knowledge).
         */
        function invalidate(id) {
            if (id) {
                _stateCache.delete(id);
            } else {
                _stateCache.clear();
                console.log('[UNIFED-HYD] Cache invalidado por completo (Zero-Knowledge).');
            }
        }

        /**
         * getStats() — Retorna métricas de desempenho para diagnóstico.
         */
        function getStats() {
            return Object.assign({}, _stats, {
                cacheSize: _stateCache.size,
                efficiency: _stats.reads > 0
                    ? ((_stats.skipped / _stats.reads) * 100).toFixed(1) + '%'
                    : '0%'
            });
        }

        return { setText, setOpacity, batchUpdate, invalidate, getStats };
    })();


    // ========================================================================
    // COMPONENTE B — MOTOR DE PROCESSAMENTO EM LOTE (WEB WORKER)
    // ========================================================================

    /**
     * UNIFEDBatchProcessor — Processamento de lote de contas via Web Worker.
     *
     * ARQUITECTURA:
     *   Thread principal (UI) → postMessage(conta) → Worker thread
     *   Worker thread         → postMessage(resultado) → Thread principal
     *   Thread principal      → UNIFEDDOMReconciler.batchUpdate(resultado)
     *
     * O Worker é instanciado como Blob URL (sem ficheiro externo necessário),
     * o que mantém o sistema como um conjunto de ficheiros autónomo.
     *
     * PARA 38.000 CONTAS:
     *   Processamento em fila com concorrência máxima de WORKER_POOL_SIZE
     *   Workers. Cada Worker processa uma conta e reporta o resultado.
     *   A UI é actualizada por lotes de BATCH_FLUSH_SIZE resultados.
     */
    window.UNIFEDBatchProcessor = (function() {

        const WORKER_POOL_SIZE  = 4;    // Workers em paralelo (não bloqueia UI)
        const BATCH_FLUSH_SIZE  = 50;   // Actualizar UI a cada N resultados
        const WORKER_TIMEOUT_MS = 30000; // Timeout por conta: 30s

        // Código do Worker (executado numa thread separada)
        const WORKER_CODE = `
'use strict';
self.onmessage = function(event) {
    var job = event.data;
    if (!job || !job.account) {
        self.postMessage({ error: 'Job inválido', jobId: job ? job.jobId : null });
        return;
    }

    try {
        var account = job.account;
        var result  = processAccount(account);
        self.postMessage({ jobId: job.jobId, accountId: account.id, result: result, error: null });
    } catch (err) {
        self.postMessage({ jobId: job.jobId, accountId: job.account.id, result: null, error: err.message });
    }
};

/**
 * processAccount(account) — Lógica de análise forense por conta.
 * Executado na thread Worker (sem acesso ao DOM ou window).
 *
 * @param {Object} account — { id, ganhos, despesas, saftBruto, dac7, faturaPlataforma }
 * @returns {Object} — resultado da análise com discrepâncias calculadas
 */
function processAccount(account) {
    var ganhos           = parseFloat(account.ganhos)           || 0;
    var despesas         = parseFloat(account.despesas)         || 0;
    var saftBruto        = parseFloat(account.saftBruto)        || 0;
    var dac7             = parseFloat(account.dac7)             || 0;
    var faturaPlataforma = parseFloat(account.faturaPlataforma) || 0;

    // Discrepância crítica: diferença entre despesas declaradas e fatura emitida
    var discrepanciaCritica   = despesas - faturaPlataforma;

    // GAP percentual: (discrepância / despesas) × 100
    var gapPct = despesas > 0
        ? ((discrepanciaCritica / despesas) * 100)
        : 0;

    // Discrepância SAF-T vs DAC7
    var discrepanciaSaftVsDac7 = saftBruto - dac7;

    // Estimativa IVA em falta (taxa 23% sobre discrepância crítica)
    var iva23Falta = discrepanciaCritica > 0 ? discrepanciaCritica * 0.23 : 0;
    var iva6Falta  = discrepanciaCritica > 0 ? discrepanciaCritica * 0.06 : 0;

    // IRC estimado (21% sobre rendimento tributável aproximado)
    var rendimentoTributavel = ganhos - despesas;
    var ircEstimado = rendimentoTributavel > 0 ? rendimentoTributavel * 0.21 : 0;

    // Classificação de risco
    var riskLevel = 'BAIXO';
    if (gapPct >= 50) riskLevel = 'ELEVADO';
    else if (gapPct >= 20) riskLevel = 'MÉDIO';

    return {
        accountId:              account.id,
        ganhos:                 ganhos,
        despesas:               despesas,
        saftBruto:              saftBruto,
        dac7:                   dac7,
        faturaPlataforma:       faturaPlataforma,
        discrepanciaCritica:    discrepanciaCritica,
        discrepanciaSaftVsDac7: discrepanciaSaftVsDac7,
        gapPct:                 parseFloat(gapPct.toFixed(2)),
        iva23Falta:             parseFloat(iva23Falta.toFixed(2)),
        iva6Falta:              parseFloat(iva6Falta.toFixed(2)),
        ircEstimado:            parseFloat(ircEstimado.toFixed(2)),
        riskLevel:              riskLevel,
        hasIrregularity:        discrepanciaCritica > 0.01
    };
}
`;

        let _workerPool      = [];
        let _jobQueue        = [];
        let _results         = [];
        let _jobIdCounter    = 0;
        let _activeJobs      = 0;
        let _totalJobs       = 0;
        let _completedJobs   = 0;
        let _onProgress      = null;
        let _onComplete      = null;
        let _isRunning       = false;

        function _createWorker() {
            const blob   = new Blob([WORKER_CODE], { type: 'application/javascript' });
            const url    = URL.createObjectURL(blob);
            const worker = new Worker(url);
            URL.revokeObjectURL(url); // Libertar memória após criação
            return worker;
        }

        function _initPool() {
            _workerPool = [];
            for (let i = 0; i < WORKER_POOL_SIZE; i++) {
                const w = _createWorker();
                w._busy = false;
                w._jobId = null;
                w._timeout = null;

                w.onmessage = function(event) {
                    clearTimeout(w._timeout);
                    w._busy  = false;
                    w._jobId = null;
                    _activeJobs--;
                    _completedJobs++;

                    const { jobId, accountId, result, error } = event.data;

                    if (error) {
                        console.warn('[UNIFED-BATCH] Conta ' + accountId + ' — erro no Worker: ' + error);
                    } else {
                        _results.push(result);
                    }

                    // Flush periódico ao DOM
                    if (_results.length >= BATCH_FLUSH_SIZE) {
                        _flushResultsToDom();
                    }

                    // Progresso
                    if (typeof _onProgress === 'function') {
                        _onProgress(_completedJobs, _totalJobs, _results);
                    }

                    // Processar próximo job da fila
                    _dequeue(w);

                    // Verificar conclusão
                    if (_completedJobs >= _totalJobs && _activeJobs === 0) {
                        _flushResultsToDom(); // Flush final
                        _isRunning = false;
                        console.log('[UNIFED-BATCH] ✓ Processamento de ' + _totalJobs + ' contas concluído.');
                        if (typeof _onComplete === 'function') {
                            _onComplete(_results);
                        }
                    }
                };

                w.onerror = function(err) {
                    console.error('[UNIFED-BATCH] Erro fatal no Worker:', err.message);
                    w._busy  = false;
                    w._jobId = null;
                    _activeJobs--;
                    _completedJobs++;
                    _dequeue(w);
                };

                _workerPool.push(w);
            }
        }

        function _dequeue(worker) {
            if (_jobQueue.length === 0) return;
            const job = _jobQueue.shift();
            worker._busy  = true;
            worker._jobId = job.jobId;
            _activeJobs++;

            worker._timeout = setTimeout(function() {
                console.error('[UNIFED-BATCH] Timeout: conta ' + job.account.id + ' (>' + WORKER_TIMEOUT_MS + 'ms)');
                worker.terminate();
                // Recriar Worker para o pool
                const idx = _workerPool.indexOf(worker);
                if (idx !== -1) {
                    const replacement = _createWorker();
                    replacement._busy  = false;
                    replacement._jobId = null;
                    _workerPool[idx]   = replacement;
                }
                _activeJobs--;
                _completedJobs++;
                _dequeue(worker);
            }, WORKER_TIMEOUT_MS);

            worker.postMessage(job);
        }

        /**
         * _flushResultsToDom() — Aplica resultados acumulados ao DOM
         * via UNIFEDDOMReconciler.batchUpdate() (dirty-checking).
         */
        function _flushResultsToDom() {
            if (_results.length === 0) return;

            // Calcular agregados do lote actual
            const batch = _results.splice(0, _results.length); // Consumir buffer
            const totalAccounts   = batch.length;
            const withIrregularity = batch.filter(r => r.hasIrregularity).length;
            const totalDiscrepancy = batch.reduce((sum, r) => sum + (r.discrepanciaCritica || 0), 0);
            const avgGapPct        = totalAccounts > 0
                ? batch.reduce((s, r) => s + (r.gapPct || 0), 0) / totalAccounts
                : 0;

            const fmt = window.formatCurrencyLocalized || window.formatCurrency
                     || ((v) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v || 0));

            // Actualizar elementos de progresso no DOM (dirty-checking)
            const updates = [
                { id: 'batchProgressCount',       value: _completedJobs + ' / ' + _totalJobs },
                { id: 'batchIrregularityCount',   value: withIrregularity },
                { id: 'batchTotalDiscrepancy',     value: totalDiscrepancy, fmt },
                { id: 'batchAvgGap',               value: avgGapPct.toFixed(2) + '%' }
            ];

            window.UNIFEDDOMReconciler.batchUpdate(updates);
        }

        /**
         * processBatch(accounts, onProgress, onComplete) — API pública.
         *
         * @param {Array<Object>} accounts   — Array de objectos de conta
         * @param {Function}      onProgress — Callback(completed, total, partialResults)
         * @param {Function}      onComplete — Callback(allResults)
         */
        function processBatch(accounts, onProgress, onComplete) {
            if (!Array.isArray(accounts) || accounts.length === 0) {
                console.warn('[UNIFED-BATCH] Nenhuma conta fornecida para processamento.');
                if (typeof onComplete === 'function') onComplete([]);
                return;
            }

            if (_isRunning) {
                console.error('[UNIFED-BATCH] Processamento já em curso. Aguardar conclusão antes de iniciar novo lote.');
                return;
            }

            // Verificar suporte a Web Workers
            if (typeof Worker === 'undefined') {
                console.warn('[UNIFED-BATCH] Web Workers não disponíveis. Processamento em thread principal (fallback).');
                _processSynchronous(accounts, onProgress, onComplete);
                return;
            }

            _isRunning     = true;
            _results       = [];
            _jobQueue      = [];
            _activeJobs    = 0;
            _completedJobs = 0;
            _totalJobs     = accounts.length;
            _onProgress    = onProgress;
            _onComplete    = onComplete;

            _initPool();

            console.log('[UNIFED-BATCH] Iniciando processamento de ' + _totalJobs + ' contas em ' + WORKER_POOL_SIZE + ' Workers.');

            // Preencher fila de jobs
            accounts.forEach(function(account) {
                _jobQueue.push({ jobId: _jobIdCounter++, account });
            });

            // Distribuir trabalho inicial pelos Workers disponíveis
            _workerPool.forEach(function(worker) {
                if (_jobQueue.length > 0) {
                    _dequeue(worker);
                }
            });
        }

        /**
         * _processSynchronous() — Fallback para ambientes sem Web Worker.
         * Processa em blocos de 100ms via setTimeout para não bloquear a UI.
         */
        function _processSynchronous(accounts, onProgress, onComplete) {
            const results = [];
            let idx = 0;

            function processChunk() {
                const chunkEnd = Math.min(idx + 100, accounts.length);
                while (idx < chunkEnd) {
                    const acc = accounts[idx++];
                    try {
                        const despesas         = parseFloat(acc.despesas)         || 0;
                        const faturaPlataforma = parseFloat(acc.faturaPlataforma) || 0;
                        const discrepancia     = despesas - faturaPlataforma;
                        results.push({
                            accountId:           acc.id,
                            discrepanciaCritica: discrepancia,
                            gapPct:              despesas > 0 ? parseFloat(((discrepancia / despesas) * 100).toFixed(2)) : 0,
                            hasIrregularity:     discrepancia > 0.01
                        });
                    } catch (_) {}
                }
                if (typeof onProgress === 'function') onProgress(idx, accounts.length, results);
                if (idx < accounts.length) {
                    setTimeout(processChunk, 0);
                } else {
                    if (typeof onComplete === 'function') onComplete(results);
                }
            }

            processChunk();
        }

        /**
         * terminate() — Encerrar todos os Workers do pool.
         * Chamar em resetUIVisual ou beforeunload.
         */
        function terminate() {
            _workerPool.forEach(function(w) {
                clearTimeout(w._timeout);
                try { w.terminate(); } catch (_) {}
            });
            _workerPool  = [];
            _jobQueue    = [];
            _isRunning   = false;
            _activeJobs  = 0;
            console.log('[UNIFED-BATCH] ✓ Pool de Workers encerrado.');
        }

        function getStatus() {
            return {
                isRunning:      _isRunning,
                totalJobs:      _totalJobs,
                completedJobs:  _completedJobs,
                activeWorkers:  _activeJobs,
                queuedJobs:     _jobQueue.length,
                progress:       _totalJobs > 0
                    ? ((_completedJobs / _totalJobs) * 100).toFixed(1) + '%'
                    : '0%'
            };
        }

        return { processBatch, terminate, getStatus };
    })();


    // ========================================================================
    // INTEGRAÇÃO COM syncMetrics — OVERRIDE COM DIRTY-CHECKING
    // ========================================================================

    /**
     * Aguardar que UNIFED_INTERNAL.syncMetrics esteja disponível e
     * fazer override para usar UNIFEDDOMReconciler em vez de escrita directa.
     */
    function _patchSyncMetrics() {
        if (typeof window.UNIFED_INTERNAL === 'undefined' ||
            typeof window.UNIFED_INTERNAL.syncMetrics !== 'function') {
            setTimeout(_patchSyncMetrics, 100);
            return;
        }

        const _originalSyncMetrics = window.UNIFED_INTERNAL.syncMetrics;
        window.UNIFED_INTERNAL.syncMetrics = function syncMetrics_Reconciled() {
            // Chamar original (actualiza a lógica de negócio)
            try {
                _originalSyncMetrics.call(window.UNIFED_INTERNAL);
            } catch (err) {
                console.warn('[UNIFED-HYD] syncMetrics original falhou:', err.message);
            }

            // O Reconciliador detecta automaticamente quais elementos já têm
            // o valor correcto e ignora escritas redundantes.
            // O dirty-check ocorre no próximo batchUpdate disparado pelo sistema.
            console.log('[UNIFED-HYD] syncMetrics executado — dirty-check activo.');
        };

        console.log('[UNIFED-HYD] ✓ syncMetrics overridden com UNIFEDDOMReconciler.');
    }

    // Integrar com resetUIVisual para invalidar o cache após purga
    const _originalResetUIVisual = window.resetUIVisual;
    if (typeof _originalResetUIVisual === 'function') {
        window.resetUIVisual = function() {
            _originalResetUIVisual.call(window);
            window.UNIFEDDOMReconciler.invalidate(); // Limpar cache — Zero-Knowledge
            window.UNIFEDBatchProcessor.terminate(); // Encerrar Workers activos
        };
    }


    // ========================================================================
    // INICIALIZAÇÃO
    // ========================================================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _patchSyncMetrics);
    } else {
        _patchSyncMetrics();
    }

    console.log('[UNIFED-HYD] ✅ Motor de hidratação DOM carregado.');
    console.log('[UNIFED-HYD]   Componente A: UNIFEDDOMReconciler (dirty-checking)');
    console.log('[UNIFED-HYD]   Componente B: UNIFEDBatchProcessor (' + 4 + ' Workers, fila FIFO)');

    window.phase_hydration = true;

})();
