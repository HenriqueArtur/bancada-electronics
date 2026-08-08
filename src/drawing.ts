/**
 * The circuit drawing, as a client-side script.
 *
 * It reads the diagram.json embedded in the page, builds it with the Wokwi web
 * components and wires the parts using the coordinates each element publishes
 * in `pinInfo`. Layout and wire routing come from ELK, which is built for
 * exactly this: nodes with measured sizes, ports at fixed positions, and edge
 * crossing minimisation.
 *
 * Static on purpose: this is for seeing the wiring, not for simulating it.
 *
 * Kept as a string rather than a file the browser fetches so the plugin ships
 * one artefact. Beware: it lives inside a template literal, so a backslash in
 * here has to be doubled — a bare \n becomes a real newline in the emitted JS
 * and takes the whole <script> down with it.
 */

export const DRAWING_SCRIPT = String.raw`
// Monta o diagram.json com os próprios componentes do Wokwi (@wokwi/elements)
// e liga os fios pelas coordenadas que cada elemento publica em pinInfo.
// Estático de propósito: é para ver a ligação, não para simular.
(() => {
  const alvo = document.querySelector(".desenho");
  const fonte = document.querySelector('.fonte[data-arquivo="diagram"]');
  if (!alvo || !fonte || !window.customElements) return;

  const falhar = (motivo) => { alvo.textContent = motivo; alvo.classList.add("vazio"); };

  let d;
  try { d = JSON.parse(fonte.textContent); }
  catch { return falhar("diagram.json não é JSON válido"); }

  const NS = "http://www.w3.org/2000/svg";
  const palco = document.createElement("div");
  palco.className = "palco";

  // Peças que o simulador do site tem e o pacote de elementos não. Em vez de
  // sumir com elas, viram uma caixa com os pinos que o diagrama usa — assim o
  // fio continua chegando no lugar certo e a ligação continua legível.
  const pinosImprovisados = new Map();
  const usadosPor = (id) => {
    const s = new Set();
    for (const [a, b] of d.connections) for (const r of [a, b]) {
      const [pid, pin] = r.split(":");
      if (pid === id) s.add(pin);
    }
    return [...s];
  };

  const caixaFalsa = (parte) => {
    const pinos = usadosPor(parte.id);
    const L = 34, W = Math.max(96, pinos.length * L), H = 62;
    const el = document.createElement("div");
    el.className = "improviso";
    el.style.width = W + "px";
    el.style.height = H + "px";
    el.innerHTML =
      '<span class="nome">' + parte.type.replace(/^(wokwi|board)-/, "") + "</span>" +
      pinos.map((p, i) =>
        '<span class="pino" style="left:' + (i * L + L / 2 - 14) + 'px">' + p + "</span>").join("");
    pinosImprovisados.set(parte.id, pinos.map((nome, i) => ({ nome, x: i * L + L / 2, y: H })));
    return el;
  };

  // wokwi-text é anotação, não peça: não tem pino, não entra no circuito.
  // Como caixa tracejada ele virava um quadrado solto escrito "text".
  const ANOTACOES = d.parts.filter((p) => p.type === "wokwi-text");
  const pecas = d.parts.filter((p) => p.type !== "wokwi-text");

  const elementos = new Map();
  for (const parte of pecas) {
    const conhecido = customElements.get(parte.type);
    const el = conhecido ? document.createElement(parte.type) : caixaFalsa(parte);
    if (conhecido) for (const [k, v] of Object.entries(parte.attrs ?? {})) el.setAttribute(k, v);
    el.style.position = "absolute";
    el.style.left = (parte.left ?? 0) + "px";
    el.style.top = (parte.top ?? 0) + "px";
    if (parte.rotate) { el.style.transform = "rotate(" + parte.rotate + "deg)"; el.style.transformOrigin = "top left"; }
    elementos.set(parte.id, { el, parte });
    palco.appendChild(el);
  }

  if (ANOTACOES.length) {
    const legenda = document.createElement("p");
    legenda.className = "legenda-desenho";
    legenda.textContent = ANOTACOES.map((a) => a.attrs?.text ?? "").join(" ");
    alvo.after(legenda);
  }

  alvo.textContent = "";
  alvo.appendChild(palco);

  const tipos = [...new Set(pecas.map((p) => p.type))].filter((t) => customElements.get(t));

  /**
   * Recoloca as peças a partir do tamanho REAL de cada uma, medido depois que
   * os web components subiram. Os left/top do diagram.json foram escritos no
   * escuro e é de onde vem a bagunça.
   *
   * Placa na esquerda; o resto em colunas por distância dela, e dentro da
   * coluna na ordem do pino da placa a que cada uma se liga — é o que evita
   * fio cruzando com fio.
   */
  function arrumar() {
    const tamanho = (id) => {
      const r = elementos.get(id).el.getBoundingClientRect();
      return { w: r.width || 40, h: r.height || 24 };
    };

    const idPlaca = [...elementos.keys()].reduce((a, b) =>
      tamanho(a).w * tamanho(a).h >= tamanho(b).w * tamanho(b).h ? a : b);

    const vizinhos = new Map([...elementos.keys()].map((id) => [id, new Set()]));
    const pinoDaPlaca = new Map();
    for (const [a, b] of d.connections) {
      const [ia, pa] = a.split(":"), [ib, pb] = b.split(":");
      if (!vizinhos.has(ia) || !vizinhos.has(ib)) continue;
      vizinhos.get(ia).add(ib);
      vizinhos.get(ib).add(ia);
      if (ia === idPlaca) pinoDaPlaca.set(ib, pa);
      if (ib === idPlaca) pinoDaPlaca.set(ia, pb);
    }

    // distância até a placa
    const nivelDe = new Map([[idPlaca, 0]]);
    const fila = [idPlaca];
    while (fila.length) {
      const atual = fila.shift();
      for (const v of vizinhos.get(atual)) {
        if (nivelDe.has(v)) continue;
        nivelDe.set(v, nivelDe.get(atual) + 1);
        fila.push(v);
      }
    }

    // y do pino da placa que ancora cada peça, herdado por quem vem depois
    const elPlaca = elementos.get(idPlaca).el;
    const yDoPino = new Map((elPlaca.pinInfo ?? []).map((p) => [p.name, p.y]));
    const ancoraDe = new Map();
    const ancora = (id, visto = new Set()) => {
      if (ancoraDe.has(id)) return ancoraDe.get(id);
      if (visto.has(id)) return 0;
      visto.add(id);
      let v = yDoPino.get(pinoDaPlaca.get(id));
      if (v === undefined) {
        const antes = [...vizinhos.get(id)].filter((n) => nivelDe.get(n) < nivelDe.get(id));
        v = antes.length ? ancora(antes[0], visto) : 9999;
      }
      ancoraDe.set(id, v);
      return v;
    };

    const GAP_X = 74, GAP_Y = 26;
    const porNivel = new Map();
    for (const id of elementos.keys()) {
      if (id === idPlaca) continue;
      const n = nivelDe.get(id) ?? 1;
      if (!porNivel.has(n)) porNivel.set(n, []);
      porNivel.get(n).push(id);
    }

    const posicionar = (id, x, y) => {
      const { parte } = elementos.get(id);
      parte.left = Math.round(x);
      parte.top = Math.round(y);
      elementos.get(id).el.style.left = parte.left + "px";
      elementos.get(id).el.style.top = parte.top + "px";
    };

    posicionar(idPlaca, 0, 0);
    const alturaPlaca = tamanho(idPlaca).h;

    let x = tamanho(idPlaca).w + GAP_X;
    for (const n of [...porNivel.keys()].sort((a, b) => a - b)) {
      const coluna = porNivel.get(n).sort((a, b) => ancora(a) - ancora(b));
      const alturaTotal = coluna.reduce((s, id) => s + tamanho(id).h + GAP_Y, -GAP_Y);
      let y = Math.max(0, (alturaPlaca - alturaTotal) / 2);
      let larguraColuna = 0;

      for (const id of coluna) {
        const t = tamanho(id);
        posicionar(id, x, y);
        y += t.h + GAP_Y;
        larguraColuna = Math.max(larguraColuna, t.w);
      }
      x += larguraColuna + GAP_X;
    }
  }

  /**
   * Layout pelo ELK, que é feito para isto: nós com tamanho medido, PORTAS em
   * posição fixa (os pinos) e minimização de cruzamento de arestas. A heurística
   * do arrumar() acerta o caso simples e erra quando um componente se liga a
   * vários; o ELK resolve os dois.
   *
   * Devolve as rotas dos fios também — em cotovelo, como fiação de verdade.
   */
  async function arrumarComElk() {
    if (!window.ELK) throw new Error("ELK ausente");

    const tamanho = (id) => {
      const r = elementos.get(id).el.getBoundingClientRect();
      return { w: Math.max(r.width, 8), h: Math.max(r.height, 8) };
    };

    // um port por pino REALMENTE usado; portas a mais só atrapalham o solver
    const portasDe = new Map();
    for (const [a, b] of d.connections) {
      for (const ref of [a, b]) {
        const [id, pino] = ref.split(":");
        if (!elementos.get(id)) continue;
        if (!portasDe.has(id)) portasDe.set(id, new Set());
        portasDe.get(id).add(pino);
      }
    }

    const posPinoLocal = (id, nome) => {
      const improviso = pinosImprovisados.get(id);
      if (improviso) {
        const p = improviso.find((q) => q.nome === nome);
        return p ? { x: p.x, y: p.y } : null;
      }
      const p = (elementos.get(id).el.pinInfo ?? []).find((q) => q.name === nome);
      return p ? { x: p.x, y: p.y } : null;
    };

    const nos = [];
    for (const [id] of elementos) {
      const t = tamanho(id);
      const portas = [...(portasDe.get(id) ?? [])]
        .map((nome) => {
          const p = posPinoLocal(id, nome);
          return p && { id: id + ":" + nome, width: 1, height: 1, x: p.x, y: p.y };
        })
        .filter(Boolean);

      nos.push({
        id,
        width: t.w,
        height: t.h,
        ports: portas,
        layoutOptions: { "elk.portConstraints": "FIXED_POS" },
      });
    }

    const arestas = d.connections
      .map(([a, b], i) => ({ id: "e" + i, sources: [a], targets: [b] }))
      .filter((e) => elementos.has(e.sources[0].split(":")[0]) &&
                     elementos.has(e.targets[0].split(":")[0]));

    const grafo = await new window.ELK().layout({
      id: "raiz",
      layoutOptions: {
        "elk.algorithm": "layered",
        "elk.direction": "RIGHT",
        "elk.edgeRouting": "ORTHOGONAL",
        "elk.spacing.nodeNode": "44",
        "elk.layered.spacing.nodeNodeBetweenLayers": "90",
        "elk.spacing.edgeEdge": "14",
        "elk.spacing.edgeNode": "22",
        "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      },
      children: nos,
      edges: arestas,
    });

    for (const no of grafo.children ?? []) {
      const alvoEl = elementos.get(no.id);
      if (!alvoEl) continue;
      alvoEl.parte.left = Math.round(no.x);
      alvoEl.parte.top = Math.round(no.y);
      alvoEl.el.style.left = alvoEl.parte.left + "px";
      alvoEl.el.style.top = alvoEl.parte.top + "px";
    }

    // rotas calculadas, indexadas pela conexão de origem
    const rotas = new Map();
    for (const aresta of grafo.edges ?? []) {
      const s = aresta.sections?.[0];
      if (!s) continue;
      rotas.set(aresta.sources[0] + "|" + aresta.targets[0],
        [s.startPoint, ...(s.bendPoints ?? []), s.endPoint]);
    }
    return rotas;
  }

  Promise.all(tipos.map((t) => customElements.whenDefined(t))).then(async () => {
    await new Promise((r) => requestAnimationFrame(r));

    let rotas = new Map();
    try {
      rotas = await arrumarComElk();
    } catch (e) {
      console.warn("layout pelo ELK falhou, usando o medido:", e);
      arrumar();
    }

    desenharFios(rotas);
  });

  function desenharFios(rotas) {
    // posição absoluta de um pino, no sistema de coordenadas do palco
    const posDoPino = (ref) => {
      const [id, nome] = ref.split(":");
      const alvo = elementos.get(id);
      if (!alvo) return null;
      const { el, parte } = alvo;
      const base = { x: parte.left ?? 0, y: parte.top ?? 0 };

      const improviso = pinosImprovisados.get(id);
      if (improviso) {
        const p = improviso.find((q) => q.nome === nome);
        return p ? { x: base.x + p.x, y: base.y + p.y } : null;
      }
      const p = (el.pinInfo ?? []).find((q) => q.name === nome);
      return p ? { x: base.x + p.x, y: base.y + p.y } : null;
    };

    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "fios");
    let semPino = 0;

    for (const [a, b, cor] of d.connections) {
      const pa = posDoPino(a), pb = posDoPino(b);
      if (!pa || !pb) { semPino++; continue; }

      // Rota do ELK quando existe: cotovelos, como fiação de verdade, e sem
      // atravessar componente. Sem ela, curva suave — reta vira borrão quando
      // há muitos fios paralelos.
      const rota = rotas.get(a + "|" + b) ?? rotas.get(b + "|" + a);
      let forma;
      if (rota && rota.length >= 2) {
        const r = 6; // canto arredondado, senão o cotovelo fica duro
        forma = "M " + rota[0].x + " " + rota[0].y;
        for (let i = 1; i < rota.length - 1; i++) {
          const p = rota[i], ant = rota[i - 1], prox = rota[i + 1];
          const rec = (de, para) => {
            const dx = para.x - de.x, dy = para.y - de.y;
            const d = Math.hypot(dx, dy) || 1;
            const t = Math.min(r, d / 2);
            return { x: de.x + (dx / d) * t, y: de.y + (dy / d) * t };
          };
          const entra = rec(p, ant), sai = rec(p, prox);
          forma += " L " + entra.x + " " + entra.y +
                   " Q " + p.x + " " + p.y + " " + sai.x + " " + sai.y;
        }
        const fim = rota[rota.length - 1];
        forma += " L " + fim.x + " " + fim.y;
      } else {
        const dx = Math.abs(pb.x - pa.x) * 0.4 + 12;
        forma = "M " + pa.x + " " + pa.y + " C " + (pa.x + dx) + " " + pa.y +
          ", " + (pb.x - dx) + " " + pb.y + ", " + pb.x + " " + pb.y;
      }
      const liga = a + "  →  " + b;

      // Duas cópias: uma grossa e invisível só para o mouse pegar — mirar num
      // traço de 1,6 px é frustrante — e a visível por cima dela.
      const toque = document.createElementNS(NS, "path");
      toque.setAttribute("class", "toque");
      toque.setAttribute("d", forma);
      toque.setAttribute("fill", "none");
      toque.setAttribute("data-liga", liga);
      svg.appendChild(toque);

      const caminho = document.createElementNS(NS, "path");
      caminho.setAttribute("d", forma);
      caminho.setAttribute("stroke", cor || "#888");
      caminho.setAttribute("fill", "none");
      caminho.setAttribute("stroke-width", "1.8");
      caminho.setAttribute("stroke-linecap", "round");
      caminho.setAttribute("data-liga", liga);
      caminho.style.color = cor || "#888"; // o drop-shadow usa currentColor
      svg.appendChild(caminho);
      toque._par = caminho;
    }
    palco.appendChild(svg); // por cima das peças

    // acender o fio sob o mouse, apagando os outros
    const rotulo = document.createElement("div");
    rotulo.className = "rotulo-fio";
    rotulo.hidden = true;
    alvo.appendChild(rotulo);

    let aceso = null;
    const apagar = () => {
      aceso?.classList.remove("aceso");
      aceso = null;
      svg.classList.remove("mirando");
      rotulo.hidden = true;
    };

    svg.addEventListener("mouseover", (ev) => {
      const alvoFio = ev.target._par ?? (ev.target.tagName === "path" ? ev.target : null);
      if (!alvoFio || alvoFio === aceso) return;
      apagar();
      aceso = alvoFio;
      aceso.classList.add("aceso");
      svg.classList.add("mirando");
      rotulo.textContent = alvoFio.getAttribute("data-liga");
      rotulo.hidden = false;
    });
    svg.addEventListener("mouseleave", apagar);
    palco.addEventListener("mousemove", (ev) => {
      if (rotulo.hidden) return;
      const caixa = alvo.getBoundingClientRect();
      rotulo.style.left = ev.clientX - caixa.left + 14 + "px";
      rotulo.style.top = ev.clientY - caixa.top - 8 + "px";
    });

    // enquadra: mede tudo, encolhe se não couber na largura do cartão
    const r = palco.getBoundingClientRect();
    let maxX = 0, maxY = 0;
    for (const { el } of elementos.values()) {
      const b = el.getBoundingClientRect();
      maxX = Math.max(maxX, b.right - r.left);
      maxY = Math.max(maxY, b.bottom - r.top);
    }
    maxX += 16; maxY += 16;
    svg.setAttribute("viewBox", "0 0 " + maxX + " " + maxY);
    svg.setAttribute("width", maxX);
    svg.setAttribute("height", maxY);

    // ── zoom ──────────────────────────────────────────────────────
    // A altura do container é FIXA. O zoom mexe só no conteúdo; se ele
    // crescesse junto, o botão + estaria esticando a caixa, não ampliando.
    const ALTURA_NA_PAGINA = Math.max(200, Math.min(maxY + 12, 420));
    alvo.style.height = ALTURA_NA_PAGINA + "px";

    const caber = () => Math.min(4, Math.max(0.1,
      Math.min((alvo.clientWidth - 16) / maxX, (alvo.clientHeight - 16) / maxY)));

    const nivel = document.querySelector(".zoom-nivel");
    let escala = 1, tx = 0, ty = 0;

    const aplicar = () => {
      palco.style.transform =
        "translate(" + tx + "px," + ty + "px) scale(" + escala + ")";
      // não mexe no campo enquanto ele está sendo digitado, senão o cursor
      // salta e o número apagado volta sozinho
      if (nivel && document.activeElement !== nivel) {
        nivel.value = Math.round(escala * 100) + "%";
      }
    };

    function centralizar() {
      escala = caber();
      tx = (alvo.clientWidth - maxX * escala) / 2;
      ty = (alvo.clientHeight - maxY * escala) / 2;
      aplicar();
    }

    /**
     * Amplia mantendo fixo o ponto (ax, ay) da vista — o centro, para os
     * botões; o cursor, para o ctrl+scroll. Sem isso o desenho foge do
     * lugar a cada clique.
     */
    const zoomar = (fator, ax, ay) => {
      const novo = Math.min(4, Math.max(0.1, escala * fator));
      tx = ax - (ax - tx) * (novo / escala);
      ty = ay - (ay - ty) * (novo / escala);
      escala = novo;
      aplicar();
    };
    const zoomarNoCentro = (fator) =>
      zoomar(fator, alvo.clientWidth / 2, alvo.clientHeight / 2);

    const irPara = (pct) => {
      const alvoEscala = Math.min(400, Math.max(10, pct)) / 100;
      zoomarNoCentro(alvoEscala / escala);
    };

    if (nivel) {
      nivel.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") { ev.preventDefault(); nivel.blur(); }
        else if (ev.key === "Escape") { nivel.blur(); aplicar(); }
        else if (ev.key === "ArrowUp") { ev.preventDefault(); zoomarNoCentro(1.1); }
        else if (ev.key === "ArrowDown") { ev.preventDefault(); zoomarNoCentro(1 / 1.1); }
      });
      nivel.addEventListener("blur", () => {
        const pct = parseFloat(String(nivel.value).replace(",", ".").replace(/[^\d.]/g, ""));
        if (Number.isFinite(pct)) irPara(pct);
        nivel.value = Math.round(escala * 100) + "%";
      });
      nivel.addEventListener("focus", () => nivel.select());
    }

    centralizar();

    // ── modal ─────────────────────────────────────────────────────
    const modal = document.getElementById("modal-circuito");
    const vaga = modal?.querySelector(".vaga-modal");
    const circuito = alvo.closest(".circuito");
    const ondeEstava = circuito?.parentElement;

    const abrirModal = () => {
      if (!modal || !vaga || !circuito) return;
      vaga.appendChild(circuito);
      // A altura inline da página vence o height:100% do CSS. Sem limpar,
      // o canvas fica com 420px no meio do modal e só cresce na horizontal.
      alvo.style.height = "";
      modal.showModal();
      requestAnimationFrame(centralizar);
    };
    const fecharModal = () => {
      if (!modal || !circuito || !ondeEstava) return;
      modal.close();
      ondeEstava.insertBefore(circuito, ondeEstava.querySelector("p"));
      alvo.style.height = ALTURA_NA_PAGINA + "px";
      requestAnimationFrame(centralizar);
    };

    modal?.querySelector(".fechar-modal")?.addEventListener("click", fecharModal);
    modal?.addEventListener("close", () => {
      // Esc fecha o <dialog> sozinho; sem isto o circuito ficaria preso lá.
      if (circuito && ondeEstava && !ondeEstava.contains(circuito)) fecharModal();
    });

    document.querySelectorAll(".zoom").forEach((b) => {
      b.addEventListener("click", () => {
        const acao = b.dataset.zoom;
        if (acao === "mais") zoomarNoCentro(1.3);
        else if (acao === "menos") zoomarNoCentro(1 / 1.3);
        else if (acao === "ajustar") centralizar();
        else if (acao === "modal") { modal?.open ? fecharModal() : abrirModal(); }
      });
    });

    // ctrl+scroll dá zoom; scroll normal continua rolando a página
    // A pinça do trackpad chega como wheel+ctrlKey e dispara dezenas de eventos
    // por gesto, com deltaY pequeno. Passo fixo por evento vira um salto
    // enorme; o fator tem que ser proporcional ao delta.
    alvo.addEventListener("wheel", (ev) => {
      if (!ev.ctrlKey && !ev.metaKey) return;
      ev.preventDefault();

      // deltaMode: 0 = pixel, 1 = linha, 2 = página. Sem normalizar, um mouse
      // de roda (que reporta linhas) fica absurdamente mais rápido.
      const porUnidade = ev.deltaMode === 1 ? 16 : ev.deltaMode === 2 ? 400 : 1;
      const delta = ev.deltaY * porUnidade;

      const caixa = alvo.getBoundingClientRect();
      zoomar(Math.exp(-delta * 0.005), ev.clientX - caixa.left, ev.clientY - caixa.top);
    }, { passive: false });

    // Arrastar para deslocar. Escuta no palco também porque o SVG dos fios
    // fica por cima e engole o mousedown que cair sobre um traço.
    let de = null;
    const comecar = (ev) => {
      if (ev.button !== 0 || ev.target.closest(".zoom, .fechar-modal")) return;
      de = { x: ev.clientX, y: ev.clientY, tx, ty };
      alvo.classList.add("arrastando");
      ev.preventDefault(); // sem isto o browser inicia arrasto de imagem/seleção
    };
    alvo.addEventListener("mousedown", comecar);
    palco.addEventListener("mousedown", comecar); // o SVG dos fios fica por cima

    addEventListener("mouseup", () => { de = null; alvo.classList.remove("arrastando"); });
    addEventListener("mousemove", (ev) => {
      if (!de) return;
      tx = de.tx + (ev.clientX - de.x);
      ty = de.ty + (ev.clientY - de.y);
      aplicar();
    });

    addEventListener("resize", centralizar);

    if (semPino) {
      const aviso = document.createElement("p");
      aviso.className = "aviso-desenho";
      aviso.textContent = semPino + " ligação(ões) não desenhada(s): pino não encontrado.";
      alvo.after(aviso);
    }
  }
})();
`;
