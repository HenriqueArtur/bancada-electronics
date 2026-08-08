import { describe, expect, test } from "bun:test";
import { electronicsPlugin } from "./index.ts";

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
    expect(p.styles!().join("")).toContain(".desenho");
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
