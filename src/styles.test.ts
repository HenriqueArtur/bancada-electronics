import { describe, expect, test } from "bun:test";
import { CIRCUIT_STYLES } from "./styles.ts";

describe("circuit styles", () => {
  test("style the containers the plugin renders", () => {
    for (const cls of [".drawing", ".stage", ".wires", ".zooms", "#modal-circuit"]) {
      expect(CIRCUIT_STYLES, cls).toContain(cls);
    }
  });

  test("take colours from the shell's theme variables, never fixed ones", () => {
    // a hardcoded colour here would ignore whichever theme the reader picked
    expect(CIRCUIT_STYLES).toContain("var(--canvas-bg)");
    expect(CIRCUIT_STYLES).toContain("var(--border)");
  });

  test("pan by transform, which works at any zoom", () => {
    expect(CIRCUIT_STYLES).toContain("transform-origin: 0 0");
    expect(CIRCUIT_STYLES).toContain("overflow: hidden");
  });

  test("say dragging is possible, and stop text selection while it happens", () => {
    expect(CIRCUIT_STYLES).toContain("cursor: grab");
    expect(CIRCUIT_STYLES).toContain("user-select: none");
  });

  test("braces balance — an unclosed rule swallows everything after it", () => {
    const open = (CIRCUIT_STYLES.match(/\{/g) ?? []).length;
    const close = (CIRCUIT_STYLES.match(/\}/g) ?? []).length;
    expect(open).toBe(close);
  });
});
