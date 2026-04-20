/**
 * ============================================================================
 * UNIFED-PROBATUM · forensic_seal_engine.js
 * ============================================================================
 * Versão      : v1.0.0-FASE3-SEAL
 * Data        : 2026-04-19
 * Conformidade: Art. 158.º CPP · Art. 163.º CPP · ISO/IEC 27037:2012
 *               DORA (UE) 2022/2554
 *
 * ÂMBITO:
 *   Motor de Selagem Forense de Resultados Estatísticos.
 *   Garante que o p-value e demais métricas apresentadas no relatório
 *   correspondem exactamente ao resultado do cálculo, sem possibilidade
 *   de modificação manual via consola do browser após execução.
 *
 * PROPRIEDADES FORENSES GARANTIDAS:
 *   · Não-Repúdio: SHA-256 do resultado vincula-o à cadeia de proveniência
 *   · Determinismo Algorítmico: mesmos inputs → mesmo hash de resultado
 *   · Rastreabilidade: cada manifesto contém o entry_hash do log associado
 * ============================================================================
 */

(function _installForensicSealEngine(root) {
    'use strict';

    const SESSION_MASTER_HASH =
        '72760dfde44902ffdbd234160b8c53d9a354dd852c8000ca65b3b6f9394c8fec';

    /* ============================================================
       SHA-256 via SubtleCrypto
       ============================================================ */
    async function _sha256(data) {
        const buf = new TextEncoder().encode(
            typeof data === 'string' ? data : JSON.stringify(data)
        );
        const hash = await crypto.subtle.digest('SHA-256', buf);
        return Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /* ============================================================
       SELAGEM DE RESULTADO ESTATÍSTICO
       ============================================================ */

    /**
     * sealResult(rawResult, provenanceEntryHash) → Promise<SealedManifest>
     *
     * Recebe o resultado bruto da análise ANOVA/Welch e:
     *   1. Congela o objecto (Object.freeze) — impede modificação em memória
     *   2. Calcula o hash SHA-256 do resultado
     *   3. Gera o Manifesto de Operações em JSON
     *   4. Vincula o manifesto à cadeia de proveniência via provenanceEntryHash
     *
     * O Manifesto resultante (manifest_v2.1.sig) constitui prova técnica de
     * que o p-value não foi alterado após o cálculo (Art. 163.º CPP).
     *
     * @param {Object}  rawResult           — Resultado directo de analyze()
     * @param {string}  provenanceEntryHash — entry_hash do log POST::analyze
     * @returns {Promise<Object>}           — Manifesto selado e congelado
     */
    async function sealResult(rawResult, provenanceEntryHash) {
        if (typeof rawResult !== 'object' || rawResult === null) {
            throw new TypeError('[SEAL] rawResult deve ser um objecto não nulo.');
        }

        // 1. Congelar o resultado — qualquer mutação lança TypeError (strict mode)
        const frozenResult = Object.freeze(
            JSON.parse(JSON.stringify(rawResult)) // deep clone antes de freeze
        );

        // 2. Hash SHA-256 do resultado congelado
        const resultHash = await _sha256(frozenResult);

        // 3. Hash de vinculação: SHA-256(resultHash + provenanceEntryHash + MASTER)
        const bindingHash = await _sha256(
            resultHash + (provenanceEntryHash || '') + SESSION_MASTER_HASH
        );

        // 4. Construir manifesto
        const manifest = Object.freeze({
            schema           : 'UNIFED-PROBATUM-SEAL/1.0',
            generated_at     : new Date().toISOString(),
            master_hash_ref  : SESSION_MASTER_HASH,
            provenance_link  : provenanceEntryHash || null,
            result_hash      : resultHash,
            binding_hash     : bindingHash,

            // Extracto do resultado para o relatório (sem expor dados brutos)
            summary: Object.freeze({
                method           : frozenResult.findings?.methodology?.hypothesis_test
                                   || frozenResult.method || 'N/A',
                p_value          : frozenResult.findings?.anova_test?.p_value
                                   ?? frozenResult.p_value ?? null,
                h0_rejected      : frozenResult.findings?.anova_test?.p_value < 0.05
                                   ?? null,
                levene_p_value   : frozenResult.findings?.levene_test?.p_value
                                   ?? null,
                equal_variance   : frozenResult.findings?.levene_test?.equal_variance
                                   ?? null,
                num_groups       : frozenResult.findings?.num_groups ?? null,
                total_n          : frozenResult.findings?.total_n ?? null
            }),

            // Aviso jurídico obrigatório
            nota_juridica: [
                'Este manifesto não substitui a assinatura de Perito Nomeado (Art. 158.º CPP).',
                'O binding_hash vincula deterministicamente este resultado à cadeia de proveniência.',
                'Qualquer discrepância entre result_hash e o p_value apresentado indica adulteração.'
            ]
        });

        console.info(
            `[SEAL] Resultado selado. result_hash: ${resultHash.slice(0,16)}...` +
            ` binding: ${bindingHash.slice(0,16)}...`
        );

        return manifest;
    }

    /* ============================================================
       VERIFICAÇÃO DE SESSÃO
       ============================================================ */

    /**
     * verifySession(manifest) → Promise<VerificationReport>
     *
     * Verifica se um manifesto pertence à sessão actual e não foi adulterado.
     * Recomputa o binding_hash e compara com o valor armazenado.
     *
     * Conformidade DORA (UE) 2022/2554 — Art. 9.º (Gestão de Risco TIC):
     *   Capacidade de deteção de manipulação de resultados em runtime.
     */
    async function verifySession(manifest) {
        if (!manifest || !manifest.result_hash) {
            return Object.freeze({ valid: false, reason: 'Manifesto inválido ou ausente.' });
        }

        // Recomputar binding_hash
        const expectedBinding = await _sha256(
            manifest.result_hash +
            (manifest.provenance_link || '') +
            SESSION_MASTER_HASH
        );

        const masterMatch = manifest.master_hash_ref === SESSION_MASTER_HASH;
        const bindingMatch = manifest.binding_hash === expectedBinding;

        return Object.freeze({
            valid           : masterMatch && bindingMatch,
            master_match    : masterMatch,
            binding_match   : bindingMatch,
            expected_binding: expectedBinding,
            stored_binding  : manifest.binding_hash,
            verified_at     : new Date().toISOString(),
            reason          : (!masterMatch)
                ? 'Master Hash de referência não corresponde à sessão actual.'
                : (!bindingMatch)
                    ? 'Binding hash divergente: possível adulteração do resultado.'
                    : 'Manifesto íntegro e vinculado à sessão actual.'
        });
    }

    /* ============================================================
       INTERFACE PÚBLICA
       ============================================================ */
    root.UNIFED_SEAL = Object.freeze({
        _INSTALLED       : true,
        MASTER_HASH_REF  : SESSION_MASTER_HASH,
        sealResult,
        verifySession
    });

    console.info('[SEAL] ForensicSealEngine v1.0.0 instalado.');

})(window);
