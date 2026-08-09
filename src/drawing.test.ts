import { describe, expect, test } from "bun:test";
import { DRAWING_SCRIPT } from "./drawing.ts";

describe("the drawing script is valid JavaScript", () => {
  // This is the file where a bare \n inside the template literal once became a
  // real newline in the emitted JS, leaving an unterminated string, a
  // SyntaxError, and every other script on the page dead with it.
  test("parses", () => {
    expect(() => new Function(DRAWING_SCRIPT)).not.toThrow();
  });

  test("no string is left open across two lines", () => {
    for (const [n, line] of DRAWING_SCRIPT.split("\n").entries()) {
      const quotes = (line.match(/(?<!\\)"/g) ?? []).length;
      expect(quotes % 2, `line ${n + 1}: ${line.trim().slice(0, 60)}`).toBe(0);
    }
  });

  test("is an IIFE, so it leaks nothing into the page", () => {
    expect(DRAWING_SCRIPT.trim()).toMatch(/^\/\/|^\(\(\)/);
    expect(DRAWING_SCRIPT).toContain("})();");
  });
});

describe("what it needs from the page", () => {
  test("reads the diagram embedded by the shell", () => {
    expect(DRAWING_SCRIPT).toContain('.source[data-file="diagram"]');
  });

  test("draws into the container the plugin renders", () => {
    expect(DRAWING_SCRIPT).toContain(".drawing");
  });

  test("gives up quietly when there is nothing to draw", () => {
    expect(DRAWING_SCRIPT).toMatch(/if \(!alvo \|\| !fonte/);
  });
});

describe("layout", () => {
  test("uses ELK with pins as fixed-position ports", () => {
    expect(DRAWING_SCRIPT).toContain("elk.algorithm");
    expect(DRAWING_SCRIPT).toContain("FIXED_POS");
    expect(DRAWING_SCRIPT).toContain("ORTHOGONAL");
  });

  test("falls back to the measured layout if ELK fails", () => {
    expect(DRAWING_SCRIPT).toMatch(/catch[\s\S]{0,200}arrumar\(\)/);
  });

  test("measures the real parts instead of trusting the written left/top", () => {
    expect(DRAWING_SCRIPT).toContain("getBoundingClientRect");
  });
});

describe("interaction", () => {
  test("pans by transform, not by scroll — scroll needs overflow to exist", () => {
    expect(DRAWING_SCRIPT).toContain("translate(");
  });

  test("zoom by pinch scales with the delta, never a fixed step per event", () => {
    expect(DRAWING_SCRIPT).toContain("Math.exp");
    expect(DRAWING_SCRIPT).toContain("deltaMode");
  });

  test("lights the wire under the cursor and labels where it goes", () => {
    expect(DRAWING_SCRIPT).toContain("aceso");
    expect(DRAWING_SCRIPT).toContain("data-liga");
  });
});
