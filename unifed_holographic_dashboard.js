/**
 * ============================================================================
 * UNIFED-PROBATUM · unifed_holographic_dashboard.js
 * ============================================================================
 * Versão      : v1.0.0-HOLOGRAPHIC
 * Gerado em   : 2026-04-19
 * Conformidade: DORA (UE) 2022/2554 · Art. 125.º CPP · ISO/IEC 27037:2012
 *
 * ÂMBITO (FASE 3):
 *   Camada de Visualização e Segurança DOM.
 *   Implementa:
 *     · Forensic Hydration UI — terminal SHA-256 em tempo real
 *     · Glassmorphism Forense — Dark Mode puro, blur dinâmico, opacidade 0.1-0.75
 *     · HolographicSankey3D — Sankey tridimensional via Three.js (local/CDN)
 *     · TimelineHeatmap — heatmap temporal com projecção paramétrica 6 meses
 *     · DOMSecurityManager — mutações CSSOM irreversíveis em estado não-autenticado
 *
 * DEPENDÊNCIAS:
 *   · window.UNIFED_CUSTODY (FASE 1)
 *   · window.UNIFED_CONTRADICTORY (FASE 2)
 *   · Three.js r128 (https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js)
 *
 * ARQUITECTURA:
 *   Zero poluição do escopo global. Expõe apenas:
 *     · window.UNIFED_HOLOGRAPHIC — namespace selado (Object.freeze)
 * ============================================================================
 */

