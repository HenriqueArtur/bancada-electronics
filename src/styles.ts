/**
 * Styles the circuit drawing needs. They ship with the plugin, not with the
 * shell — a marketing repository has no reason to carry CSS about wires.
 *
 * Colours come from the theme variables the shell publishes, so the drawing
 * follows whatever theme the reader picked.
 */

export const CIRCUIT_STYLES = `
  .circuit { position: relative; }
  .drawing {
    position: relative; overflow: hidden; border-radius: 7px;
    background: var(--canvas-bg);
    background-image:
      linear-gradient(var(--canvas-grid) 1px, transparent 1px),
      linear-gradient(90deg, var(--canvas-grid) 1px, transparent 1px);
    background-size: 16px 16px;
    border: 1px solid var(--border);
    min-height: 60px; font-size: 13px; color: var(--muted);
    cursor: grab; user-select: none; -webkit-user-select: none;
  }
  .drawing.empty { padding: 1rem; display: flex; align-items: center; justify-content: center; }
  .drawing.dragging { cursor: grabbing; }
  /* Panning by transform, not by scroll: with scroll, dragging only works
     when there is overflow, and at the initial fit the content does fit. */
  .stage { position: absolute; top: 0; left: 0; transform-origin: 0 0; }

  .zooms {
    position: absolute; top: .5rem; right: .5rem; z-index: 3;
    display: flex; align-items: center; gap: .18rem; padding: .18rem;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 6px; opacity: .35; transition: opacity .13s;
  }
  .circuit:hover .zooms, .zooms:focus-within { opacity: 1; }
  .zoom {
    width: 24px; height: 24px; cursor: pointer; line-height: 1;
    font: 600 13px/1 ui-sans-serif, system-ui, sans-serif;
    color: var(--text); background: none; border: 0; border-radius: 4px;
  }
  .zoom:hover { background: var(--code-bg); color: var(--accent); }
  .zoom-level {
    width: 46px; text-align: center; color: var(--muted);
    font: 11px/1 ui-monospace, monospace; font-variant-numeric: tabular-nums;
    background: none; border: 1px solid transparent; border-radius: 4px;
    padding: .3rem 0;
  }
  .zoom-level:hover { border-color: var(--border); }
  .zoom-level:focus {
    outline: none; color: var(--text);
    background: var(--bg); border-color: var(--accent);
  }

  /* Wires sit ABOVE the parts: routed under the board they disappear, and a
     wire you cannot follow documents no connection at all. */
  .wires { position: absolute; top: 0; left: 0; overflow: visible; pointer-events: none; }
  .wires path { pointer-events: stroke; transition: stroke-width .1s, opacity .1s; }
  .wires .hit { stroke: transparent; stroke-width: 12; }
  .wires.aiming path:not(.lit) { opacity: .22; }
  .wires path.lit { stroke-width: 3.2; filter: drop-shadow(0 0 3px currentColor); }
  #modal-circuit {
    width: 94vw; height: 92vh; max-width: none; max-height: none;
    padding: 0; border: 1px solid var(--border); border-radius: 10px;
    background: var(--surface); color: var(--text); overflow: hidden;
  }
  #modal-circuit::backdrop { background: rgba(0,0,0,.55); }
  .modal-slot { width: 100%; height: 100%; }
  .modal-slot .circuit, .modal-slot .drawing { height: 100%; }
  .close-modal {
    position: absolute; top: .6rem; left: .6rem; z-index: 5;
    width: 28px; height: 28px; cursor: pointer; border-radius: 5px;
    font: 600 13px/1 ui-sans-serif, system-ui, sans-serif;
    color: var(--text); background: var(--surface); border: 1px solid var(--border);
  }
  .close-modal:hover { color: var(--accent); border-color: var(--accent); }

  .wire-label {
    position: absolute; z-index: 4; pointer-events: none;
    padding: .2rem .45rem; border-radius: 4px; white-space: nowrap;
    font: 11px/1.3 ui-monospace, monospace;
    background: var(--surface); color: var(--text);
    border: 1px solid var(--border); box-shadow: 0 1px 6px rgba(0,0,0,.18);
  }
  .improvised {
    position: absolute; box-sizing: border-box; border-radius: 5px;
    background: #fff; border: 1.5px dashed #b9b2a6;
  }
  .improvised .name {
    position: absolute; top: 8px; left: 0; right: 0; text-align: center;
    font: 600 10px/1.2 ui-sans-serif, system-ui, sans-serif; color: #6b6862;
  }
  .improvised .pin {
    position: absolute; bottom: 3px; width: 28px; text-align: center;
    font: 9px/1 ui-monospace, monospace; color: #8a8378;
  }
  .drawing-warning { font-size: 12px; color: var(--muted); margin: .5rem 0 0; }
  .drawing-legend {
    font-size: 12px; color: var(--muted); margin: .5rem 0 0; line-height: 1.5;
  }
`;
