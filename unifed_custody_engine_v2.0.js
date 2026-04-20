/**
 * ============================================================================
 * UNIFED-PROBATUM · unifed_custody_engine.js v2.0
 * ============================================================================
 * Versão      : v2.0.0-QUORUM-FINAL
 * Data        : 2026-04-19
 * Conformidade: Art. 125.º CPP · ISO/IEC 27037:2012 · DORA (UE) 2022/2554
 *
 * ALTERAÇÕES CRÍTICAS (v1.0.0 → v2.0.0):
 *   [RECTIFIED] ShamirSSS.reconstruct() — Implementação completa para 32 bytes
 *   [NEW] QuorumValidator — Interface de entrada manual de fragmentos
 *   [NEW] CustodyLog — Audit trail imutável de reconstrução
 *   [NEW] window._validateQuorumAndUnlock() — Orchestração do fluxo de quórum
 *
 * FLUXO OPERACIONAL:
 *   1. Sistema carrega em modo HALT (bloqueado)
 *   2. Utilizador insere dois fragmentos Hex em campos de texto
 *   3. _validateQuorumAndUnlock() reconstrói Master Hash via Shamir interpolation
 *   4. Se hash reconstrúido === manifest.master_hash: SUCESSO → liberta UI
 *   5. Se falha: mensagem de erro, sistema permanece bloqueado
 *   6. Cada tentativa é registada em CustodyLog (imutável)
 *
 * AUDITORIA:
 *   · Todas as operações Shamir são determinísticas (mesmo input → mesmo output)
 *   · Log de provenance registado para perícia colegial posterior
 *   · Nenhuma mutação de dados — operações em memória apenas
 * ============================================================================
 */

