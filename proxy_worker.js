/**
 * ============================================================================
 * UNIFED - PROBATUM · CLOUDFLARE WORKER — Anthropic API Reverse Proxy + OTS Proxy
 * ============================================================================
 * Versão     : v13.12.1-FIX (consolidado)
 * Deploy URL  : https://api.unifed.com/claude-proxy
 * Rotas       : POST /claude-proxy  →  forward para api.anthropic.com/v1/messages
 *             : GET  /ots-proxy     →  forward dinâmico para URL fornecida (CORS-safe)
 *             : GET  /health        →  health check (retorna 200)
 *
 * OBJECTIVO:
 *   Resolver o bloqueio CORS estrito da API da Anthropic e também de CDNs externas
 *   (OpenTimestamps, etc.) fornecendo um proxy que injecta cabeçalhos
 *   Access-Control-Allow-Origin: * e Content-Type adequado.
 *
 * SEGURANÇA:
 *   · x-api-key NUNCA é exposto no front-end.
 *   · A chave é lida exclusivamente da variável de ambiente ANTHROPIC_API_KEY.
 *   · O proxy OTS restringe os domínios permitidos (whitelist) para evitar abuso.
 *   · Rate limiting recomendado via Cloudflare Rate Limiting Rules.
 *   · CORS com whitelist estrita (apenas domínios oficiais).
 *
 * DEPLOY:
 *   1. wrangler deploy (ou Cloudflare Dashboard → Workers → Novo Worker)
 *   2. Definir variável de ambiente: ANTHROPIC_API_KEY = sk-ant-...
 *   3. Configurar Custom Domain: api.unifed.com → este Worker
 *   4. (Opcional) Adicionar regra de Rate Limiting: 60 req/min por IP
 *
 * CONFORMIDADE: DORA (UE) 2022/2554 · RGPD · ISO/IEC 27037:2012 · eIDAS
 * ============================================================================
 */

/** Versão do Worker — sincronizada com o ciclo de release UNIFED-PROBATUM. */
const VERSION = "13.12.1-FIX";

// Whitelist de domínios permitidos para o proxy OTS (segurança)
const ALLOWED_OTS_DOMAINS = [
    'unpkg.com',
    'cdn.jsdelivr.net',
    'raw.githubusercontent.com',
    'github.com',
    'cdn.skypack.dev',
    'esm.sh'
];

// Whitelist de origens CORS permitidas (segurança estrita)
const ALLOWED_CORS_ORIGINS = [
    'https://unifed.com',
    'https://api.unifed.com'
    // 'http://localhost:5500'   // Descomentar apenas para desenvolvimento
];

