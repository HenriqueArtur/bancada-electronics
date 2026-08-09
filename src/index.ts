/**
 * Electronics plugin: pin rules and a circuit drawing.
 *
 * Reads what the inventory plugin resolved onto the lesson — it never imports
 * it. If no inventory is installed the pin rules that depend only on the pin
 * number still run; dropping them because a sibling is missing would be worse.
 */
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type { Asset, Lesson, Plugin } from "bancada";
import { DRAWING_SCRIPT } from "./drawing.ts";
import { checkPins, type PartFacts, partFacts } from "./pins.ts";
import { CIRCUIT_STYLES } from "./styles.ts";

interface Settings {
  root: string;
  diagram: string;
  sketchDir: string;
  labels: {
    pins: string;
    circuit: string;
    simulate: string;
    /** Accessible names for the zoom controls. They are icon-only buttons,
     *  so the aria-label is the ONLY name a screen reader has for them. */
    zoomIn: string;
    zoomOut: string;
    zoomFit: string;
    zoomFull: string;
    zoomLevel: string;
    close: string;
  };
}

const DEFAULTS: Settings = {
  root: "",
  diagram: "diagram.json",
  sketchDir: "sketch",
  labels: {
    pins: "Pins",
    circuit: "Circuit",
    simulate: "Paste both into a new Wokwi project.",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    zoomFit: "Fit to width",
    zoomFull: "Open full screen",
    zoomLevel: "Zoom level, percent",
    close: "Close",
  },
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Reads the electronics facts out of whatever the inventory plugin attached. */
function factsFrom(lesson: Lesson): Map<string, PartFacts> {
  const uses = (lesson.items ?? []) as { id: string; item: unknown }[];
  const facts = new Map<string, PartFacts>();

  for (const use of uses) {
    const item = use.item as {
      name: string;
      kind?: string;
      extra: Record<string, unknown>;
    } | null;
    if (item) facts.set(use.id, partFacts(item));
  }
  return facts;
}

export function electronicsPlugin(): Plugin {
  let settings: Settings = DEFAULTS;

  return {
    name: "electronics",

    configure(config) {
      const raw = config as Partial<Settings>;
      settings = {
        ...DEFAULTS,
        ...raw,
        labels: { ...DEFAULTS.labels, ...raw.labels },
      };
    },

    async cards(lesson: Lesson) {
      const cards: string[] = [];
      const pins = (lesson.front.pinos ?? {}) as Record<string, string>;
      const facts = factsFrom(lesson);

      if (Object.keys(pins).length > 0) {
        const rows = Object.entries(pins)
          .map(
            ([pin, id]) =>
              `<div class="part"><span>GPIO ${escapeHtml(pin)}</span>` +
              `<span class="badge">${escapeHtml(facts.get(id)?.name ?? id)}</span></div>`,
          )
          .join("");
        cards.push(`<div class="card"><h3>${escapeHtml(settings.labels.pins)}</h3>${rows}</div>`);
      }

      const circuit = await circuitCard(lesson, settings);
      if (circuit) cards.push(circuit);

      return cards;
    },

    validate(lesson: Lesson) {
      const pins = (lesson.front.pinos ?? {}) as Record<string, string>;
      return checkPins(lesson.id, pins, factsFrom(lesson));
    },

    styles: () => [CIRCUIT_STYLES],

    scripts: () => [DRAWING_SCRIPT],

    assets: (): Asset[] => [
      {
        name: "wokwi-elements.js",
        path: join(settings.root, "node_modules/@wokwi/elements/dist/wokwi-elements.bundle.min.js"),
        type: "text/javascript; charset=utf-8",
      },
      {
        name: "elk.js",
        path: join(settings.root, "node_modules/elkjs/lib/elk.bundled.js"),
        type: "text/javascript; charset=utf-8",
      },
    ],
  };
}

/**
 * The circuit card: the drawing, its zoom controls, and both files ready to
 * paste into Wokwi.
 *
 * The file contents ride in a hidden <pre>, escaped, rather than in a
 * <script>: a `</script>` inside a sketch would close the tag and take the
 * page with it, and file contents are exactly where arbitrary text shows up.
 */
async function circuitCard(lesson: Lesson, settings: Settings): Promise<string | null> {
  const diagram = await Bun.file(join(lesson.path, settings.diagram))
    .text()
    .catch(() => null);

  const inSketch = await readdir(join(lesson.path, settings.sketchDir)).catch(() => []);
  const sketchName = inSketch.find((f) => f.endsWith(".ino"));
  const sketch = sketchName
    ? await Bun.file(join(lesson.path, settings.sketchDir, sketchName))
        .text()
        .catch(() => null)
    : null;

  if (!diagram && !sketch) return null;

  const button = (key: string, label: string) =>
    `<button class="copy-file" type="button" data-file="${key}"
      aria-label="${escapeHtml(label)}">${escapeHtml(label)}</button>`;

  const source = (key: string, content: string) =>
    `<pre hidden class="source" data-file="${key}">${escapeHtml(content)}</pre>`;

  return `<div class="card"><h3>${escapeHtml(settings.labels.circuit)}</h3>
    ${
      diagram
        ? `<div class="circuit">
      <div class="drawing">…</div>
      <div class="zooms">
        <button class="zoom" type="button" data-zoom="out" aria-label="${escapeHtml(settings.labels.zoomOut)}">−</button>
        <input class="zoom-level" type="text" inputmode="numeric" value="100%"
          aria-label="${escapeHtml(settings.labels.zoomLevel)}" size="4">
        <button class="zoom" type="button" data-zoom="in" aria-label="${escapeHtml(settings.labels.zoomIn)}">+</button>
        <button class="zoom" type="button" data-zoom="fit" aria-label="${escapeHtml(settings.labels.zoomFit)}">⤡</button>
        <button class="zoom" type="button" data-zoom="full" aria-label="${escapeHtml(settings.labels.zoomFull)}">⤢</button>
      </div>
    </div>
    <dialog id="modal-circuit">
      <button class="close-modal" type="button" aria-label="${escapeHtml(settings.labels.close)}">✕</button>
      <div class="modal-slot"></div>
    </dialog>`
        : ""
    }
    <p style="font-size:14px;margin:.9rem 0">${escapeHtml(settings.labels.simulate)}</p>
    <div class="actions">
      ${diagram ? button("diagram", settings.diagram) : ""}
      ${sketch && sketchName ? button("sketch", sketchName) : ""}
    </div>
    ${diagram ? source("diagram", diagram) : ""}
    ${sketch ? source("sketch", sketch) : ""}</div>`;
}

/**
 * The factory, declared. The loader takes `default` or a named `plugin`, and
 * refuses to guess: it once picked `checkRunningLow` because that happened to
 * be the first exported function.
 */
export default electronicsPlugin;
