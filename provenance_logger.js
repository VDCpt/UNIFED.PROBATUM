/**
 * ============================================================================
 * UNIFED-PROBATUM · provenance_logger.js
 * ============================================================================
 * Versão      : v1.1.0-FASE3-PROVENANCE-RECTIFIED
 * Data        : 2026-04-19
 * Conformidade: Art. 158.º CPP · Art. 163.º CPP · ISO/IEC 27037:2012
 *               DORA (UE) 2022/2554
 *
 * RECTIFICAÇÃO (v1.0.0 → v1.1.0):
 *   [FIX-PROV-01] SESSION_MASTER_HASH deixou de ser valor hardcoded.
 *                 É agora capturado dinamicamente do evento
 *                 UNIFED_QUORUM_VALIDATED (detail.reconstructedHash),
 *                 despachado por unifed_custody_engine_v2.0.js após
 *                 reconstrução Shamir k=2 bem-sucedida.
 *                 Antes desta captura, o módulo opera em estado PENDING:
 *                 qualquer chamada a signEvent() lança ReferenceError,
 *                 impedindo a criação de entradas de log sem âncora válida.
 *   [NEW-PROV-02] Exposto getter isReady() na interface pública.
 *   [NEW-PROV-03] _quorumValidatedAt regista o timestamp ISO 8601 da
 *                 validação do quórum para fins de perícia colegial.
 *
 * ÂMBITO (FASE 3):
 *   Módulo de Logging de Proveniência com Cadeia de Custódia de Runtime.
 *   Implementa:
 *     · Interceção de funções (function hooking) para analyze(), levenTest(),
 *       anovaWelch(), anovaOneWay()
 *     · Assinatura de cada evento de log com SHA-256 encadeado (blockchain local)
 *     · Session Link: Master Hash DINÂMICO (Shamir reconstruct) || hash anterior
 *     · Não-repúdio de origem e rastreabilidade de artefactos
 *
 * AVISO DE CONFORMIDADE:
 *   Este módulo opera exclusivamente em memória (zero-persistência).
 *   A Web Crypto API (SubtleCrypto) é utilizada para hashing SHA-256.
 *   O módulo NÃO assina digitalmente (PKI) — esse passo requer intervenção
 *   de Perito Nomeado (Art. 158.º CPP) com certificado qualificado eIDAS.
 * ============================================================================
 */

