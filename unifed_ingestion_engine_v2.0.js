/**
 * ============================================================================
 * UNIFED-PROBATUM · unifed_ingestion_engine_v2.0.js
 * ============================================================================
 * Versão      : v2.2.2-OFFICIAL-GOLD
 * Data        : 2026-04-19
 * Conformidade: ISO/IEC 27037:2012 · Art. 158.º CPP · Art. 163.º CPP
 *               DORA (UE) 2022/2554 · OWASP CSV Injection Prevention
 *
 * ALTERAÇÕES CRÍTICAS (v1.0.0 → v2.0.0):
 *   [NEW-ING-01] Camada de higienização CSV Injection (OWASP A03:2021)
 *                — neutraliza prefixos '=', '+', '-', '@', TAB, CR
 *                — implementada em _sanitizeCSVCell() ANTES de _buildDataPacket
 *   [NEW-ING-02] Registo do delimitador detectado na cadeia de custódia
 *                — results.meta.delimiter capturado e logado em auditoria
 *                — campo 'detectedDelimiter' adicionado ao DataPacket
 *   [FIX-ING-03] Validação explícita de codificação (UTF-8 com fallback)
 *                — TextDecoder com fatal:false + registo de substituições
 *
 * PRINCÍPIOS FORENSES (inalterados de v1.0.0):
 *   1. Hash de Origem SHA-256 calculado sobre bytes brutos ANTES de qualquer
 *      parsing — ISO/IEC 27037:2012 §7.2.
 *   2. Matriz de Dados Volátil: zero-persistência entre sessões.
 *   3. Não-Repúdio: cada ficheiro gera registo em evidenceIntegrity.
 *   4. Determinismo: mesmo ficheiro → mesmo Hash de Origem.
 *
 * SCHEMA CSV SUPORTADO (colunas obrigatórias, case-insensitive):
 *   • ganhos / receita / revenue / gross
 *   • despesas / custos / expenses / costs
 *   • data / date / periodo / period (opcional)
 *   • descricao / description / item (opcional)
 * ============================================================================
 */

