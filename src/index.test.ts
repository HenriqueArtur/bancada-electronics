import { describe, expect, test } from "bun:test";
import { electronicsPlugin } from "./index.ts";

/** A lesson folder that really has a diagram and a sketch, so the circuit
 *  card is actually rendered instead of being skipped. */
const FIXTURE = new URL("../test/lesson", import.meta.url).pathname;

const lesson = (front: Record<string, unknown> = {}) => ({
  id: "03-traffic-light",
  title: "Traffic light",
  level: 1,
  requires: [],
  path: "/tmp/no-such-lesson",
  front,
  body: "",
});

describe("the plugin surface", () => {
  const p = electronicsPlugin();

  test("answers to the name the config declares", () => {
    expect(p.name).toBe("electronics");
  });

  test("brings the two assets the drawing needs", () => {
    const names = p.assets!().map((a) => a.name);
    expect(names).toEqual(["wokwi-elements.js", "elk.js"]);
  });

  test("ships its own styles and script — the shell carries neither", () => {
    expect(p.styles!().join("")).toContain(".drawing");
    expect(p.scripts!().join("")).toContain("pinInfo");
  });
});

describe("cards", () => {
  const p = electronicsPlugin();

  test("no pins declared, no pins card", async () => {
    expect(await p.cards!(lesson())).toEqual([]);
  });

  test("renders a pins card from the frontmatter", async () => {
    const cards = await p.cards!(lesson({ pinos: { 23: "led" } }));
    expect(cards.join("")).toContain("GPIO 23");
  });

  test("a lesson with no diagram file gets no circuit card, not a crash", async () => {
    const cards = await p.cards!(lesson({ pinos: { 23: "led" } }));
    expect(cards).toHaveLength(1);
  });
});

describe("validate", () => {
  const p = electronicsPlugin();

  test("catches a flash pin even with no inventory installed", () => {
    const found = p.validate!(lesson({ pinos: { 7: "whatever" } }));
    expect(found.map((f: { message: string }) => f.message).join()).toContain("flash");
  });

  test("says nothing about a lesson that declares no pins", () => {
    expect(p.validate!(lesson())).toEqual([]);
  });
});

/**
 * The zoom controls are icon-only buttons: `−`, `+`, `⤡`, `⤢`, `✕`. The
 * aria-label is the only name a screen reader has for them, so shipping it
 * hardcoded in one language makes the drawing unusable in any other.
 */
describe("the drawing controls speak the configured language", () => {
  const configured = (labels: Record<string, string>) => {
    const p = electronicsPlugin();
    p.configure!({ labels, root: FIXTURE });
    return p;
  };

  const circuitCard = async (p: ReturnType<typeof electronicsPlugin>) =>
    (await p.cards!({ ...lesson({ pinos: { 23: "led" } }), path: FIXTURE })).join("");

  test("every control label can be replaced from the config", async () => {
    const p = configured({
      zoomIn: "Aumentar",
      zoomOut: "Diminuir",
      zoomFit: "Ajustar à largura",
      zoomFull: "Abrir em tela cheia",
      zoomLevel: "Nível de zoom",
      close: "Fechar",
    });
    const html = await circuitCard(p);
    for (const t of ["Aumentar", "Diminuir", "Ajustar à largura", "Fechar"]) {
      expect(html, t).toContain(`aria-label="${t}"`);
    }
  });

  test("renaming one label keeps the English defaults for the rest", async () => {
    const html = await circuitCard(configured({ zoomIn: "Aumentar" }));
    expect(html).toContain('aria-label="Aumentar"');
    expect(html).toContain('aria-label="Zoom out"');
  });

  test("the defaults are English", async () => {
    const html = await circuitCard(electronicsPlugin());
    for (const t of ["Zoom in", "Zoom out", "Fit to width", "Close"]) {
      expect(html, t).toContain(`aria-label="${t}"`);
    }
  });

  test("no zoom button is left without an accessible name", async () => {
    const html = await circuitCard(electronicsPlugin());
    const buttons = html.match(/<button[^>]*class="zoom"[^>]*>/g) ?? [];
    expect(buttons.length).toBe(4);
    for (const b of buttons) expect(b, b).toMatch(/aria-label="[^"]+"/);
  });

  test("the action names in data-zoom are stable ids, not display text", async () => {
    const html = await circuitCard(configured({ zoomIn: "Aumentar" }));
    for (const action of ["in", "out", "fit", "full"]) {
      expect(html, action).toContain(`data-zoom="${action}"`);
    }
  });
});