// ES Modules format — obrigatório para Cloudflare Workers (module workers)
export default {

    /**
     * Ponto de entrada do Worker.
     * @param {Request} request   - Pedido HTTP recebido do front-end
     * @param {Object}  env       - Variáveis de ambiente (ANTHROPIC_API_KEY, etc.)
     * @param {Object}  ctx       - ExecutionContext (ctx.waitUntil, ctx.passThroughOnException)
     * @returns {Response}
     */
    async fetch(request, env, ctx) {

        // ── 1. PRE-FLIGHT CORS (OPTIONS) ──────────────────────────────────────
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: getHeaders(request)
            });
        }

        // ── 2. HEALTH CHECK (GET /health ou GET /) ─────────────────────────────
        const url = new URL(request.url);
        if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
            return new Response(JSON.stringify({
                status: 'ok',
                version: VERSION,
                service: 'UNIFED-API-Gateway'
            }), {
                status: 200,
                headers: {
                    ...getHeaders(request),
                    'Content-Type': 'application/json'
                }
            });
        }

        // ── 3. ROTA ESPECIAL: PROXY DINÂMICO PARA OPENTIMESTAMPS (OTS) E OUTRAS CDNs ──
        if (url.pathname === '/ots-proxy' && request.method === 'GET') {
            // Obter a URL alvo a partir do parâmetro 'url'
            const targetUrlParam = url.searchParams.get('url');
            if (!targetUrlParam) {
                return new Response(JSON.stringify({ error: 'Missing ?url parameter' }), {
                    status: 400,
                    headers: {
                        ...getHeaders(request),
                        'Content-Type': 'application/json'
                    }
                });
            }

            let targetUrl;
            try {
                targetUrl = new URL(targetUrlParam);
            } catch (_) {
                return new Response(JSON.stringify({ error: 'Invalid URL parameter' }), {
                    status: 400,
                    headers: {
                        ...getHeaders(request),
                        'Content-Type': 'application/json'
                    }
                });
            }

            // Restringir apenas a protocolos seguros e domínios autorizados
            if (targetUrl.protocol !== 'https:' && targetUrl.protocol !== 'http:') {
                return new Response(JSON.stringify({ error: 'Only HTTP/HTTPS allowed' }), {
                    status: 403,
                    headers: {
                        ...getHeaders(request),
                        'Content-Type': 'application/json'
                    }
                });
            }

            if (!ALLOWED_OTS_DOMAINS.includes(targetUrl.hostname)) {
                console.warn(`[UNIFED-PROXY] Domínio não autorizado no proxy OTS: ${targetUrl.hostname}`);
                return new Response(JSON.stringify({ error: 'Domain not allowed' }), {
                    status: 403,
                    headers: {
                        ...getHeaders(request),
                        'Content-Type': 'application/json'
                    }
                });
            }

            try {
                let otsResponse = await fetch(targetUrl.toString(), {
                    headers: {
                        'User-Agent': 'UNIFED-Forensic-Bot/1.0'
                    }
                });

                // Re-encapsular com cabeçalhos permissivos e seguros
                const newHeaders = new Headers(otsResponse.headers);
                const corsHeaders = getHeaders(request);
                Object.keys(corsHeaders).forEach(key => {
                    newHeaders.set(key, corsHeaders[key]);
                });
                // Preservar o Content-Type original ou forçar JS quando aplicável
                let contentType = otsResponse.headers.get('Content-Type');
                if (!contentType || contentType.includes('text/plain')) {
                    if (targetUrl.pathname.endsWith('.js')) {
                        contentType = 'application/javascript';
                    } else if (targetUrl.pathname.endsWith('.css')) {
                        contentType = 'text/css';
                    } else {
                        contentType = contentType || 'application/octet-stream';
                    }
                }
                newHeaders.set('Content-Type', contentType);
                newHeaders.set('Cache-Control', 'public, max-age=86400');

                return new Response(otsResponse.body, {
                    status: otsResponse.status,
                    headers: newHeaders
                });
            } catch (err) {
                console.error('[UNIFED-PROXY] Erro ao buscar recurso externo:', err.message);
                return new Response(JSON.stringify({ error: 'OTS proxy fetch failed', detail: err.message }), {
                    status: 502,
                    headers: {
                        ...getHeaders(request),
                        'Content-Type': 'application/json'
                    }
                });
            }
        }

        // ── 4. VALIDAÇÃO DO MÉTODO (apenas POST para Anthropic) ─────────────────
        if (request.method !== 'POST') {
            return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
                status: 405,
                headers: {
                    ...getHeaders(request),
                    'Content-Type': 'application/json'
                }
            });
        }

        // ── 5. VALIDAÇÃO DA CHAVE DE AMBIENTE ─────────────────────────────────
        if (!env.ANTHROPIC_API_KEY) {
            console.error('[UNIFED-PROXY] ANTHROPIC_API_KEY não configurada nas variáveis de ambiente.');
            return new Response(JSON.stringify({
                error: 'Proxy misconfigured: API key not set.',
                hint: 'Set ANTHROPIC_API_KEY in Cloudflare Worker environment variables.'
            }), {
                status: 503,
                headers: {
                    ...getHeaders(request),
                    'Content-Type': 'application/json'
                }
            });
        }

        // ── 6. PARSE E VALIDAÇÃO DO PAYLOAD ───────────────────────────────────
        let body;
        try {
            body = await request.json();
        } catch (_parseErr) {
            return new Response(JSON.stringify({ error: 'Invalid JSON payload.' }), {
                status: 400,
                headers: {
                    ...getHeaders(request),
                    'Content-Type': 'application/json'
                }
            });
        }

        // Guardar integralmente o payload original — apenas injectar cabeçalhos
        const upstreamBody = JSON.stringify(body);

        // ── 7. FORWARD PARA API ANTHROPIC ─────────────────────────────────────
        let upstreamResponse;
        try {
            upstreamResponse = await fetch('https://api.anthropic.com/v1/messages', {
                method:  'POST',
                headers: {
                    'Content-Type':      'application/json',
                    'x-api-key':         env.ANTHROPIC_API_KEY,
                    'anthropic-version': '2023-06-01',
                    'anthropic-beta':    'messages-2023-12-15'
                },
                body: upstreamBody
            });
        } catch (fetchErr) {
            console.error('[UNIFED-PROXY] Erro ao contactar Anthropic:', fetchErr.message);
            return new Response(JSON.stringify({
                error: 'Upstream fetch failed.',
                detail: fetchErr.message
            }), {
                status: 502,
                headers: {
                    ...getHeaders(request),
                    'Content-Type': 'application/json'
                }
            });
        }

        // ── 8. REENCAMINHAR RESPOSTA + CABEÇALHOS CORS E SEGURANÇA ────────────
        const responseBody    = await upstreamResponse.arrayBuffer();
        const responseHeaders = new Headers(upstreamResponse.headers);

        const cors = getHeaders(request);
        Object.keys(cors).forEach(function(key) {
            responseHeaders.set(key, cors[key]);
        });

        return new Response(responseBody, {
            status:  upstreamResponse.status,
            headers: responseHeaders
        });
    }
};

