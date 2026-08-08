import { describe, expect, test } from "bun:test";
import { ADC2_PINS, checkPins, INPUT_ONLY_PINS, partFacts, RESERVED_PINS } from "./pins.ts";

const facts = (over: Partial<ReturnType<typeof partFacts>> = {}) => ({
  name: "Red LED",
  isOutput: true,
  isAnalog: false,
  ...over,
});

const parts = new Map([
  ["led", facts()],
  ["led2", facts({ name: "Green LED" })],
  ["button", facts({ name: "Button", isOutput: false })],
  ["ldr", facts({ name: "LDR", isOutput: false, isAnalog: true })],
]);

const msgs = (f: { message: string }[]) => f.map((x) => x.message).join(" | ");

describe("pin facts", () => {
  test("flash pins are 6 to 11", () => {
    expect(RESERVED_PINS).toEqual([6, 7, 8, 9, 10, 11]);
  });

  test("input-only pins are the high ADC1 ones", () => {
    expect(INPUT_ONLY_PINS).toEqual([34, 35, 36, 39]);
  });

  test("no input-only pin is also reserved — two messages for one case", () => {
    expect(INPUT_ONLY_PINS.filter((p) => RESERVED_PINS.includes(p))).toEqual([]);
  });

  test("ADC2 never overlaps 32-39, which is ADC1", () => {
    expect(ADC2_PINS.filter((p) => p >= 32 && p <= 39)).toEqual([]);
  });
});

describe("partFacts — reading the inventory's `extra`", () => {
  test("an output is a part whose kind says so", () => {
    expect(partFacts({ name: "LED", kind: "saida", extra: {} }).isOutput).toBe(true);
    expect(partFacts({ name: "Button", kind: "entrada", extra: {} }).isOutput).toBe(false);
  });

  test("analog comes from the subject field the inventory kept", () => {
    expect(partFacts({ name: "LDR", extra: { interface: "analogico" } }).isAnalog).toBe(true);
    expect(partFacts({ name: "LED", extra: { interface: "digital" } }).isAnalog).toBe(false);
  });

  test("an item with no subject fields is simply not analog, not a crash", () => {
    expect(partFacts({ name: "x", extra: {} }).isAnalog).toBe(false);
  });
});

describe("checkPins", () => {
  test("accepts a sane pinout", () => {
    expect(checkPins("03-x", { 23: "led", 18: "button" }, parts)).toEqual([]);
  });

  test.each([6, 7, 8, 9, 10, 11])("refuses GPIO %i — internal flash", (pin) => {
    expect(msgs(checkPins("03-x", { [pin]: "led" }, parts))).toContain("flash");
  });

  test.each([34, 35, 36, 39])("refuses an output on GPIO %i — input only", (pin) => {
    expect(msgs(checkPins("03-x", { [pin]: "led" }, parts))).toContain("input only");
  });

  test.each([34, 35, 36, 39])("accepts an input on GPIO %i", (pin) => {
    expect(checkPins("03-x", { [pin]: "button" }, parts)).toEqual([]);
  });

  test("warns when an analog part lands on ADC2", () => {
    const f = checkPins("03-x", { 25: "ldr" }, parts);
    expect(f).toHaveLength(1);
    expect(f[0]!.level).toBe("warning");
    expect(f[0]!.message).toContain("ADC2");
  });

  test("does not warn about ADC2 for a digital part — the pin is fine", () => {
    expect(checkPins("03-x", { 25: "led" }, parts)).toEqual([]);
  });

  test("catches the same GPIO used twice", () => {
    expect(msgs(checkPins("03-x", { "23": "led", " 23": "led2" }, parts))).toContain("twice");
  });

  test("catches a key that is not a GPIO number", () => {
    expect(msgs(checkPins("03-x", { SDA: "led" }, parts))).toContain("SDA");
  });
});

describe("without the inventory plugin installed", () => {
  // The pin rules that depend only on the pin number still have to run;
  // dropping them because a sibling plugin is missing would be worse.
  const nenhum = new Map<string, ReturnType<typeof facts>>();

  test("still catches a flash pin", () => {
    expect(msgs(checkPins("03-x", { 7: "whatever" }, nenhum))).toContain("flash");
  });

  test("still catches the same pin twice", () => {
    expect(msgs(checkPins("03-x", { "23": "a", " 23": "b" }, nenhum))).toContain("twice");
  });

  test("says the part is unknown, once per pin", () => {
    const f = checkPins("03-x", { 23: "led" }, nenhum);
    expect(f).toHaveLength(1);
    expect(f[0]!.message).toContain("not in the inventory");
  });

  test("does not invent an input-only or ADC2 finding it cannot know", () => {
    const f = checkPins("03-x", { 34: "led" }, nenhum);
    expect(msgs(f)).not.toContain("input only");
  });
});