(function _installProvenanceLogger(root) {
    'use strict';

    /* ============================================================
       ESTADO DE SESSÃO
       ============================================================ */

    /**
     * [FIX-PROV-01] _sessionMasterHash
     *
     * Anteriormente: const SESSION_MASTER_HASH = '72760dfde...' (hardcoded)
     * Agora: let mutável, inicializado a null (estado PENDING).
     *
     * Ciclo de vida:
     *   null          → módulo carregado, quórum NÃO validado
     *   string hex 64 → quórum validado; valor capturado de
     *                   event.detail.reconstructedHash (Shamir reconstruct)
     *
     * Consequência directa de null:
     *   signEvent() lança ReferenceError — sem entradas de log sem âncora.
     *   chainIntegrity() devolve { valid: false, broken_at: 'PENDING' }.
     */
    let _sessionMasterHash = null;

    /**
     * [NEW-PROV-02] Flags e metadados de prontidão do módulo.
     */
    let _quorumReady       = false;
    let _quorumValidatedAt = null; // ISO 8601 timestamp do evento QUORUM_VALIDATED

    // Identificador único de sessão (gerado uma única vez por carregamento)
    const SESSION_ID = (function () {
        const arr = new Uint8Array(16);
        crypto.getRandomValues(arr);
        return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
    })();

    /* ============================================================
       UTILITÁRIO: SHA-256 via SubtleCrypto (assíncrono)
       ============================================================ */

    /**
     * _sha256(data: string) → Promise<string>
     * Calcula SHA-256 de uma string e devolve hex string de 64 caracteres.
     */
    async function _sha256(data) {
        const encoder = new TextEncoder();
        const buffer = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /* ============================================================
       CADEIA DE PROVENIÊNCIA (AUDIT TRAIL IMUTÁVEL)
       ============================================================ */

    // Array imutável após cada entrada ser selada (Object.freeze por entrada)
    const _auditChain = [];

    /**
     * _lastChainHash — Genesis da cadeia.
     * Inicializado a null (PENDING). Definido para _sessionMasterHash
     * no instante em que o evento UNIFED_QUORUM_VALIDATED é processado.
     * Cada chamada bem-sucedida a signEvent() avança este ponteiro para
     * o entryHash da entrada mais recente.
     */
    let _lastChainHash = null;

    /**
     * signEvent(functionId, inputData, outputData) → Promise<LogEntry>
     *
     * Cria uma entrada de log assinada e encadeada.
     *
     * Estrutura da entrada:
     * {
     *   seq          : número de sequência (monotónico, base-1)
     *   timestamp    : ISO 8601 alta precisão (performance.now() + Date)
     *   function_id  : nome da função interceptada
     *   input_hash   : SHA-256(JSON.stringify(inputData))
     *   output_hash  : SHA-256(JSON.stringify(outputData))
     *   session_link : SHA-256(SESSION_MASTER_HASH || hash_log_anterior)
     *   entry_hash   : SHA-256(seq + timestamp + function_id + input_hash +
     *                          output_hash + session_link)
     * }
     *
     * Conformidade Art. 163.º CPP: Valor da prova — cada entrada é
     * rastreável ao dado bruto e ao resultado, sem possibilidade de
     * adulteração retroactiva sem invalidar toda a cadeia subsequente.
     */
    async function signEvent(functionId, inputData, outputData) {
        /* [FIX-PROV-01] Guarda de prontidão — impede logs sem âncora válida */
        if (!_quorumReady || _sessionMasterHash === null) {
            throw new ReferenceError(
                '[PRV] ProvenanceLogger não pronto: quórum Shamir não validado. ' +
                'Aguarde o evento UNIFED_QUORUM_VALIDATED antes de invocar signEvent().'
            );
        }

        // Timestamp de alta precisão (ISO 8601 + milissegundos)
        const now = new Date();
        const timestamp = now.toISOString().replace('Z', '') +
            performance.now().toFixed(3) + 'Z';

        const seq = _auditChain.length + 1;

        // Hashes de entrada e saída
        const inputHash  = await _sha256(JSON.stringify(inputData));
        const outputHash = await _sha256(JSON.stringify(outputData));

        // Session Link: encadeamento com log anterior (usa hash dinâmico)
        const sessionLink = await _sha256(_sessionMasterHash + _lastChainHash);

        // Hash da própria entrada (commitamento)
        const entryPayload = [seq, timestamp, functionId,
                              inputHash, outputHash, sessionLink].join('|');
        const entryHash = await _sha256(entryPayload);

        const entry = Object.freeze({
            seq,
            timestamp,
            session_id         : SESSION_ID,
            function_id        : functionId,
            input_hash         : inputHash,
            output_hash        : outputHash,
            session_link       : sessionLink,
            entry_hash         : entryHash,
            /* [FIX-PROV-01] master_hash_ref é agora dinâmico */
            master_hash_ref    : _sessionMasterHash,
            quorum_validated_at: _quorumValidatedAt
        });

        _auditChain.push(entry);
        _lastChainHash = entryHash; // Avançar a cadeia

        console.info(
            `[PRV-LOG #${seq}] ${functionId} | in:${inputHash.slice(0,8)}...` +
            ` out:${outputHash.slice(0,8)}... chain:${entryHash.slice(0,8)}...`
        );

        return entry;
    }

    /* ============================================================
       INTERCEÇÃO DE FUNÇÕES (FUNCTION HOOKING)
       ============================================================ */

    /**
     * _wrapFunction(targetObj, methodName, context)
     *
     * Substitui targetObj[methodName] por um wrapper que:
     *   1. Regista o evento PRE-CALL com hash dos argumentos
     *   2. Executa a função original
     *   3. Regista o evento POST-CALL com hash do resultado
     *   4. Devolve o resultado SELADO (Object.freeze)
     *
     * Defesa contra Manipulação de Memória (Art. 158.º CPP):
     *   O resultado é congelado antes de ser devolvido ao chamador.
     *   Qualquer tentativa de modificação via consola lança TypeError em strict mode.
     */
    function _wrapFunction(targetObj, methodName, context) {
        if (typeof targetObj[methodName] !== 'function') {
            console.warn(`[PRV-HOOK] ${methodName} não encontrado em ${context}. Hook adiado.`);
            return;
        }

        const _original = targetObj[methodName];

        targetObj[methodName] = async function _hookedFn(...args) {
            const callId = `${methodName}#${Date.now()}`;

            // PRE-CALL: registar a intenção de chamada com hash dos inputs
            await signEvent(`PRE::${methodName}`, { call_id: callId, args }, null);

            let result;
            try {
                // Execução da função original
                result = _original.apply(this, args);
                // Suporte a funções síncronas e assíncronas
                if (result && typeof result.then === 'function') {
                    result = await result;
                }
            } catch (err) {
                // Registar erro na cadeia (rastreabilidade de falhas)
                await signEvent(`ERROR::${methodName}`, { call_id: callId }, {
                    error: err.message, stack: err.stack
                });
                throw err;
            }

            // Selar o resultado
            const sealedResult = typeof result === 'object' && result !== null
                ? Object.freeze(Object.assign(Object.create(null), result))
                : result;

            // POST-CALL: registar resultado com hash do output
            await signEvent(`POST::${methodName}`, { call_id: callId }, sealedResult);

            return sealedResult;
        };

        console.info(`[PRV-HOOK] Hook instalado: ${context}.${methodName}`);
    }

    /* ============================================================
       VERIFICAÇÃO DE INTEGRIDADE DA CADEIA
       ============================================================ */

    /**
     * chainIntegrity() → Promise<{ valid: boolean, broken_at: number|null, report: object }>
     *
     * Recomputa e verifica todos os entry_hash da cadeia.
     * Se qualquer entrada foi modificada após a selagem, a divergência
     * é detectada e reportada com o número de sequência da ruptura.
     *
     * Conformidade ISO/IEC 27037:2012 (§ 8.3 — Integrity Verification).
     */
    async function chainIntegrity() {
        /* Guarda: sem hash dinâmico, não há cadeia verificável */
        if (!_quorumReady || _sessionMasterHash === null) {
            return Object.freeze({
                session_id      : SESSION_ID,
                master_hash_ref : null,
                status          : 'PENDING',
                entries_checked : 0,
                valid           : false,
                broken_at       : 'PENDING — quórum Shamir não validado',
                divergences     : []
            });
        }

        const report = {
            session_id         : SESSION_ID,
            master_hash_ref    : _sessionMasterHash,
            quorum_validated_at: _quorumValidatedAt,
            entries_checked    : _auditChain.length,
            timestamp          : new Date().toISOString(),
            valid              : true,
            broken_at          : null,
            divergences        : []
        };

        let previousHash = _sessionMasterHash;

        for (const entry of _auditChain) {
            const expectedSessionLink = await _sha256(_sessionMasterHash + previousHash);

            const payload = [entry.seq, entry.timestamp, entry.function_id,
                             entry.input_hash, entry.output_hash,
                             expectedSessionLink].join('|');
            const expectedEntryHash = await _sha256(payload);

            if (entry.entry_hash !== expectedEntryHash ||
                entry.session_link !== expectedSessionLink) {
                report.valid = false;
                report.broken_at = entry.seq;
                report.divergences.push({
                    seq             : entry.seq,
                    function_id     : entry.function_id,
                    stored_hash     : entry.entry_hash,
                    expected_hash   : expectedEntryHash,
                    stored_link     : entry.session_link,
                    expected_link   : expectedSessionLink
                });
            }

            previousHash = entry.entry_hash;
        }

        return Object.freeze(report);
    }

    /* ============================================================
       EXPORTAÇÃO DA CADEIA (AUDIT_TRAIL.JSON)
       ============================================================ */

    /**
     * exportAuditTrail() → string (JSON)
     *
     * Exporta a cadeia de proveniência completa em formato JSON.
     * Este output constitui o artefacto audit_trail.json para junção aos autos.
     * O JSON inclui o Master Hash de sessão e é reprodutível deterministicamente.
     */
    function exportAuditTrail() {
        return JSON.stringify({
            schema_version      : '1.1.0',
            generated_at        : new Date().toISOString(),
            session_id          : SESSION_ID,
            /* [FIX-PROV-01] master_hash_ref dinâmico — null se quórum pendente */
            master_hash_ref     : _sessionMasterHash,
            quorum_validated_at : _quorumValidatedAt,
            quorum_ready        : _quorumReady,
            total_entries       : _auditChain.length,
            chain               : _auditChain.map(e => ({...e}))
        }, null, 2);
    }

    /* ============================================================
       INSTALAÇÃO E ARRANQUE
       ============================================================ */

    /**
     * install() — Ponto de entrada público.
     *
     * [FIX-PROV-01] Regista listener para UNIFED_QUORUM_VALIDATED.
     * Ao receber o evento, captura event.detail.reconstructedHash
     * (hash Shamir reconstruct, calculado em unifed_custody_engine_v2.0.js)
     * e inicializa _sessionMasterHash e _lastChainHash.
     * Só depois instala os hooks nas funções do motor estatístico.
     *
     * Garantias:
     *   · _sessionMasterHash nunca é null quando signEvent() é chamado
     *     (pois os hooks só existem após este listener correr).
     *   · _lastChainHash (genesis) === _sessionMasterHash, vinculando
     *     o primeiro log ao resultado real do quórum Shamir.
     */
    function install() {
        console.info('[PRV] ProvenanceLogger v1.1.0-RECTIFIED a inicializar...');
        console.info(`[PRV] Session ID: ${SESSION_ID}`);
        console.info('[PRV] Estado: PENDING — aguarda evento UNIFED_QUORUM_VALIDATED.');
        console.info('[PRV] Master Hash Ref: [PENDENTE — valor será capturado do evento]');

        document.addEventListener('UNIFED_QUORUM_VALIDATED', function _onQuorumValidated(event) {
            /* [FIX-PROV-01] Captura dinâmica do hash reconstruído */
            const reconstructedHash = event.detail && event.detail.reconstructedHash;

            if (typeof reconstructedHash !== 'string' || reconstructedHash.length !== 64) {
                console.error(
                    '[PRV] ERRO CRÍTICO: event.detail.reconstructedHash ausente ou inválido. ' +
                    `Recebido: ${JSON.stringify(reconstructedHash)}. ` +
                    'ProvenanceLogger permanece em estado PENDING.'
                );
                return;
            }

            /* Inicializar estado dinâmico */
            _sessionMasterHash = reconstructedHash.toLowerCase();
            _lastChainHash     = _sessionMasterHash; // Genesis: âncora = hash do quórum
            _quorumReady       = true;
            _quorumValidatedAt = event.detail.timestamp || new Date().toISOString();

            console.info('[PRV] ✅ Quórum validado. ProvenanceLogger ACTIVO.');
            console.info(`[PRV] Master Hash Dinâmico (Shamir): ${_sessionMasterHash.slice(0,16)}...`);
            console.info(`[PRV] Genesis da cadeia: _lastChainHash = _sessionMasterHash`);
            console.info(`[PRV] Timestamp quórum: ${_quorumValidatedAt}`);

            /* Instalar hooks nas funções críticas do motor estatístico */
            const engine = root.UNIFED_AUDIT_UNCERTAINTY;
            if (!engine) {
                console.error('[PRV] UNIFED_AUDIT_UNCERTAINTY não encontrado. Hooks não instalados.');
                return;
            }

            _wrapFunction(engine, 'analyze',     'UNIFED_AUDIT_UNCERTAINTY');
            _wrapFunction(engine, 'levenTest',   'UNIFED_AUDIT_UNCERTAINTY');
            _wrapFunction(engine, 'anovaWelch',  'UNIFED_AUDIT_UNCERTAINTY');
            _wrapFunction(engine, 'anovaOneWay', 'UNIFED_AUDIT_UNCERTAINTY');

            console.info('[PRV] Todos os hooks de proveniência instalados. Cadeia activa.');

            /* Remover listener após primeiro quórum bem-sucedido:
               o evento deve ocorrer uma única vez por sessão. */
            document.removeEventListener('UNIFED_QUORUM_VALIDATED', _onQuorumValidated);
        });
    }

    /* ============================================================
       INTERFACE PÚBLICA — v1.1.0
       ============================================================ */
    root.UNIFED_PROVENANCE = Object.freeze({
        _INSTALLED          : true,
        VERSION             : 'v1.1.0-FASE3-PROVENANCE-RECTIFIED',
        SESSION_ID          : SESSION_ID,
        /* [NEW-PROV-02] getter dinâmico — devolve null se quórum pendente */
        get MASTER_HASH_REF()    { return _sessionMasterHash; },
        get isReady()            { return _quorumReady; },
        get quorumValidatedAt()  { return _quorumValidatedAt; },
        signEvent,
        chainIntegrity,
        exportAuditTrail,
        install,
        getChain : () => [..._auditChain]
    });

    install();

})(window);
