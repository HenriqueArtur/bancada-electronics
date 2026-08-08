/**
 * ESP32 pin rules.
 *
 * Every rule here describes a failure that is SILENT: the board hangs with no
 * message, the pin drives nothing without a compile error, the reading turns
 * to garbage only once Wi-Fi comes up. A rule that fails loudly on its own
 * does not need to be here.
 *
 * The rules need to know whether a part is an output and whether it is analog.
 * That lives in the inventory, which is a different plugin — so this module
 * takes it as an argument and works without it, just with less to say.
 */

/** Internal flash pins: using one hangs the board. */
export const RESERVED_PINS = [6, 7, 8, 9, 10, 11];

/** Input only — they drive no LED and no buzzer. */
export const INPUT_ONLY_PINS = [34, 35, 36, 39];

/** ADC2 stops working the moment Wi-Fi comes up. */
export const ADC2_PINS = [0, 2, 4, 12, 13, 14, 15, 25, 26, 27];

export interface Finding {
  level: "error" | "warning";
  where: string;
  message: string;
}

/** What this plugin needs to know about a part, read from the inventory's `extra`. */
export interface PartFacts {
  name: string;
  isOutput: boolean;
  isAnalog: boolean;
}

const error = (where: string, message: string): Finding => ({
  level: "error",
  where,
  message,
});
const warning = (where: string, message: string): Finding => ({
  level: "warning",
  where,
  message,
});

/**
 * Reads the electronics fields out of whatever the inventory plugin loaded.
 * Keeps the coupling to one function instead of spreading `extra.tensao`
 * across the rules.
 */
export function partFacts(item: {
  name: string;
  kind?: string;
  extra: Record<string, unknown>;
}): PartFacts {
  return {
    name: item.name,
    isOutput: item.kind === "saida",
    isAnalog: item.extra.interface === "analogico",
  };
}

export function checkPins(
  lessonId: string,
  pins: Record<string, string>,
  parts: Map<string, PartFacts>,
): Finding[] {
  const findings: Finding[] = [];
  const seen = new Map<number, string>();

  for (const [key, partId] of Object.entries(pins)) {
    const pin = Number(key);

    if (!Number.isInteger(pin)) {
      findings.push(error(lessonId, `pin key '${key}' is not a GPIO number`));
      continue;
    }

    const previous = seen.get(pin);
    if (previous !== undefined) {
      findings.push(error(lessonId, `GPIO ${pin} is used twice: ${previous} and ${partId}`));
    }
    seen.set(pin, partId);

    // These two hold whether or not an inventory is installed.
    if (RESERVED_PINS.includes(pin)) {
      findings.push(error(lessonId, `GPIO ${pin} is internal flash — the board hangs`));
    }

    const part = parts.get(partId);
    if (!part) {
      // No inventory plugin, or the part is unknown to it. Say so once and
      // move on: the pin-level rules above still ran.
      findings.push(
        error(lessonId, `GPIO ${pin} points at '${partId}', which is not in the inventory`),
      );
      continue;
    }

    if (INPUT_ONLY_PINS.includes(pin) && part.isOutput) {
      findings.push(error(lessonId, `GPIO ${pin} is input only and ${part.name} is an output`));
    }
    if (ADC2_PINS.includes(pin) && part.isAnalog) {
      findings.push(
        warning(
          lessonId,
          `GPIO ${pin} is on ADC2, which dies once Wi-Fi is up; ${part.name} is analog — prefer 32-36 or 39`,
        ),
      );
    }
  }

  return findings;
}