// ============================================================================
// UTILITÁRIO: getHeaders(request)
// Gera os cabeçalhos CORS correctos com Whitelisting estrito de origens
// e adiciona cabeçalhos de segurança OWASP.
//
// RETIFICAÇÃO CIRÚRGICA PARA PRODUÇÃO FORENSE:
//   · Substituída a função _corsHeaders original.
//   · Whitelist estrita: apenas domínios oficiais.
//   · Adicionados cabeçalhos X-Content-Type-Options e X-Frame-Options.
//
// CONFORMIDADE: DORA (UE) 2022/2554 · OWASP CORS Security Cheat Sheet · eIDAS
// ============================================================================
function getHeaders(request) {
    // ── Whitelist de origens permitidas (produção) ────────────────────────────
    const origin = (request && request.headers) ? request.headers.get('Origin') : null;

    // ── EARLY RETURN: Origin ausente ou não autorizada ────────────────────────
    if (!origin || !ALLOWED_CORS_ORIGINS.includes(origin)) {
        // Para pedidos sem origem autorizada, devolvemos apenas Vary (sem ACAO)
        return {
            'Vary': 'Origin',
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY'
        };
    }

    // ── Origem autorizada: cabeçalhos CORS completos + segurança ──────────────
    return {
        'Access-Control-Allow-Origin':      origin,
        'Access-Control-Allow-Methods':     'POST, OPTIONS, GET',
        'Access-Control-Allow-Headers':     'Content-Type, Authorization',
        'Access-Control-Max-Age':           '86400',
        'Vary':                             'Origin',
        'X-Content-Type-Options':           'nosniff',
        'X-Frame-Options':                  'DENY'
    };
}

/* ============================================================================
   CONFIGURAÇÃO WRANGLER (wrangler.toml) — Referência de Deploy
   ============================================================================

   name = "unifed-claude-proxy"
   main = "claude-proxy.worker.js"
   compatibility_date = "2024-09-23"
   compatibility_flags = ["nodejs_compat"]

   [vars]
   # Não colocar a chave aqui — usar secrets encriptados:
   # wrangler secret put ANTHROPIC_API_KEY

   [[routes]]
   pattern = "api.unifed.com/claude-proxy"
   zone_name = "unifed.com"

   # Rate Limiting (recomendado — configurar via Dashboard):
   # 60 req/min por IP · acção: bloquear 429

   ============================================================================
   NOTAS DE SEGURANÇA ADICIONAIS:
   · Nunca fazer commit da ANTHROPIC_API_KEY em repositórios públicos.
   · Usar "wrangler secret put ANTHROPIC_API_KEY" para deploy seguro.
   · Activar Cloudflare WAF para bloquear origens não autorizadas.
   · Monitorizar uso via Cloudflare Analytics → Workers → Métricas.
   ============================================================================ */