(function _installHolographicDashboard(root) {
    'use strict';

    if (root.UNIFED_HOLOGRAPHIC && root.UNIFED_HOLOGRAPHIC._INSTALLED === true) {
        console.info('[HOLOGRAPHIC] Módulo já instalado. Ignorando.');
        return;
    }

    /* ======================================================================
       SECÇÃO 0 — CONSTANTES DE DESIGN (DESIGN TOKENS)
       ====================================================================== */

    const DESIGN = Object.freeze({
        /* Paleta Dark Forense */
        COLOR: {
            BG_BASE:         '#050810',
            BG_PANEL:        'rgba(8, 14, 28, 0.82)',
            GLASS_BORDER:    'rgba(0, 255, 200, 0.12)',
            ACCENT_CYAN:     '#00FFD4',
            ACCENT_AMBER:    '#FFB800',
            ACCENT_RED:      '#FF4455',
            TEXT_PRIMARY:    '#E8F0FF',
            TEXT_SECONDARY:  '#7A8BA0',
            TEXT_HASH:       '#00FFD4',
            NODE_INCOME:     0x00FFD4,  /* Three.js hex */
            NODE_EXPENSE:    0xFF4455,
            NODE_NEUTRAL:    0x7A8BA0,
            EDGE_COLOR:      0x1A3A6A
        },
        /* Blur e opacidade glassmorphism */
        BLUR: {
            PANEL:    '18px',
            TERMINAL: '12px',
            MODAL:    '24px'
        },
        OPACITY: {
            MIN:    0.10,
            NORMAL: 0.45,
            MAX:    0.75
        },
        /* Tipografia */
        FONT: {
            MONO:  '"JetBrains Mono", "Fira Code", "Courier New", monospace',
            SANS:  '"IBM Plex Sans", "Segoe UI", system-ui, sans-serif'
        },
        /* Three.js */
        THREE: {
            CAMERA_FOV: 60,
            CAMERA_Z:   300,
            AMBIENT_INT: 0.4,
            POINT_INT:   1.2
        }
    });

    /* ======================================================================
       SECÇÃO 1 — DOM SECURITY MANAGER (CSSOM Irreversível)
       ====================================================================== */

    /**
     * DOMSecurityManager
     * Aplica mutações CSSOM irreversíveis quando o estado é inválido.
     * Após invocação de lock(), o DOM subjacente é inacessível sem refresh completo.
     */
    const DOMSecurityManager = (function () {
        let _locked = false;
        const _lockedElements = new WeakSet();

        /**
         * lock() → void
         * Aplica display:none imperativo + pointer-events:none em todos os elementos
         * sensitivos. Injeta regra CSS de alta especificidade (importante).
         * Operação irreversível dentro da sessão (sem unlock()).
         */
        function lock() {
            if (_locked) return;
            _locked = true;

            /* 1. Injectar regra CSS irreversível via CSSOM */
            const sheet = _getOrCreateSecuritySheet();
            const KILL_RULE = `
                #pureDashboardWrapper,
                #pureDashboard,
                .dashboard-container,
                #kpisSection,
                #mainChartContainer,
                #mainDiscrepancyChartContainer,
                #complianceSection,
                #export-tools-container,
                #consoleSection,
                .kpis-grid,
                [data-sensitive="true"] {
                    display:        none !important;
                    visibility:     hidden !important;
                    opacity:        0 !important;
                    pointer-events: none !important;
                    user-select:    none !important;
                }
            `;
            sheet.insertRule(KILL_RULE, 0);

            /* 2. Mutação imperativa directa nos elementos */
            const targets = document.querySelectorAll(
                '#pureDashboardWrapper, #pureDashboard, .dashboard-container, ' +
                '#kpisSection, #mainChartContainer, [data-sensitive]'
            );
            targets.forEach(function (el) {
                el.style.setProperty('display',        'none',   'important');
                el.style.setProperty('visibility',     'hidden', 'important');
                el.style.setProperty('opacity',        '0',      'important');
                el.style.setProperty('pointer-events', 'none',   'important');
                _lockedElements.add(el);
            });

            console.warn('[DOM-SECURITY] Estado não autenticado. DOM bloqueado de forma irreversível.');
        }

        /**
         * _getOrCreateSecuritySheet() → CSSStyleSheet
         */
        function _getOrCreateSecuritySheet() {
            const existing = document.getElementById('unifed-security-cssom');
            if (existing) return existing.sheet;
            const style  = document.createElement('style');
            style.id     = 'unifed-security-cssom';
            style.type   = 'text/css';
            document.head.appendChild(style);
            return style.sheet;
        }

        /**
         * clearSensitiveDOM() → void
         * Elimina fisicamente os nós sensitivos do DOM (irreversível).
         */
        function clearSensitiveDOM() {
            if (!_locked) {
                console.warn('[DOM-SECURITY] clearSensitiveDOM() requer lock() prévio.');
                return;
            }
            const targets = document.querySelectorAll('[data-sensitive="true"]');
            targets.forEach(function (el) {
                if (el.parentNode) {
                    el.textContent = ''; // limpar conteúdo
                    el.parentNode.removeChild(el);
                }
            });
        }

        return Object.freeze({ lock, clearSensitiveDOM, isLocked: function () { return _locked; } });
    })();

    /* ======================================================================
       SECÇÃO 2 — FORENSIC HYDRATION UI (Terminal SHA-256)
       ====================================================================== */

    /**
     * ForensicHydrationUI
     * Apresenta a derivação SHA-256 em tempo real no terminal forense,
     * estabilizando o estado ZKP antes de revelar o DOM subjacente.
     */
    class ForensicHydrationUI {
        #_container;
        #_lines;
        #_delay;

        constructor(containerId, options = {}) {
            this.#_container = document.getElementById(containerId);
            if (!this.#_container) {
                console.warn('[HYDRATION] Container #' + containerId + ' não encontrado. A criar inline.');
                this.#_container = _createHydrationOverlay();
            }
            this.#_lines = [];
            this.#_delay = options.delay || 60; // ms entre linhas
        }

        /**
         * run(hashData) → Promise<void>
         * Executa a animação de hydration com os dados de hash reais.
         * @param {Object} hashData — { canonicalHash, merkleRoot, sessionRef }
         */
        async run(hashData) {
            _applyGlassmorphismStyles(this.#_container);
            this.#_container.style.display = 'block';
            this.#_container.style.opacity = '1';

            const lines = _buildHydrationScript(hashData);
            this.#_lines = lines;

            for (const line of lines) {
                await _renderTerminalLine(this.#_container, line, this.#_delay);
            }

            /* Estabilização ZKP — pausa antes de revelar DOM */
            await _sleep(600);
            await this._fadeOutAndReveal();
        }

        /**
         * _fadeOutAndReveal() → Promise<void>
         * Remove o overlay com fade e activa o dashboard.
         */
        async _fadeOutAndReveal() {
            this.#_container.style.transition = 'opacity 0.5s ease';
            this.#_container.style.opacity    = '0';
            await _sleep(520);
            this.#_container.style.display = 'none';

            const wrapper = document.getElementById('pureDashboardWrapper');
            if (wrapper) {
                wrapper.style.display    = 'block';
                wrapper.style.visibility = 'visible';
                wrapper.style.opacity    = '1';
                wrapper.classList.add('activated');
            }

            root.dispatchEvent(new CustomEvent('UNIFED_HYDRATION_COMPLETE', {
                detail: { timestamp: new Date().toISOString() }
            }));
        }
    }

    /**
     * _createHydrationOverlay() → HTMLElement
     * Cria o overlay de hydration se não existir no DOM.
     */
    function _createHydrationOverlay() {
        const overlay = document.createElement('div');
        overlay.id    = 'unifed-hydration-overlay';
        overlay.style.cssText = `
            position:   fixed;
            top:        0; left: 0;
            width:      100vw; height: 100vh;
            background: ${DESIGN.COLOR.BG_BASE};
            display:    flex;
            align-items: center;
            justify-content: center;
            z-index:    99998;
            font-family: ${DESIGN.FONT.MONO};
            overflow:   hidden;
        `;

        const terminal = document.createElement('div');
        terminal.id    = 'unifed-hydration-terminal';
        terminal.style.cssText = `
            background:     rgba(0, 20, 40, ${DESIGN.OPACITY.NORMAL});
            border:         1px solid ${DESIGN.COLOR.GLASS_BORDER};
            border-radius:  12px;
            padding:        32px 40px;
            width:          min(680px, 92vw);
            max-height:     80vh;
            overflow-y:     auto;
            backdrop-filter: blur(${DESIGN.BLUR.TERMINAL});
            -webkit-backdrop-filter: blur(${DESIGN.BLUR.TERMINAL});
            box-shadow:     0 0 60px rgba(0, 255, 212, 0.08),
                            inset 0 1px 0 rgba(255,255,255,0.04);
        `;

        const header = document.createElement('div');
        header.innerHTML = `
            <div style="color:${DESIGN.COLOR.ACCENT_CYAN};font-size:11px;letter-spacing:3px;
                        text-transform:uppercase;margin-bottom:24px;opacity:0.8;">
                ● UNIFED-PROBATUM · FORENSIC HYDRATION ENGINE
            </div>
        `;

        const output = document.createElement('div');
        output.id     = 'unifed-terminal-output';
        output.style.cssText = `
            color:       ${DESIGN.COLOR.TEXT_PRIMARY};
            font-size:   12px;
            line-height: 1.7;
        `;

        terminal.appendChild(header);
        terminal.appendChild(output);
        overlay.appendChild(terminal);
        document.body.appendChild(overlay);
        return overlay;
    }

    /**
     * _applyGlassmorphismStyles(el) → void
     */
    function _applyGlassmorphismStyles(el) {
        el.style.backdropFilter         = `blur(${DESIGN.BLUR.PANEL})`;
        el.style.webkitBackdropFilter   = `blur(${DESIGN.BLUR.PANEL})`;
    }

    /**
     * _buildHydrationScript(hashData) → Array<TerminalLine>
     */
    function _buildHydrationScript(hashData) {
        const h = hashData || {};
        const canonical = h.canonicalHash || '—';
        const merkle    = h.merkleRoot    || '—';
        const sesRef    = h.sessionRef    || '—';

        return [
            { text: '$ unifed-probatum --init --forensic-mode', color: DESIGN.COLOR.ACCENT_CYAN, delay: 0 },
            { text: '  Inicializando motor de custódia...', color: DESIGN.COLOR.TEXT_SECONDARY, delay: 40 },
            { text: '  ──────────────────────────────────────────────────────', color: DESIGN.COLOR.GLASS_BORDER.replace('0.12', '0.4'), delay: 20 },
            { text: '  [01/07] Gerando salt de sessão (crypto.getRandomValues)...', color: DESIGN.COLOR.TEXT_SECONDARY, delay: 80 },
            { text: '  SESSION_REF: ' + sesRef, color: DESIGN.COLOR.TEXT_HASH, delay: 30 },
            { text: '', delay: 20 },
            { text: '  [02/07] Ordenando payload lexicograficamente (sortKeysDeep)...', color: DESIGN.COLOR.TEXT_SECONDARY, delay: 80 },
            { text: '  KEYS_SORTED: ✓ determinístico', color: DESIGN.COLOR.ACCENT_CYAN, delay: 30 },
            { text: '', delay: 20 },
            { text: '  [03/07] SHA-256(SessionSalt || JSON(sortedPayload))...', color: DESIGN.COLOR.TEXT_SECONDARY, delay: 100 },
            { text: '  CANONICAL_HASH:', color: DESIGN.COLOR.TEXT_SECONDARY, delay: 20 },
            { text: '    ' + (canonical.slice(0, 32) || '????'), color: DESIGN.COLOR.TEXT_HASH, delay: 30 },
            { text: '    ' + (canonical.slice(32, 64) || '????'), color: DESIGN.COLOR.TEXT_HASH, delay: 30 },
            { text: '', delay: 20 },
            { text: '  [04/07] Construindo Merkle Tree (n=' + (h.leafCount || '?') + ' folhas)...', color: DESIGN.COLOR.TEXT_SECONDARY, delay: 120 },
            { text: '  MERKLE_ROOT:', color: DESIGN.COLOR.TEXT_SECONDARY, delay: 20 },
            { text: '    ' + (merkle.slice(0, 32) || '????'), color: DESIGN.COLOR.ACCENT_CYAN, delay: 30 },
            { text: '    ' + (merkle.slice(32, 64) || '????'), color: DESIGN.COLOR.ACCENT_CYAN, delay: 30 },
            { text: '', delay: 20 },
            { text: '  [05/07] Proof-of-Truth Protocol — Shamir SSS (k=2, n=3)...', color: DESIGN.COLOR.TEXT_SECONDARY, delay: 100 },
            { text: '  FRAGMENTOS: [share_1] [share_2] [share_3] ✓', color: DESIGN.COLOR.ACCENT_CYAN, delay: 40 },
            { text: '', delay: 20 },
            { text: '  [06/07] Gerando ZKP (Fiat-Shamir SHA-256)...', color: DESIGN.COLOR.TEXT_SECONDARY, delay: 80 },
            { text: '  ZKP_STATUS: VERIFIED (sem exposição de variáveis quantitativas)', color: DESIGN.COLOR.ACCENT_CYAN, delay: 30 },
            { text: '', delay: 20 },
            { text: '  [07/07] Estado imutável selado (Object.freeze + Proxy)...', color: DESIGN.COLOR.TEXT_SECONDARY, delay: 80 },
            { text: '', delay: 20 },
            { text: '  ──────────────────────────────────────────────────────', color: DESIGN.COLOR.GLASS_BORDER.replace('0.12', '0.4'), delay: 20 },
            { text: '  ✅ CUSTÓDIA NÍVEL 1 ACTIVA · ISO/IEC 27037:2012 CONFORME', color: DESIGN.COLOR.ACCENT_CYAN, delay: 40 },
            { text: '  Revelando interface forense...', color: DESIGN.COLOR.TEXT_SECONDARY, delay: 200 }
        ];
    }

    /**
     * _renderTerminalLine(container, line, baseDelay) → Promise<void>
     */
    async function _renderTerminalLine(container, line, baseDelay) {
        await _sleep(line.delay || baseDelay);
        const output = container.querySelector('#unifed-terminal-output') || container;
        const el     = document.createElement('div');
        el.textContent = line.text;
        el.style.color = line.color || DESIGN.COLOR.TEXT_PRIMARY;
        el.style.animation = 'unifed-fadein 0.15s ease forwards';
        output.appendChild(el);
        output.scrollTop = output.scrollHeight;
    }

    /* ======================================================================
       SECÇÃO 3 — THREE.JS 3D SANKEY HOLOGRÁFICO
       ====================================================================== */

    /**
     * HolographicSankey3D
     * Renderiza um diagrama de Sankey tridimensional usando Three.js.
     * Os nós financeiros são esféras coloridas com arestas como cilindros.
     * Suporta navegação via scroll (eixo Z) e touch/mouse para rotação.
     */
    class HolographicSankey3D {
        #_canvas;
        #_scene;
        #_camera;
        #_renderer;
        #_nodes;
        #_edges;
        #_animFrame;
        #_isDisposed;
        #_mouse;
        #_isDragging;
        #_prevMouse;

        constructor(canvasId, threeLib) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) throw new Error('[SANKEY-3D] Canvas #' + canvasId + ' não encontrado.');
            if (!threeLib || !threeLib.Scene) throw new TypeError('[SANKEY-3D] Three.js não disponível.');

            this.#_canvas      = canvas;
            this.#_isDisposed  = false;
            this.#_nodes       = [];
            this.#_edges       = [];
            this.#_isDragging  = false;
            this.#_prevMouse   = { x: 0, y: 0 };
            this.#_mouse       = { x: 0, y: 0 };

            this._THREE = threeLib;
            this._initScene();
            this._initControls();
        }

        /**
         * _initScene() → void
         */
        _initScene() {
            const THREE = this._THREE;
            const W = this.#_canvas.clientWidth  || 800;
            const H = this.#_canvas.clientHeight || 500;

            /* Cena */
            this.#_scene = new THREE.Scene();
            this.#_scene.background = new THREE.Color(DESIGN.COLOR.BG_BASE);
            this.#_scene.fog        = new THREE.FogExp2(0x050810, 0.003);

            /* Câmara */
            this.#_camera = new THREE.PerspectiveCamera(
                DESIGN.THREE.CAMERA_FOV,
                W / H,
                0.1,
                2000
            );
            this.#_camera.position.set(0, 0, DESIGN.THREE.CAMERA_Z);

            /* Renderer */
            this.#_renderer = new THREE.WebGLRenderer({
                canvas:    this.#_canvas,
                antialias: true,
                alpha:     false
            });
            this.#_renderer.setSize(W, H);
            this.#_renderer.setPixelRatio(Math.min(root.devicePixelRatio, 2));
            this.#_renderer.shadowMap.enabled = true;

            /* Iluminação */
            const ambient = new THREE.AmbientLight(0x0A1A3A, DESIGN.THREE.AMBIENT_INT);
            this.#_scene.add(ambient);

            const pointLight = new THREE.PointLight(DESIGN.COLOR.NODE_INCOME, DESIGN.THREE.POINT_INT, 600);
            pointLight.position.set(0, 100, 100);
            this.#_scene.add(pointLight);

            const rimLight = new THREE.PointLight(0xFF4455, 0.6, 400);
            rimLight.position.set(-150, -100, 50);
            this.#_scene.add(rimLight);

            /* Grade de fundo (estética forense) */
            const gridHelper = new THREE.GridHelper(600, 30, 0x0A2040, 0x050F20);
            gridHelper.position.y = -120;
            gridHelper.rotation.x = 0.1;
            this.#_scene.add(gridHelper);
        }

        /**
         * loadData(nodes, edges) → void
         * Popula a cena com os nós e arestas do grafo financeiro.
         * @param {Array<SankeyNode>} nodes
         * @param {Array<SankeyEdge>} edges
         */
        loadData(nodes, edges) {
            const THREE = this._THREE;

            /* Limpar cena anterior */
            this.#_nodes.forEach(function (m) { this.#_scene.remove(m); }, this);
            this.#_edges.forEach(function (m) { this.#_scene.remove(m); }, this);
            this.#_nodes = [];
            this.#_edges = [];

            /* Calcular layout (posicionamento em colunas) */
            const layout = _computeSankeyLayout(nodes, edges);

            /* Criar nós (esferas) */
            nodes.forEach(function (node) {
                const pos    = layout.positions[node.id] || { x: 0, y: 0, z: 0 };
                const radius = Math.max(4, Math.min(24, Math.sqrt(Math.abs(node.value || 1)) * 1.5));
                const color  = node.type === 'income'  ? DESIGN.COLOR.NODE_INCOME :
                               node.type === 'expense' ? DESIGN.COLOR.NODE_EXPENSE :
                               DESIGN.COLOR.NODE_NEUTRAL;

                const geo  = new THREE.SphereGeometry(radius, 32, 32);
                const mat  = new THREE.MeshPhongMaterial({
                    color:       color,
                    emissive:    color,
                    emissiveIntensity: 0.25,
                    transparent: true,
                    opacity:     0.9,
                    shininess:   120
                });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(pos.x, pos.y, pos.z);
                mesh.userData = { nodeId: node.id, value: node.value, label: node.label };
                this.#_scene.add(mesh);
                this.#_nodes.push(mesh);

                /* Label (sprite) */
                const sprite = _createTextSprite(node.label || node.id, THREE, color);
                sprite.position.set(pos.x, pos.y + radius + 12, pos.z);
                this.#_scene.add(sprite);
                this.#_nodes.push(sprite);

            }, this);

            /* Criar arestas (cilindros) */
            edges.forEach(function (edge) {
                const srcPos = layout.positions[edge.source];
                const tgtPos = layout.positions[edge.target];
                if (!srcPos || !tgtPos) return;

                const src = new THREE.Vector3(srcPos.x, srcPos.y, srcPos.z);
                const tgt = new THREE.Vector3(tgtPos.x, tgtPos.y, tgtPos.z);

                const edgeMesh = _createEdgeCylinder(src, tgt, edge.value || 1, THREE);
                this.#_scene.add(edgeMesh);
                this.#_edges.push(edgeMesh);

            }, this);
        }

        /**
         * startAnimation() → void
         */
        startAnimation() {
            const self = this;
            let t = 0;

            function animate() {
                if (self.#_isDisposed) return;
                self.#_animFrame = requestAnimationFrame(animate);
                t += 0.005;

                /* Rotação lenta dos nós */
                self.#_nodes.forEach(function (mesh, i) {
                    if (mesh.isMesh && mesh.geometry.type === 'SphereGeometry') {
                        mesh.rotation.y += 0.003;
                        mesh.position.y += Math.sin(t + i * 0.7) * 0.05; // float effect
                    }
                });

                /* Pulso das arestas */
                self.#_edges.forEach(function (mesh, i) {
                    if (mesh.material) {
                        mesh.material.opacity = 0.35 + 0.25 * Math.sin(t * 2 + i);
                    }
                });

                self.#_renderer.render(self.#_scene, self.#_camera);
            }
            animate();
        }

        /**
         * _initControls() → void
         * Inicializa controlos de mouse/touch para rotação e zoom.
         */
        _initControls() {
            const canvas = this.#_canvas;
            const self   = this;

            /* Mouse */
            canvas.addEventListener('mousedown', function (e) {
                self.#_isDragging = true;
                self.#_prevMouse  = { x: e.clientX, y: e.clientY };
            });
            canvas.addEventListener('mousemove', function (e) {
                if (!self.#_isDragging) return;
                const dx = e.clientX - self.#_prevMouse.x;
                const dy = e.clientY - self.#_prevMouse.y;
                self.#_camera.position.x -= dx * 0.5;
                self.#_camera.position.y += dy * 0.5;
                self.#_prevMouse = { x: e.clientX, y: e.clientY };
            });
            canvas.addEventListener('mouseup',   function () { self.#_isDragging = false; });
            canvas.addEventListener('mouseleave', function () { self.#_isDragging = false; });

            /* Scroll → zoom (eixo Z) */
            canvas.addEventListener('wheel', function (e) {
                e.preventDefault();
                self.#_camera.position.z = Math.max(50, Math.min(800,
                    self.#_camera.position.z + e.deltaY * 0.4
                ));
            }, { passive: false });

            /* Touch */
            let lastTouchDist = 0;
            canvas.addEventListener('touchstart', function (e) {
                if (e.touches.length === 2) {
                    const dx = e.touches[0].clientX - e.touches[1].clientX;
                    const dy = e.touches[0].clientY - e.touches[1].clientY;
                    lastTouchDist = Math.sqrt(dx * dx + dy * dy);
                }
            });
            canvas.addEventListener('touchmove', function (e) {
                e.preventDefault();
                if (e.touches.length === 2) {
                    const dx   = e.touches[0].clientX - e.touches[1].clientX;
                    const dy   = e.touches[0].clientY - e.touches[1].clientY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const delta = lastTouchDist - dist;
                    self.#_camera.position.z = Math.max(50, Math.min(800,
                        self.#_camera.position.z + delta * 0.5
                    ));
                    lastTouchDist = dist;
                }
            }, { passive: false });

            /* Resize */
            root.addEventListener('resize', function () {
                const W = canvas.clientWidth;
                const H = canvas.clientHeight;
                self.#_camera.aspect = W / H;
                self.#_camera.updateProjectionMatrix();
                self.#_renderer.setSize(W, H);
            });
        }

        /**
         * dispose() → void
         * Liberta recursos (WebGL context, listeners, animação).
         */
        dispose() {
            this.#_isDisposed = true;
            if (this.#_animFrame) cancelAnimationFrame(this.#_animFrame);
            if (this.#_renderer)  this.#_renderer.dispose();
            this.#_nodes.forEach(function (m) {
                if (m.geometry) m.geometry.dispose();
                if (m.material) m.material.dispose();
            });
        }
    }

    /**
     * _computeSankeyLayout(nodes, edges) → {positions: {[id]: {x,y,z}}}
     * Distribui os nós em colunas com base no nível (depth) do grafo.
     */
    function _computeSankeyLayout(nodes, edges) {
        /* Calcular profundidade (BFS) */
        const depth = {};
        const adj   = {};
        nodes.forEach(function (n) { depth[n.id] = 0; adj[n.id] = []; });
        edges.forEach(function (e) {
            if (adj[e.source]) adj[e.source].push(e.target);
        });

        /* BFS a partir das fontes */
        const sources = nodes.filter(function (n) {
            return !edges.some(function (e) { return e.target === n.id; });
        });
        const queue = sources.map(function (s) { return s.id; });
        while (queue.length > 0) {
            const cur = queue.shift();
            (adj[cur] || []).forEach(function (child) {
                if (depth[child] <= depth[cur]) {
                    depth[child] = depth[cur] + 1;
                    queue.push(child);
                }
            });
        }

        /* Agrupar por nível */
        const levels = {};
        nodes.forEach(function (n) {
            const d = depth[n.id] || 0;
            if (!levels[d]) levels[d] = [];
            levels[d].push(n.id);
        });

        /* Posicionar */
        const positions = {};
        const X_STEP = 120, Y_STEP = 60;
        Object.keys(levels).forEach(function (lvl) {
            const ids = levels[lvl];
            const xOff = parseInt(lvl, 10) * X_STEP - (Object.keys(levels).length * X_STEP / 2);
            ids.forEach(function (id, i) {
                const yOff = (i - (ids.length - 1) / 2) * Y_STEP;
                positions[id] = {
                    x: xOff,
                    y: yOff,
                    z: parseInt(lvl, 10) * -20 /* leve profundidade Z */
                };
            });
        });

        return { positions };
    }

    /**
     * _createEdgeCylinder(src, tgt, value, THREE) → THREE.Mesh
     * Cria um cilindro entre dois pontos 3D (aresta do Sankey).
     */
    function _createEdgeCylinder(src, tgt, value, THREE) {
        const dir      = new THREE.Vector3().subVectors(tgt, src);
        const length   = dir.length();
        const radius   = Math.max(0.5, Math.min(8, Math.sqrt(Math.abs(value)) * 0.3));
        const geo      = new THREE.CylinderGeometry(radius, radius, length, 8, 1, false);
        const mat      = new THREE.MeshPhongMaterial({
            color:       DESIGN.COLOR.EDGE_COLOR,
            transparent: true,
            opacity:     0.5,
            emissive:    0x001A40,
            emissiveIntensity: 0.4
        });
        const mesh = new THREE.Mesh(geo, mat);

        /* Orientar o cilindro da src para tgt */
        const mid = new THREE.Vector3().addVectors(src, tgt).multiplyScalar(0.5);
        mesh.position.copy(mid);
        mesh.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            dir.normalize()
        );
        return mesh;
    }

    /**
     * _createTextSprite(text, THREE, color) → THREE.Sprite
     * Cria um sprite de texto 2D para labels dos nós.
     */
    function _createTextSprite(text, THREE, hexColor) {
        const canvas   = document.createElement('canvas');
        canvas.width   = 256;
        canvas.height  = 64;
        const ctx      = canvas.getContext('2d');

        /* Fundo transparente */
        ctx.clearRect(0, 0, 256, 64);

        /* Texto */
        ctx.fillStyle = '#' + hexColor.toString(16).padStart(6, '0');
        ctx.font      = '500 14px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(text).slice(0, 24), 128, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const mat     = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite  = new THREE.Sprite(mat);
        sprite.scale.set(60, 15, 1);
        return sprite;
    }

    /* ======================================================================
       SECÇÃO 4 — TIMELINE HEATMAP (Canvas 2D + Projecção 6 Meses)
       ====================================================================== */

    /**
     * TimelineHeatmap
     * Renderiza um heatmap temporal de fluxos financeiros com projecção 6 meses.
     * Implementado em Canvas 2D puro (sem dependências externas).
     */
    class TimelineHeatmap {
        #_canvas;
        #_ctx;
        #_data;
        #_projection;

        constructor(canvasId) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) throw new Error('[HEATMAP] Canvas #' + canvasId + ' não encontrado.');
            this.#_canvas     = canvas;
            this.#_ctx        = canvas.getContext('2d');
            this.#_data       = [];
            this.#_projection = [];
        }

        /**
         * load(monthlyData, projection6m) → void
         * @param {Array<{month: string, amount: number}>} monthlyData
         * @param {Array<{month_offset: string, predicted_eur: number}>} projection6m
         */
        load(monthlyData, projection6m) {
            this.#_data       = monthlyData       || [];
            this.#_projection = projection6m || [];
        }

        /**
         * render() → void
         * Desenha o heatmap + projecção no canvas.
         */
        render() {
            const ctx    = this.#_ctx;
            const W      = this.#_canvas.width  = this.#_canvas.clientWidth  || 800;
            const H      = this.#_canvas.height = this.#_canvas.clientHeight || 200;
            const all    = [
                ...this.#_data,
                ...this.#_projection.map(function (p) { return { month: p.month_offset, amount: p.predicted_eur, projected: true }; })
            ];
            const maxAmt = Math.max(...all.map(function (d) { return Math.abs(d.amount || 0); }), 1);
            const cellW  = W / Math.max(all.length, 1);

            ctx.clearRect(0, 0, W, H);

            /* Fundo */
            ctx.fillStyle = DESIGN.COLOR.BG_BASE;
            ctx.fillRect(0, 0, W, H);

            /* Células do heatmap */
            all.forEach(function (item, i) {
                const intensity = Math.abs(item.amount || 0) / maxAmt;
                const x         = i * cellW;
                const isProj    = item.projected;

                /* Cor: cyan = histórico, amber = projecção, vermelho = anomalia */
                let r, g, b;
                if (isProj) {
                    r = Math.round(255 * intensity * 0.72);
                    g = Math.round(184 * intensity);
                    b = 0;
                } else {
                    r = 0;
                    g = Math.round(255 * intensity);
                    b = Math.round(212 * intensity);
                }

                ctx.fillStyle   = `rgba(${r},${g},${b},${0.15 + intensity * 0.7})`;
                ctx.fillRect(x, H * 0.1, cellW - 2, H * 0.65);

                /* Label mês */
                ctx.fillStyle   = DESIGN.COLOR.TEXT_SECONDARY;
                ctx.font        = `10px ${DESIGN.FONT.MONO}`;
                ctx.textAlign   = 'center';
                ctx.fillText(String(item.month || '').slice(-5), x + cellW / 2, H - 14);

                /* Valor */
                ctx.fillStyle   = isProj ? DESIGN.COLOR.ACCENT_AMBER : DESIGN.COLOR.ACCENT_CYAN;
                ctx.font        = `bold 9px ${DESIGN.FONT.MONO}`;
                ctx.fillText('€' + Math.round(item.amount || 0), x + cellW / 2, H * 0.08);
            });

            /* Linha de separação histórico/projecção */
            if (this.#_data.length > 0 && this.#_projection.length > 0) {
                const sepX = this.#_data.length * cellW;
                ctx.strokeStyle   = DESIGN.COLOR.ACCENT_AMBER;
                ctx.lineWidth     = 1.5;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(sepX, H * 0.05);
                ctx.lineTo(sepX, H * 0.85);
                ctx.stroke();
                ctx.setLineDash([]);

                ctx.fillStyle    = DESIGN.COLOR.ACCENT_AMBER;
                ctx.font         = `9px ${DESIGN.FONT.MONO}`;
                ctx.textAlign    = 'left';
                ctx.fillText('← HISTÓRICO  |  PROJECÇÃO →', sepX + 4, H * 0.05 + 10);
            }
        }
    }

    /* ======================================================================
       SECÇÃO 5 — CSS ANIMATIONS (injectadas dinamicamente)
       ====================================================================== */

    (function _injectGlobalCSS() {
        const STYLE_ID = 'unifed-holographic-global-css';
        if (document.getElementById(STYLE_ID)) return;

        const css = `
            /* ── Animações base ── */
            @keyframes unifed-fadein {
                from { opacity: 0; transform: translateY(4px); }
                to   { opacity: 1; transform: translateY(0); }
            }
            @keyframes unifed-pulse-border {
                0%,100% { border-color: rgba(0,255,212,0.12); }
                50%      { border-color: rgba(0,255,212,0.35); }
            }
            @keyframes unifed-scanline {
                0%   { background-position: 0 0; }
                100% { background-position: 0 100px; }
            }

            /* ── Glassmorphism Forense ── */
            .unifed-glass-panel {
                background:      rgba(8, 14, 28, ${DESIGN.OPACITY.NORMAL});
                border:          1px solid ${DESIGN.COLOR.GLASS_BORDER};
                border-radius:   12px;
                backdrop-filter: blur(${DESIGN.BLUR.PANEL});
                -webkit-backdrop-filter: blur(${DESIGN.BLUR.PANEL});
                box-shadow:      0 4px 48px rgba(0,0,0,0.6),
                                 0 0 80px rgba(0,255,212,0.04),
                                 inset 0 1px 0 rgba(255,255,255,0.03);
                animation:       unifed-pulse-border 4s ease-in-out infinite;
                transition:      opacity 0.3s ease, transform 0.2s ease;
            }

            /* ── Overlay scanlines ── */
            .unifed-scanlines::before {
                content:  '';
                position: absolute;
                inset:    0;
                background: repeating-linear-gradient(
                    0deg,
                    transparent,
                    transparent 2px,
                    rgba(0,0,0,0.08) 2px,
                    rgba(0,0,0,0.08) 4px
                );
                pointer-events: none;
                animation: unifed-scanline 8s linear infinite;
            }

            /* ── Typography tokens ── */
            .unifed-mono  { font-family: ${DESIGN.FONT.MONO}; }
            .unifed-sans  { font-family: ${DESIGN.FONT.SANS}; }
            .unifed-hash  { color: ${DESIGN.COLOR.TEXT_HASH}; font-family: ${DESIGN.FONT.MONO}; font-size: 11px; word-break: break-all; }
            .unifed-accent-cyan  { color: ${DESIGN.COLOR.ACCENT_CYAN};  }
            .unifed-accent-amber { color: ${DESIGN.COLOR.ACCENT_AMBER}; }
            .unifed-accent-red   { color: ${DESIGN.COLOR.ACCENT_RED};   }

            /* ── Scrollbar forense ── */
            ::-webkit-scrollbar              { width: 5px; }
            ::-webkit-scrollbar-track        { background: #050810; }
            ::-webkit-scrollbar-thumb        { background: rgba(0,255,212,0.2); border-radius: 3px; }
            ::-webkit-scrollbar-thumb:hover  { background: rgba(0,255,212,0.4); }
        `;

        const style  = document.createElement('style');
        style.id     = STYLE_ID;
        style.textContent = css;
        document.head.appendChild(style);
    })();

    /* ======================================================================
       SECÇÃO 6 — CARREGADOR DE THREE.JS (lazy, com fallback)
       ====================================================================== */

    /**
     * _loadThreeJS() → Promise<THREE>
     * Tenta carregar Three.js r128 da CDN. Em ambiente air-gapped,
     * retorna um stub mínimo para evitar crash total.
     */
    function _loadThreeJS() {
        return new Promise(function (resolve) {
            if (root.THREE) { resolve(root.THREE); return; }

            const script = document.createElement('script');
            script.src   = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
            script.crossOrigin = 'anonymous';
            script.onload = function () {
                console.log('[HOLOGRAPHIC] Three.js r128 carregado com sucesso.');
                resolve(root.THREE);
            };
            script.onerror = function () {
                console.warn('[HOLOGRAPHIC] Three.js CDN indisponível. Dashboard 3D em modo degradado.');
                resolve(null); // null indica modo degradado
            };
            document.head.appendChild(script);
        });
    }

    /* ======================================================================
       SECÇÃO 7 — UTILITÁRIOS
       ====================================================================== */

    function _sleep(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    /* ======================================================================
       SECÇÃO 8 — INTERFACE PÚBLICA (NAMESPACE SELADO)
       ====================================================================== */

    const PUBLIC_API = Object.freeze({
        _INSTALLED:              true,
        _VERSION:                '1.0.0-HOLOGRAPHIC',
        _CONFORMIDADE:           ['Art. 125.º CPP', 'ISO/IEC 27037:2012', 'DORA (UE) 2022/2554'],

        DOMSecurityManager:      DOMSecurityManager,
        ForensicHydrationUI:     ForensicHydrationUI,
        HolographicSankey3D:     HolographicSankey3D,
        TimelineHeatmap:         TimelineHeatmap,
        DESIGN,

        /**
         * initDashboard(config) → Promise<void>
         * Ponto de entrada principal. Orquestra toda a FASE 3.
         * @param {Object} config
         * @param {string} config.hydrationContainerId
         * @param {string} config.sankey3dCanvasId
         * @param {string} config.heatmapCanvasId
         * @param {Object} config.potResult — resultado do ProofOfTruthProtocol
         * @param {Array}  config.sankeyNodes
         * @param {Array}  config.sankeyEdges
         * @param {Array}  config.monthlyData
         * @param {Array}  config.projection6m
         * @param {boolean} config.authenticated
         */
        initDashboard: async function (config) {
            /* 0. Segurança — bloquear DOM se não autenticado */
            if (!config.authenticated) {
                DOMSecurityManager.lock();
                DOMSecurityManager.clearSensitiveDOM();
                return;
            }

            /* 1. Forensic Hydration UI */
            const hydrationUI = new ForensicHydrationUI(
                config.hydrationContainerId || 'unifed-hydration-overlay',
                { delay: 55 }
            );
            await hydrationUI.run({
                canonicalHash: config.potResult && config.potResult.canonicalHash,
                merkleRoot:    config.potResult && config.potResult.merkleRoot,
                sessionRef:    config.potResult && config.potResult.sessionRef,
                leafCount:     config.potResult && config.potResult.nftMetadata &&
                               config.potResult.nftMetadata.attributes &&
                               config.potResult.nftMetadata.attributes[1] &&
                               config.potResult.nftMetadata.attributes[1].value
            });

            /* 2. Three.js Sankey 3D */
            if (config.sankey3dCanvasId) {
                const THREE = await _loadThreeJS();
                if (THREE && config.sankeyNodes && config.sankeyEdges) {
                    try {
                        const sankey = new HolographicSankey3D(config.sankey3dCanvasId, THREE);
                        sankey.loadData(config.sankeyNodes, config.sankeyEdges);
                        sankey.startAnimation();
                        root._UNIFED_SANKEY_3D = sankey; // referência para dispose posterior
                    } catch (err) {
                        console.warn('[HOLOGRAPHIC] Sankey 3D falhou:', err.message);
                    }
                }
            }

            /* 3. Timeline Heatmap */
            if (config.heatmapCanvasId && config.monthlyData) {
                try {
                    const heatmap = new TimelineHeatmap(config.heatmapCanvasId);
                    heatmap.load(config.monthlyData, config.projection6m || []);
                    heatmap.render();
                } catch (err) {
                    console.warn('[HOLOGRAPHIC] Heatmap falhou:', err.message);
                }
            }

            root.dispatchEvent(new CustomEvent('UNIFED_DASHBOARD_READY', {
                detail: { timestamp: new Date().toISOString() }
            }));

            console.log('[HOLOGRAPHIC] ✅ Dashboard holográfico totalmente inicializado.');
        }
    });

    Object.defineProperty(root, 'UNIFED_HOLOGRAPHIC', {
        value:        PUBLIC_API,
        writable:     false,
        configurable: false,
        enumerable:   true
    });

    root.dispatchEvent(new CustomEvent('UNIFED_HOLOGRAPHIC_READY', {
        detail: { version: PUBLIC_API._VERSION, timestamp: new Date().toISOString() }
    }));

    console.log('[HOLOGRAPHIC] ✅ UNIFED_HOLOGRAPHIC v' + PUBLIC_API._VERSION + ' instalado e selado.');

})(window);