(function _installCustodyEngineV2(root) {
    'use strict';

    if (root.UNIFED_CUSTODY_V2 && root.UNIFED_CUSTODY_V2._INSTALLED === true) {
        console.info('[CUSTODY-V2] Módulo já instalado. Re-instalação ignorada.');
        return;
    }

    /* ======================================================================
       UTILIDADES CRIPTOGRÁFICAS BASE
       ====================================================================== */

    /**
     * _bufferToHex(buffer) → string
     * Converte ArrayBuffer para string hex lowercase.
     */
    function _bufferToHex(buffer) {
        return Array.from(new Uint8Array(buffer))
            .map(function (b) { return b.toString(16).padStart(2, '0'); })
            .join('');
    }

    /**
     * _hexToBuffer(hex) → Uint8Array
     * Converte string hex para Uint8Array.
     * Valida comprimento (múltiplo de 2) e lança erro se inválido.
     */
    function _hexToBuffer(hex) {
        if (typeof hex !== 'string') {
            throw new TypeError('[CUSTODY-V2] Hex input deve ser string.');
        }
        const cleaned = hex.toLowerCase().trim();
        if (cleaned.length % 2 !== 0) {
            throw new RangeError('[CUSTODY-V2] Hex comprimento ímpar (' + cleaned.length + ' caracteres). Esperado par.');
        }
        const arr = new Uint8Array(cleaned.length / 2);
        for (let i = 0; i < cleaned.length; i += 2) {
            const hexByte = cleaned.slice(i, i + 2);
            const byte = parseInt(hexByte, 16);
            if (isNaN(byte)) {
                throw new RangeError('[CUSTODY-V2] Sequência hex inválida em offset ' + i + ': "' + hexByte + '"');
            }
            arr[i / 2] = byte;
        }
        return arr;
    }

    /**
     * _sha256(data) → Promise<string>
     * Hashing SHA-256 assíncrono via Web Crypto API (FIPS 180-4).
     * Retorna hex lowercase de 64 caracteres.
     */
    async function _sha256(data) {
        const encoded = (typeof data === 'string')
            ? new TextEncoder().encode(data)
            : (data instanceof Uint8Array ? data : new Uint8Array(data));
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
        return _bufferToHex(hashBuffer);
    }

    /**
     * _sortKeysDeep(obj) → any
     * Ordena recursivamente as chaves de um objecto lexicograficamente.
     * Pré-requisito para serialização determinística.
     */
    function _sortKeysDeep(obj) {
        if (Array.isArray(obj)) {
            return obj.map(_sortKeysDeep);
        }
        if (obj !== null && typeof obj === 'object') {
            return Object.keys(obj).sort().reduce(function (acc, key) {
                acc[key] = _sortKeysDeep(obj[key]);
                return acc;
            }, {});
        }
        return obj;
    }

    /* ======================================================================
       SHAMIR'S SECRET SHARING — IMPLEMENTAÇÃO COMPLETA (k=2, n=3)
       ====================================================================== */

    /**
     * ShamirSSS — Shamir's Secret Sharing em campo primo GF(257)
     * 
     * TEORIA:
     *   · Segredo S é dividido em n shares usando polinómio de grau k-1
     *   · Com k=2, polinómio é de grau 1 (recta): f(x) = a0 + a1*x
     *     onde a0 = segredo (S)
     *   · Share i = f(i) = a0 + a1*i (mod P, onde P=257 é primo)
     *   · Qualquer k=2 shares permitem reconstituição via Lagrange interpolation
     *   · Com p=257, operações são em GF(257) — campo finito
     * 
     * CAMPOS:
     *   · P: primo = 257 (permite 256 valores + 1 para sentinel)
     *   · K: threshold = 2 (mínimo de shares para reconstituição)
     *   · N: número total de shares = 3
     *
     * OPERAÇÕES:
     *   · split(secret) → [share1, share2, share3]
     *   · reconstruct(shares) → secret
     */
    const ShamirSSS = Object.freeze({
        P: 257,  // Campo primo GF(257)
        K: 2,    // Threshold (mínimo de shares para reconstituição)
        N: 3,    // Total de shares a gerar

        /**
         * split(secret) → [share1, share2, share3]
         * Divide um valor secreto (0-256) em 3 shares usando polinómio aleatório.
         * 
         * @param {number} secret — valor a dividir (0 <= secret < 257)
         * @returns {Array<number>} — [share_x1, share_x2, share_x3]
         */
        split: function (secret) {
            if (typeof secret !== 'number' || secret < 0 || secret >= this.P) {
                throw new RangeError('[SHAMIR] Secret deve estar em [0, ' + (this.P - 1) + '].');
            }

            // Coeficientes aleatórios do polinómio f(x) = a0 + a1*x
            const a0 = secret;
            const a1 = Math.floor(Math.random() * this.P);

            // Calcular shares: f(1), f(2), f(3)
            const shares = [];
            for (let x = 1; x <= this.N; x++) {
                const share = (a0 + a1 * x) % this.P;
                shares.push(share);
            }
            return shares;
        },

        /**
         * reconstruct(shares) → number
         * Reconstrói o segredo a partir de k=2 shares usando Lagrange interpolation.
         * 
         * MÉTODO:
         *   Dado f(x) = a0 + a1*x, com shares f(1) e f(2):
         *   · Lagrange basis L0(0) = (x - x2) / (x1 - x2) = -2 / -1 = 2 (mod 257)
         *   · Lagrange basis L1(0) = (x - x1) / (x2 - x1) = -1 / 1 = -1 ≡ 256 (mod 257)
         *   · secret = f(1)*L0(0) + f(2)*L1(0) (mod 257)
         * 
         * @param {Array<number>} shares — array com pelo menos 2 valores
         * @returns {number} — segredo reconstituído
         */
        reconstruct: function (shares) {
            if (!Array.isArray(shares) || shares.length < this.K) {
                throw new Error('[SHAMIR] Reconstruct requer pelo menos ' + this.K + ' shares. Recebidos: ' + shares.length);
            }

            // Usar os primeiros k=2 shares (x1=1, y1=shares[0]) e (x2=2, y2=shares[1])
            const x1 = 1, y1 = shares[0];
            const x2 = 2, y2 = shares[1];

            // Lagrange interpolation em GF(257)
            // L0(0) = (0 - x2) / (x1 - x2) = -x2 / (x1 - x2)
            // L1(0) = (0 - x1) / (x2 - x1) = -x1 / (x2 - x1)

            const denom = (x1 - x2 + this.P) % this.P; // (1 - 2) mod 257 = -1 ≡ 256
            const denomInv = this._modInverse(denom, this.P);

            const num0 = (-x2 + this.P) % this.P; // -2 ≡ 255 (mod 257)
            const num1 = (-x1 + this.P) % this.P; // -1 ≡ 256 (mod 257)

            const L0 = (num0 * denomInv) % this.P;
            const L1 = (num1 * denomInv) % this.P;

            const secret = (y1 * L0 + y2 * L1) % this.P;
            return secret;
        },

        /**
         * _modInverse(a, p) → number
         * Calcula o inverso modular de a mod p usando Extended Euclidean Algorithm.
         * Requerido para Lagrange interpolation.
         * 
         * @param {number} a
         * @param {number} p — número primo
         * @returns {number} — x tal que (a * x) ≡ 1 (mod p)
         */
        _modInverse: function (a, p) {
            let [old_r, r] = [a, p];
            let [old_s, s] = [1, 0];

            while (r !== 0) {
                const quotient = Math.floor(old_r / r);
                [old_r, r] = [r, old_r - quotient * r];
                [old_s, s] = [s, old_s - quotient * s];
            }

            if (old_r > 1) throw new Error('[SHAMIR] a não é invertível mod p.');
            if (old_s < 0) old_s = old_s + p;

            return old_s;
        }
    });

    /* ======================================================================
       LOG DE CUSTÓDIA IMUTÁVEL
       ====================================================================== */

    /**
     * CustodyLog — Registo imutável de todas as operações de quórum.
     * Cada entrada é um facto forense que pode ser auditado posteriormente.
     */
    class CustodyLog {
        #entries;
        #counter;

        constructor() {
            this.#entries = [];
            this.#counter = 0;
        }

        /**
         * append(operation, data) → void
         * Adiciona uma entrada ao log com timestamp e sequência.
         * 
         * @param {string} operation — ex: 'QUORUM_ATTEMPT', 'QUORUM_SUCCESS', 'QUORUM_FAILURE'
         * @param {Object} data — contexto da operação (fragmentos, hashes, etc.)
         */
        append(operation, data) {
            const entry = Object.freeze({
                seq: ++this.#counter,
                timestamp: new Date().toISOString(),
                operation: operation,
                data: data || {}
            });
            this.#entries.push(entry);
            console.log('[CUSTODY-LOG] ' + operation + ' (#' + this.#counter + ')', data);
        }

        /**
         * export() → Array
         * Exporta log imutável (cópia defensiva).
         */
        export() {
            return Object.freeze(this.#entries.map(function (e) { return Object.freeze(Object.assign({}, e)); }));
        }

        /**
         * count() → number
         */
        count() {
            return this.#counter;
        }
    }

    /* ======================================================================
       VALIDADOR DE QUÓRUM
       ====================================================================== */

    /**
     * QuorumValidator — Orquestra a validação de quórum com 2 fragmentos.
     */
    class QuorumValidator {
        #masterHashTarget;
        #custodyLog;
        #reconstructedHash;

        constructor(masterHashTarget) {
            if (typeof masterHashTarget !== 'string' || masterHashTarget.length !== 64) {
                throw new TypeError('[QUORUM] masterHashTarget deve ser hex de 64 chars (SHA-256).');
            }
            this.#masterHashTarget = masterHashTarget.toLowerCase();
            this.#custodyLog = new CustodyLog();
            this.#reconstructedHash = null;
        }

        /**
         * validateFragments(fragment1Hex, fragment2Hex) → Promise<{valid: boolean, hash: string, error?: string}>
         * Valida dois fragmentos Hex (32 bytes cada) e reconstrói o Master Hash.
         * 
         * ALGORITMO:
         *   1. Parse e validação dos dois fragmentos Hex
         *   2. Para cada byte i ∈ [0, 31]:
         *      a. Extrair share_i do fragmento 1 (byte i)
         *      b. Extrair share_i do fragmento 2 (byte i)
         *      c. Calcular secret_i = ShamirSSS.reconstruct([share_i_from_f1, share_i_from_f2])
         *      d. Accumular em array de 32 bytes
         *   3. Hash SHA-256 do array reconstituído
         *   4. Validar contra masterHashTarget
         * 
         * @param {string} fragment1Hex — hex string de 64 chars (32 bytes)
         * @param {string} fragment2Hex — hex string de 64 chars (32 bytes)
         * @returns {Promise<Object>}
         */
        async validateFragments(fragment1Hex, fragment2Hex) {
            const opRef = 'OP-' + Date.now() + '-' + Math.floor(Math.random() * 10000);

            // Log da tentativa
            this.#custodyLog.append('QUORUM_ATTEMPT', {
                opRef: opRef,
                fragment1_length: fragment1Hex.length,
                fragment2_length: fragment2Hex.length
            });

            try {
                // Parse e validação
                const frag1 = _hexToBuffer(fragment1Hex);
                const frag2 = _hexToBuffer(fragment2Hex);

                if (frag1.length !== 32) {
                    throw new Error('[QUORUM] Fragmento 1 deve ser 32 bytes (64 hex chars). Recebido: ' + frag1.length);
                }
                if (frag2.length !== 32) {
                    throw new Error('[QUORUM] Fragmento 2 deve ser 32 bytes (64 hex chars). Recebido: ' + frag2.length);
                }

                // Reconstrução byte-a-byte
                const reconstructed = new Uint8Array(32);
                for (let i = 0; i < 32; i++) {
                    const byte1 = frag1[i];
                    const byte2 = frag2[i];

                    // Normalizar bytes para campo Shamir (0-256)
                    const share1 = byte1 % ShamirSSS.P;
                    const share2 = byte2 % ShamirSSS.P;

                    // Reconstituir segredo
                    const secret = ShamirSSS.reconstruct([share1, share2]);
                    reconstructed[i] = secret % 256;
                }

                // Hash do array reconstituído
                const reconstructedHash = await _sha256(reconstructed);

                // Validação contra target
                const isValid = reconstructedHash === this.#masterHashTarget;
                this.#reconstructedHash = reconstructedHash;

                const result = {
                    valid: isValid,
                    hash: reconstructedHash,
                    target: this.#masterHashTarget,
                    match: isValid
                };

                if (isValid) {
                    this.#custodyLog.append('QUORUM_SUCCESS', {
                        opRef: opRef,
                        reconstructed_hash: reconstructedHash,
                        timestamp: new Date().toISOString()
                    });
                } else {
                    this.#custodyLog.append('QUORUM_MISMATCH', {
                        opRef: opRef,
                        reconstructed: reconstructedHash,
                        expected: this.#masterHashTarget
                    });
                }

                return Object.freeze(result);

            } catch (err) {
                this.#custodyLog.append('QUORUM_ERROR', {
                    opRef: opRef,
                    error_message: err.message,
                    error_type: err.constructor.name
                });

                return Object.freeze({
                    valid: false,
                    hash: null,
                    error: err.message
                });
            }
        }

        /**
         * getLog() → Array — Exporta log imutável.
         */
        getLog() {
            return this.#custodyLog.export();
        }

        /**
         * getReconstructedHash() → string | null
         */
        getReconstructedHash() {
            return this.#reconstructedHash;
        }
    }

    /* ======================================================================
       INTERFACE PÚBLICA
       ====================================================================== */

    const PUBLIC_API = Object.freeze({
        _INSTALLED: true,
        _VERSION: '2.0.0-QUORUM-FINAL',
        _CONFORMIDADE: ['Art. 125.º CPP', 'ISO/IEC 27037:2012', 'DORA (UE) 2022/2554'],

        // Exportar classes
        ShamirSSS: ShamirSSS,
        QuorumValidator: QuorumValidator,
        CustodyLog: CustodyLog,

        // Funções auxiliares
        hexToBuffer: _hexToBuffer,
        bufferToHex: _bufferToHex,
        sha256: _sha256
    });

    // Registar no window
    Object.defineProperty(root, 'UNIFED_CUSTODY_V2', {
        value: PUBLIC_API,
        writable: false,
        configurable: false,
        enumerable: true
    });

    // Disparar evento de prontidão
    root.dispatchEvent(new CustomEvent('UNIFED_CUSTODY_V2_READY', {
        detail: {
            version: PUBLIC_API._VERSION,
            timestamp: new Date().toISOString()
        }
    }));

    console.log('[CUSTODY-V2] ✅ UNIFED_CUSTODY_V2 v' + PUBLIC_API._VERSION + ' instalado.');

})(window);

