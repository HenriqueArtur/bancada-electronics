/**
 * Styles the circuit drawing needs. They ship with the plugin, not with the
 * shell — a marketing repository has no reason to carry CSS about wires.
 *
 * Colours come from the theme variables the shell publishes, so the drawing
 * follows whatever theme the reader picked.
 */

export const CIRCUIT_STYLES = `
  .circuito { position: relative; }
  .desenho {
    position: relative; overflow: hidden; border-radius: 7px;
    background: var(--desenho-fundo);
    background-image:
      linear-gradient(var(--desenho-grade) 1px, transparent 1px),
      linear-gradient(90deg, var(--desenho-grade) 1px, transparent 1px);
    background-size: 16px 16px;
    border: 1px solid var(--linha);
    min-height: 60px; font-size: 13px; color: var(--suave);
    cursor: grab; user-select: none; -webkit-user-select: none;
  }
  .desenho.vazio { padding: 1rem; display: flex; align-items: center; justify-content: center; }
  .desenho.arrastando { cursor: grabbing; }
  /* Deslocamento por transform, não por scroll: com scroll o arrasto só
     funciona quando há overflow, e no encaixe inicial o conteúdo cabe. */
  .palco { position: absolute; top: 0; left: 0; transform-origin: 0 0; }

  .zooms {
    position: absolute; top: .5rem; right: .5rem; z-index: 3;
    display: flex; align-items: center; gap: .18rem; padding: .18rem;
    background: var(--caixa); border: 1px solid var(--linha);
    border-radius: 6px; opacity: .35; transition: opacity .13s;
  }
  .circuito:hover .zooms, .zooms:focus-within { opacity: 1; }
  .zoom {
    width: 24px; height: 24px; cursor: pointer; line-height: 1;
    font: 600 13px/1 ui-sans-serif, system-ui, sans-serif;
    color: var(--texto); background: none; border: 0; border-radius: 4px;
  }
  .zoom:hover { background: var(--codigo); color: var(--destaque); }
  .zoom-nivel {
    width: 46px; text-align: center; color: var(--suave);
    font: 11px/1 ui-monospace, monospace; font-variant-numeric: tabular-nums;
    background: none; border: 1px solid transparent; border-radius: 4px;
    padding: .3rem 0;
  }
  .zoom-nivel:hover { border-color: var(--linha); }
  .zoom-nivel:focus {
    outline: none; color: var(--texto);
    background: var(--fundo); border-color: var(--destaque);
  }

  /* Os fios ficam ACIMA das peças: passando por baixo da placa eles somem, e
     um fio que não dá para seguir não documenta ligação nenhuma. */
  .fios { position: absolute; top: 0; left: 0; overflow: visible; pointer-events: none; }
  .fios path { pointer-events: stroke; transition: stroke-width .1s, opacity .1s; }
  .fios .toque { stroke: transparent; stroke-width: 12; }
  .fios.mirando path:not(.aceso) { opacity: .22; }
  .fios path.aceso { stroke-width: 3.2; filter: drop-shadow(0 0 3px currentColor); }
  #modal-circuito {
    width: 94vw; height: 92vh; max-width: none; max-height: none;
    padding: 0; border: 1px solid var(--linha); border-radius: 10px;
    background: var(--caixa); color: var(--texto); overflow: hidden;
  }
  #modal-circuito::backdrop { background: rgba(0,0,0,.55); }
  .vaga-modal { width: 100%; height: 100%; }
  .vaga-modal .circuito, .vaga-modal .desenho { height: 100%; }
  .fechar-modal {
    position: absolute; top: .6rem; left: .6rem; z-index: 5;
    width: 28px; height: 28px; cursor: pointer; border-radius: 5px;
    font: 600 13px/1 ui-sans-serif, system-ui, sans-serif;
    color: var(--texto); background: var(--caixa); border: 1px solid var(--linha);
  }
  .fechar-modal:hover { color: var(--destaque); border-color: var(--destaque); }

  .rotulo-fio {
    position: absolute; z-index: 4; pointer-events: none;
    padding: .2rem .45rem; border-radius: 4px; white-space: nowrap;
    font: 11px/1.3 ui-monospace, monospace;
    background: var(--caixa); color: var(--texto);
    border: 1px solid var(--linha); box-shadow: 0 1px 6px rgba(0,0,0,.18);
  }
  .improviso {
    position: absolute; box-sizing: border-box; border-radius: 5px;
    background: #fff; border: 1.5px dashed #b9b2a6;
  }
  .improviso .nome {
    position: absolute; top: 8px; left: 0; right: 0; text-align: center;
    font: 600 10px/1.2 ui-sans-serif, system-ui, sans-serif; color: #6b6862;
  }
  .improviso .pino {
    position: absolute; bottom: 3px; width: 28px; text-align: center;
    font: 9px/1 ui-monospace, monospace; color: #8a8378;
  }
  .aviso-desenho { font-size: 12px; color: var(--suave); margin: .5rem 0 0; }
  .legenda-desenho {
    font-size: 12px; color: var(--suave); margin: .5rem 0 0; line-height: 1.5;
  }

  .fora-do-template { font-size: 13px; color: var(--suave); margin: -.4rem 0 1.4rem; }
  .secao-nota { margin-bottom: 1.4rem; }
  .secao-nota label {
    display: block; margin-bottom: .4rem;
    font: 600 13px/1.3 ui-sans-serif, system-ui, sans-serif;
    color: var(--texto);
  }
  .secao-nota label::before { content: "## "; color: var(--suave); font-weight: 400; }
  .editor textarea {
    width: 100%; min-height: 7rem; resize: vertical; padding: .8rem 1rem;
    background: var(--caixa); color: var(--texto);
    border: 1px solid var(--linha); border-radius: 7px;
    font: 14px/1.65 ui-monospace, "SF Mono", Menlo, monospace;
  }
  .editor textarea:focus { outline: none; border-color: var(--destaque); }
  .linha-status {
    display: flex; align-items: center; flex-wrap: wrap; gap: .4rem;
    margin-bottom: .9rem;
  }
  .linha-status .rotulo {
    font-size: 12px; text-transform: uppercase; letter-spacing: .07em;
    color: var(--suave); margin-right: .3rem; font-weight: 600;
  }
  .marca-status {
    cursor: pointer; padding: .4rem .75rem; border-radius: 20px;
    font: 13px/1 ui-sans-serif, system-ui, sans-serif;
    color: var(--suave); background: none; border: 1px solid var(--linha);
    transition: color .12s, border-color .12s, background .12s;
  }
  .marca-status:hover { color: var(--texto); border-color: var(--suave); }
  .marca-status.ativo {
    color: #fff; background: var(--destaque); border-color: var(--destaque);
    font-weight: 600;
  }
  .linha-editor { display: flex; align-items: center; gap: .8rem; margin-top: .7rem; }
  .salvar-notas {
    cursor: pointer; padding: .5rem 1.1rem; border-radius: 6px; font-weight: 600;
    font-size: 13px; color: #fff; background: var(--destaque); border: 0;
  }
  .salvar-notas:hover { filter: brightness(1.08); }
  .dica { font-size: 12px; color: var(--suave); }
  .salvo { font-size: 12px; color: var(--cod-texto); font-weight: 600; }
  .salvo.ruim { color: var(--destaque); }

`;