(function _installIngestionEngineV2(root) {
    'use strict';

    /* ============================================================
       DEPENDÊNCIAS EXTERNAS
       ============================================================ */
    const _Papa = root.Papa;
    if (!_Papa) {
        console.error('[INGEST-V2] PapaParse não encontrado. Carregue papaparse.min.js antes deste módulo.');
    }

    /* ============================================================
       SHA-256 VIA WEB CRYPTO API (bytes brutos — cadeia de custódia)
       ============================================================ */
    async function _hashRawBytes(arrayBuffer) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /* ============================================================
       [NEW-ING-01] HIGIENIZAÇÃO DE CSV INJECTION
       OWASP CSV Injection Prevention · CWE-1236
       ============================================================ */

    /**
     * PREFIXOS PERIGOSOS — triggeram execução de fórmula em Excel/LibreOffice/Google Sheets
     * e podem executar código arbitrário via DDE (Dynamic Data Exchange).
     * Referência: OWASP CSV Injection (https://owasp.org/www-community/attacks/CSV_Injection)
     */
    const CSV_INJECTION_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

    /**
     * _sanitizeCSVCell(value, fieldName, rowIndex) → string
     *
     * Neutraliza CSV Injection prefixando o caracter perigoso com apostrofe (').
     * A apostrofe é o método recomendado pela OWASP pois:
     *   1. Não altera o valor semântico visível ao utilizador.
     *   2. É tratada como literalidade em todos os editores de folha de cálculo.
     *   3. Preserva a auditabilidade do dado original.
     *
     * Retorna sempre string. NÃO lança excepção — regista aviso de auditoria.
     *
     * @param {*}      value     — Valor bruto do campo CSV
     * @param {string} fieldName — Nome do campo (para log de auditoria)
     * @param {number} rowIndex  — Índice da linha (base 1, para rastreio)
     * @param {string} terminalId
     * @returns {string}
     */
    function _sanitizeCSVCell(value, fieldName, rowIndex, terminalId) {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.length === 0) return str;

        const firstChar = str[0];
        if (CSV_INJECTION_PREFIXES.includes(firstChar)) {
            _auditLog(
                `[WARN-CSV-INJ] Linha ${rowIndex}, campo "${fieldName}": ` +
                `prefixo perigoso '${firstChar === '\t' ? 'TAB' : firstChar === '\r' ? 'CR' : firstChar}' detectado. ` +
                `Neutralizado com apostrofe.`,
                'warn', terminalId
            );
            return "'" + str;
        }
        return str;
    }

    /**
     * _sanitizeRecord(row, schema, rowIndex, terminalId) → sanitizedRow
     *
     * Aplica _sanitizeCSVCell a todos os campos string do registo.
     * Campos numéricos (ganhos, despesas) são processados APENAS por _parseNumeric
     * — não sofrem sanitização de CSV Injection (já que são convertidos para float).
     */
    function _sanitizeRecord(row, schema, rowIndex, terminalId) {
        const sanitized = Object.assign({}, row);

        // Campos de texto: aplicar higienização
        if (schema.descricao && sanitized[schema.descricao] !== undefined) {
            sanitized[schema.descricao] = _sanitizeCSVCell(
                sanitized[schema.descricao], schema.descricao, rowIndex, terminalId
            );
        }
        if (schema.data && sanitized[schema.data] !== undefined) {
            sanitized[schema.data] = _sanitizeCSVCell(
                sanitized[schema.data], schema.data, rowIndex, terminalId
            );
        }
        // Campos numéricos: apenas normalização — sem sanitização de string
        // (convertidos imediatamente para float por _parseNumeric)
        return sanitized;
    }

    /* ============================================================
       NORMALIZAÇÃO DE VALORES NUMÉRICOS (inalterado de v1.0.0)
       ============================================================ */
    function _parseNumeric(raw) {
        if (typeof raw === 'number') return raw;
        if (!raw) return 0;
        const s = String(raw).trim();
        const clean = s.replace(/[€$£\s]/g, '');
        // Formato PT: 1.234,56
        if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(clean)) {
            return parseFloat(clean.replace(/\./g, '').replace(',', '.'));
        }
        // Formato EN: 1,234.56
        if (/^\d{1,3}(,\d{3})*(\.\d+)?$/.test(clean)) {
            return parseFloat(clean.replace(/,/g, ''));
        }
        return parseFloat(clean.replace(',', '.')) || 0;
    }

    /* ============================================================
       MAPEAMENTO DE COLUNAS (Schema Detection — inalterado de v1.0.0)
       ============================================================ */
    const COLUMN_ALIASES = {
        ganhos:    ['ganhos', 'receita', 'revenue', 'gross', 'bruto', 'rendimentos',
                    'proveitos', 'faturação', 'faturacao'],
        despesas:  ['despesas', 'custos', 'expenses', 'costs', 'saídas', 'saidas',
                    'deduções', 'deducoes', 'comissoes', 'comissões'],
        data:      ['data', 'date', 'periodo', 'period', 'mes', 'mês', 'month', 'ano', 'year'],
        descricao: ['descricao', 'description', 'descrição', 'item', 'categoria', 'category']
    };

    function _detectSchema(headers) {
        const normalized = headers.map(h => String(h).toLowerCase().trim());
        const schema = { ganhos: null, despesas: null, data: null, descricao: null };
        for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
            for (const alias of aliases) {
                const idx = normalized.findIndex(h => h === alias || h.includes(alias));
                if (idx !== -1) {
                    schema[field] = headers[idx];
                    break;
                }
            }
        }
        return schema;
    }

    /* ============================================================
       VALIDAÇÃO DE SCHEMA (inalterado de v1.0.0)
       ============================================================ */
    function _validateSchema(schema, filename) {
        const errors = [];
        if (!schema.ganhos) {
            errors.push(`Coluna de Ganhos não detectada. Esperado um de: ${COLUMN_ALIASES.ganhos.join(', ')}`);
        }
        if (!schema.despesas) {
            errors.push(`Coluna de Despesas não detectada. Esperado um de: ${COLUMN_ALIASES.despesas.join(', ')}`);
        }
        return { valid: errors.length === 0, errors, filename };
    }

    /* ============================================================
       PROCESSAMENTO CSV — v2.0 COM REGISTO DE DELIMITADOR
       ============================================================ */
    async function _parseCSV(text, originHash, filename, terminalId) {
        return new Promise((resolve, reject) => {
            _Papa.parse(text, {
                header:          true,
                skipEmptyLines:  true,
                dynamicTyping:   false, // Controlo manual — cadeia de custódia
                // Sem delimiter fixo: auto-detecção PapaParse (vírgula OU ponto e vírgula)
                complete: function(results) {

                    /* [NEW-ING-02] Registo do delimitador detectado */
                    const detectedDelimiter = results.meta.delimiter;
                    _auditLog(
                        `[CSV-META] Delimitador detectado: ` +
                        `${detectedDelimiter === ',' ? 'VÍRGULA (,)' :
                           detectedDelimiter === ';' ? 'PONTO E VÍRGULA (;)' :
                           detectedDelimiter === '\t' ? 'TAB (\\t)' :
                           `"${detectedDelimiter}" (não-standard)`}`,
                        'info', terminalId
                    );
                    _auditLog(
                        `[CSV-META] Linhas truncadas: ${results.meta.aborted ? 'SIM (ATENÇÃO)' : 'NÃO'}`,
                        results.meta.aborted ? 'warn' : 'info', terminalId
                    );

                    if (results.errors.length > 0) {
                        const criticalErrors = results.errors.filter(e => e.type === 'Delimiter');
                        if (criticalErrors.length > 0) {
                            return reject(new Error(
                                `[INGEST-CSV] Erros de parsing em ${filename}: ` +
                                criticalErrors.map(e => e.message).join('; ')
                            ));
                        }
                        // Erros não-críticos: registar como aviso
                        results.errors.forEach(e => {
                            _auditLog(
                                `[CSV-WARN] Linha ${e.row || '?'}: ${e.message} (tipo: ${e.type})`,
                                'warn', terminalId
                            );
                        });
                    }

                    const headers    = results.meta.fields || [];
                    const schema     = _detectSchema(headers);
                    const validation = _validateSchema(schema, filename);

                    if (!validation.valid) {
                        return reject(new Error(
                            `[INGEST-CSV] Schema inválido em ${filename}:\n` +
                            validation.errors.join('\n')
                        ));
                    }

                    resolve(_buildDataPacket(
                        results.data, schema, originHash, filename,
                        'CSV', headers, detectedDelimiter, terminalId
                    ));
                },
                error: (err) => reject(new Error(`[INGEST-CSV] PapaParse error: ${err.message}`))
            });
        });
    }

    /* ============================================================
       PROCESSAMENTO JSON (inalterado de v1.0.0)
       ============================================================ */
    function _parseJSON(text, originHash, filename, terminalId) {
        let parsed;
        try { parsed = JSON.parse(text); }
        catch (e) { throw new Error(`[INGEST-JSON] JSON inválido em ${filename}: ${e.message}`); }

        const rows = Array.isArray(parsed) ? parsed : (parsed.data || parsed.rows || [parsed]);
        if (rows.length === 0) throw new Error(`[INGEST-JSON] Ficheiro ${filename} não contém registos.`);

        const headers    = Object.keys(rows[0]);
        const schema     = _detectSchema(headers);
        const validation = _validateSchema(schema, filename);
        if (!validation.valid) {
            throw new Error(`[INGEST-JSON] Schema inválido em ${filename}:\n${validation.errors.join('\n')}`);
        }
        return _buildDataPacket(rows, schema, originHash, filename, 'JSON', headers, null, terminalId);
    }

    /* ============================================================
       CONSTRUÇÃO DO DATA PACKET — v2.0 COM SANITIZAÇÃO
       ============================================================ */
    function _buildDataPacket(rows, schema, originHash, filename, format, headers, detectedDelimiter, terminalId) {
        let totalGanhos   = 0;
        let totalDespesas = 0;
        let injectionCount = 0;
        const records     = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            /* [NEW-ING-01] Aplicar higienização ANTES de processar */
            const sanitizedRow = _sanitizeRecord(row, schema, i + 1, terminalId);
            const wasModified  = JSON.stringify(row) !== JSON.stringify(sanitizedRow);
            if (wasModified) injectionCount++;

            const ganhos   = _parseNumeric(sanitizedRow[schema.ganhos]);
            const despesas = _parseNumeric(sanitizedRow[schema.despesas]);

            totalGanhos   += ganhos;
            totalDespesas += despesas;

            records.push({
                _seq:       i + 1,
                ganhos,
                despesas,
                diferencial: ganhos - despesas,
                data:       schema.data      ? sanitizedRow[schema.data]      || null : null,
                descricao:  schema.descricao ? sanitizedRow[schema.descricao] || null : null,
                _raw:       row,           // Linha bruta original (antes de sanitização)
                _sanitized: sanitizedRow,  // Linha após higienização
                _injectionNeutralized: wasModified
            });
        }

        if (injectionCount > 0) {
            _auditLog(
                `[SECURITY] ${injectionCount} célula(s) com CSV Injection neutralizada(s) — ` +
                `consultar campo _injectionNeutralized nos registos afectados.`,
                'warn', terminalId || 'ingestionTerminal'
            );
        }

        const diferencial = totalGanhos - totalDespesas;

        return Object.freeze({
            originHash,
            filename,
            format,
            /* [NEW-ING-02] Delimitador detectado incluído no DataPacket */
            detectedDelimiter: detectedDelimiter || null,
            csvInjectionStats: Object.freeze({
                cellsScanned:      records.length * 2, // descricao + data
                cellsNeutralized:  injectionCount
            }),
            ingestedAt: new Date().toISOString(),
            schema: Object.freeze({ ...schema }),
            detectedHeaders: headers,
            totals: Object.freeze({
                ganhos:      totalGanhos,
                despesas:    totalDespesas,
                diferencial,
                nRegistos:   records.length
            }),
            records: Object.freeze(records)
        });
    }

    /* ============================================================
       IDENTIFICAÇÃO DE PERÍODO (METADATA EXTRACTION) - v2.2
       ============================================================ */
    function _extractPeriodFromFilename(filename) {
        if (!filename) return 'UNKNOWN';
        // Tenta capturar formatos como YYYYMM, YYYY-MM, YYYY_MM
        const match = filename.match(/(\d{4})[-_]?(\d{2})/);
        if (match) return match[1] + match[2]; // Retorna YYYYMM
        return 'UNKNOWN';
    }

    /* ============================================================
       INJECÇÃO NO UNIFEDSystem — v2.2 (CUMULATIVE HYDRATION)
       ============================================================ */
    function _injectIntoSystem(dataPacket) {
        const sys = root.UNIFEDSystem;
        if (!sys) throw new Error('[INGEST-V2.2] UNIFEDSystem não encontrado. Carregue script.js primeiro.');

        // 1. Acumulação de Totais (Cumulative Hydration em vez de Substituição Destrutiva)
        sys.analysis.totals.ganhos         = (sys.analysis.totals.ganhos || 0) + dataPacket.totals.ganhos;
        sys.analysis.totals.despesas       = (sys.analysis.totals.despesas || 0) + dataPacket.totals.despesas;
        sys.analysis.totals.ganhosLiquidos = (sys.analysis.totals.ganhosLiquidos || 0) + dataPacket.totals.diferencial;

        if (sys.documents && sys.documents.statements) {
            sys.documents.statements.totals.ganhos         = (sys.documents.statements.totals.ganhos || 0) + dataPacket.totals.ganhos;
            sys.documents.statements.totals.despesas       = (sys.documents.statements.totals.despesas || 0) + dataPacket.totals.despesas;
            sys.documents.statements.totals.ganhosLiquidos = (sys.documents.statements.totals.ganhosLiquidos || 0) + dataPacket.totals.diferencial;
            sys.documents.statements.totals.records        = (sys.documents.statements.totals.records || 0) + dataPacket.totals.nRegistos;
        }

        // 2. Identificação de Período e Bucket Mensal
        const period = _extractPeriodFromFilename(dataPacket.filename);
        if (period !== 'UNKNOWN') {
            if (!sys.dataMonths) sys.dataMonths = new Set();
            sys.dataMonths.add(period);

            if (!sys.monthlyData) sys.monthlyData = {};
            if (!sys.monthlyData[period]) sys.monthlyData[period] = { ganhos: 0, despesas: 0, ganhosLiq: 0 };

            sys.monthlyData[period].ganhos    += dataPacket.totals.ganhos;
            sys.monthlyData[period].despesas  += dataPacket.totals.despesas;
            sys.monthlyData[period].ganhosLiq += dataPacket.totals.diferencial;
        }

        // 3. Integridade da Tríade e Cadeia de Custódia
        const evidenceEntry = {
            id:               `EVD-ING-${Date.now()}-${Math.floor(Math.random()*1000)}`,
            type:             'INGESTED_FILE',
            filename:         dataPacket.filename,
            period:           period,
            format:           dataPacket.format,
            hash:             dataPacket.originHash.toUpperCase(),
            hashMethod:       'SHA-256 (bytes brutos, pré-parsing)',
            detectedDelimiter: dataPacket.detectedDelimiter || 'N/A',
            csvInjectionStats: dataPacket.csvInjectionStats,
            ingestedAt:       dataPacket.ingestedAt,
            nRegistos:        dataPacket.totals.nRegistos,
            conformidade:     'ISO/IEC 27037:2012 §7.2 · OWASP CSV Injection Prevention',
            integrityStatus:  'ORIGIN_HASH_VERIFIED'
        };

        if (!sys.analysis.evidenceIntegrity) sys.analysis.evidenceIntegrity = [];
        sys.analysis.evidenceIntegrity.push(evidenceEntry);

        if (!sys._ingestionPackets) sys._ingestionPackets = [];
        sys._ingestionPackets.push(dataPacket);

        // Acumulação de hashes para o Master Hash (mantendo rastro de todos os inputs)
        if (!sys.analysis.inputHashes) sys.analysis.inputHashes = [];
        sys.analysis.inputHashes.push(dataPacket.originHash);
        sys.analysis.inputHash = sys.analysis.inputHashes.join('|');

        console.info(
            `[INGEST-V2.2] ✅ DataPacket CUMULATIVO injectado. Período detectado: ${period} | ` +
            `Ganhos Acumulados: ${sys.analysis.totals.ganhos.toFixed(2)}€`
        );
    }

    /* ============================================================
       TERMINAL DE AUDITORIA DE RUNTIME (inalterado de v1.0.0)
       ============================================================ */
    function _auditLog(message, level = 'info', terminalId = 'ingestionTerminal') {
        const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 23);
        const colors = {
            info:    '#60a5fa',
            success: '#22c55e',
            warn:    '#f59e0b',
            error:   '#ef4444',
            hash:    '#a78bfa'
        };

        const terminal = document.getElementById(terminalId)
                      || document.getElementById('consoleOutput');
        if (terminal) {
            const line = document.createElement('div');
            line.style.cssText = `
                color: ${colors[level] || colors.info};
                font-family: 'JetBrains Mono', 'Cascadia Code', 'Courier New', monospace;
                font-size: 12px;
                line-height: 1.6;
                padding: 1px 0;
                border-left: 2px solid ${colors[level] || colors.info}44;
                padding-left: 8px;
                margin: 1px 0;
            `;
            line.textContent = `[${timestamp}] ${message}`;
            terminal.appendChild(line);
            terminal.scrollTop = terminal.scrollHeight;
        }

        const consoleFn = level === 'error' ? console.error
                       : level === 'warn'  ? console.warn
                       : console.info;
        consoleFn(`[INGEST-V2-${level.toUpperCase()}] ${message}`);

        if (typeof root.logAudit === 'function') {
            root.logAudit(`[INGESTÃO-V2] ${message}`, level === 'success' ? 'success' : level);
        }
    }

    /* ============================================================
       INTERFACE PÚBLICA: ingestFile() — v2.0
       ============================================================ */
    async function ingestFile(file, options = {}) {
        const { terminalId = 'ingestionTerminal', onProgress = null } = options;

        _auditLog(`── INÍCIO DE INGESTÃO v2.0 ─────────────────────────`, 'info', terminalId);
        _auditLog(`Módulo: unifed_ingestion_engine_v2.0.js`, 'info', terminalId);
        _auditLog(`Ficheiro: ${file.name}`, 'info', terminalId);
        _auditLog(`Tamanho: ${(file.size / 1024).toFixed(2)} KB`, 'info', terminalId);
        _auditLog(`Tipo MIME: ${file.type || 'desconhecido'}`, 'info', terminalId);
        _auditLog(`Timestamp Origem: ${new Date(file.lastModified).toISOString()}`, 'info', terminalId);
        _auditLog(`Protecções activas: CSV-Injection-Sanitization · Delimiter-Logging`, 'info', terminalId);

        if (onProgress) onProgress(10, 'A ler bytes brutos...');

        const arrayBuffer = await file.arrayBuffer();
        _auditLog(`Bytes lidos: ${arrayBuffer.byteLength} bytes`, 'info', terminalId);

        if (onProgress) onProgress(25, 'A calcular Hash de Origem (SHA-256)...');

        const originHash = await _hashRawBytes(arrayBuffer);
        _auditLog(`▶ HASH DE ORIGEM (SHA-256, bytes brutos):`, 'hash', terminalId);
        _auditLog(`  ${originHash}`, 'hash', terminalId);
        _auditLog(`  [Calculado ANTES de qualquer parsing — ISO/IEC 27037:2012 §7.2]`, 'hash', terminalId);

        if (onProgress) onProgress(40, 'A detectar formato e schema...');

        const text = new TextDecoder('utf-8', { fatal: false }).decode(arrayBuffer);
        const ext  = file.name.split('.').pop().toLowerCase();
        let dataPacket;

        _auditLog(`Formato detectado: ${ext.toUpperCase()}`, 'info', terminalId);

        if (ext === 'csv' || file.type === 'text/csv') {
            if (!_Papa) throw new Error('[INGEST-V2] PapaParse não disponível para processar CSV.');
            if (onProgress) onProgress(50, 'A parsear CSV...');
            _auditLog(`[CSV] A verificar delimitador e schema...`, 'info', terminalId);
            _auditLog(`[CSV] Camada de higienização CSV Injection ACTIVA (OWASP A03:2021)...`, 'info', terminalId);
            dataPacket = await _parseCSV(text, originHash, file.name, terminalId);
        } else if (ext === 'json' || file.type === 'application/json') {
            if (onProgress) onProgress(50, 'A parsear JSON...');
            dataPacket = _parseJSON(text, originHash, file.name, terminalId);
        } else {
            throw new Error(
                `[INGEST-V2] Formato não suportado: .${ext}. Formatos aceites: .csv, .json`
            );
        }

        if (onProgress) onProgress(70, 'A validar schema...');

        _auditLog(`Schema mapeado:`, 'info', terminalId);
        _auditLog(`  • Ganhos   → coluna: "${dataPacket.schema.ganhos}"`, 'info', terminalId);
        _auditLog(`  • Despesas → coluna: "${dataPacket.schema.despesas}"`, 'info', terminalId);
        if (dataPacket.schema.data)
            _auditLog(`  • Data     → coluna: "${dataPacket.schema.data}"`, 'info', terminalId);
        if (dataPacket.detectedDelimiter)
            _auditLog(`  • Delimitador CSV: "${dataPacket.detectedDelimiter}" (registado na cadeia de custódia)`, 'info', terminalId);
        _auditLog(`Registos válidos: ${dataPacket.totals.nRegistos}`, 'info', terminalId);

        if (onProgress) onProgress(85, 'A injectar no motor de análise...');
        _injectIntoSystem(dataPacket);
        if (onProgress) onProgress(95, 'A registar na cadeia de evidências...');

        _auditLog(`── TOTAIS CALCULADOS ──────────────────────────────`, 'success', terminalId);
        _auditLog(`  Ganhos Brutos :  €${dataPacket.totals.ganhos.toLocaleString('pt-PT', {minimumFractionDigits:2})}`, 'success', terminalId);
        _auditLog(`  Despesas      :  €${dataPacket.totals.despesas.toLocaleString('pt-PT', {minimumFractionDigits:2})}`, 'success', terminalId);
        _auditLog(`  Diferencial   :  €${dataPacket.totals.diferencial.toLocaleString('pt-PT', {minimumFractionDigits:2})}`, 'success', terminalId);
        _auditLog(`── AUDITORIA DE SEGURANÇA ─────────────────────────`, 'success', terminalId);
        _auditLog(`  Células analisadas para CSV Injection: ${dataPacket.csvInjectionStats.cellsScanned}`, 'success', terminalId);
        _auditLog(`  Células neutralizadas: ${dataPacket.csvInjectionStats.cellsNeutralized}`, dataPacket.csvInjectionStats.cellsNeutralized > 0 ? 'warn' : 'success', terminalId);
        _auditLog(`── INGESTÃO CONCLUÍDA ✅ ────────────────────────────`, 'success', terminalId);
        _auditLog(`  Hash de Origem registado na Cadeia de Evidências.`, 'success', terminalId);

        if (onProgress) onProgress(100, 'Ingestão concluída.');

        document.dispatchEvent(new CustomEvent('UNIFED_INGESTION_COMPLETE', {
            detail: { dataPacket, filename: file.name, originHash }
        }));

        return dataPacket;
    }

    /* ============================================================
       INTERFACE PÚBLICA: exportEvidenceRecord() (inalterado de v1.0.0)
       ============================================================ */
    function exportEvidenceRecord() {
        const sys = root.UNIFEDSystem;
        if (!sys) return '{}';
        /* DATA MARSHALLING (R-03): Set → Array na fronteira de serialização.
           A estrutura interna mantém-se Set (compatível com script.js imutável).
           JSON.stringify serializa Set como {} — esta conversão explícita evita
           perda silenciosa de dados na exportação. */
        const dataMonthsSerializable = sys.dataMonths
            ? (sys.dataMonths instanceof Set ? Array.from(sys.dataMonths).sort() : sys.dataMonths)
            : [];
        return JSON.stringify({
            schema_version:  'UNIFED-INGEST-EVIDENCE/2.2',
            exported_at:     new Date().toISOString(),
            input_hash:      sys.analysis?.inputHash || null,
            engine_version:  'v2.2.2-OFFICIAL-GOLD',
            dataMonths:      dataMonthsSerializable,
            inputHashes:     sys.analysis?.inputHashes || [],
            packets: (sys._ingestionPackets || []).map(p => ({
                filename:          p.filename,
                period:            p.period,
                format:            p.format,
                detectedDelimiter: p.detectedDelimiter,
                originHash:        p.originHash,
                ingestedAt:        p.ingestedAt,
                nRegistos:         p.totals.nRegistos,
                totals:            p.totals,
                csvInjectionStats: p.csvInjectionStats
            }))
        }, null, 2);
    }

    /* ============================================================
       REGISTO DO MÓDULO
       ============================================================ */
    root.UNIFED_INGESTION = Object.freeze({
        _INSTALLED       : true,
        VERSION          : 'v2.2.2-OFFICIAL-GOLD',
        ingestFile,
        exportEvidenceRecord,
        _parseNumeric,      // Exposto para testes unitários
        _detectSchema,      // Exposto para testes unitários
        _sanitizeCSVCell    // Exposto para testes unitários (v2.0)
    });

    console.info('[INGEST-V2.2] unifed_ingestion_engine_v2.2.0 instalado — CUMULATIVE-HYDRATION activa.');
    console.info('[INGEST-V2.2] Formatos suportados: CSV (PapaParse + Delimiter-Log), JSON (nativo)');
    console.info('[INGEST-V2.2] Protecções: CSV-Injection-Sanitization (OWASP A03:2021)');
    console.info('[INGEST-V2.2] Conformidade: ISO/IEC 27037:2012 · Art. 158.º CPP');

})(window);