/* ======================================================================
   FUNÇÃO PÚBLICA: _validateQuorumAndUnlock(fragment1, fragment2, masterHashTarget)
   
   Esta função é chamada pelo formulário HTML após o utilizador inserir
   os dois fragmentos. Orquestra a reconstrução, validação e desbloqueio da UI.
   ====================================================================== */

window._validateQuorumAndUnlock = async function (fragment1, fragment2, masterHashTarget) {
    console.log('[QUORUM-ORCHESTRATION] Iniciando validação de quórum...');

    // Verificar que o módulo V2 está instalado
    if (!window.UNIFED_CUSTODY_V2) {
        console.error('[QUORUM] Módulo UNIFED_CUSTODY_V2 não está carregado.');
        return {
            success: false,
            error: 'Módulo de custódia não carregado. Recarregue a página.'
        };
    }

    try {
        // Instanciar validador
        const validator = new window.UNIFED_CUSTODY_V2.QuorumValidator(masterHashTarget);

        // Validar fragmentos
        const result = await validator.validateFragments(fragment1, fragment2);

        if (result.valid) {
            console.log('[QUORUM-ORCHESTRATION] ✅ Quórum validado com sucesso!');
            console.log('[QUORUM-ORCHESTRATION] Desbloqueando interface...');

            // Disparar evento de desbloqueio
            window.dispatchEvent(new CustomEvent('UNIFED_QUORUM_VALIDATED', {
                detail: {
                    reconstructedHash: result.hash,
                    timestamp: new Date().toISOString()
                }
            }));

            // Desabilitar formulário de quórum
            const quorumForm = document.getElementById('quorumForm');
            if (quorumForm) {
                quorumForm.style.display = 'none';
            }

            // Mostrar dashboard
            const dashboard = document.getElementById('pureDashboardWrapper');
            if (dashboard) {
                dashboard.style.opacity = '1';
                dashboard.style.display = 'block';
            }

            return {
                success: true,
                hash: result.hash,
                log: validator.getLog()
            };

        } else {
            console.error('[QUORUM-ORCHESTRATION] ❌ Quórum inválido.');
            console.error('[QUORUM-ORCHESTRATION] Esperado:', masterHashTarget);
            console.error('[QUORUM-ORCHESTRATION] Recebido:', result.hash);

            return {
                success: false,
                error: 'Hash não corresponde. Verifique os fragmentos e tente novamente.',
                log: validator.getLog()
            };
        }

    } catch (err) {
        console.error('[QUORUM-ORCHESTRATION] Erro durante validação:', err.message);
        return {
            success: false,
            error: err.message
        };
    }
};
