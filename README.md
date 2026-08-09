# @bancada/electronics

Electronics plugin for [bancada](https://github.com/HenriqueArtur/bancada):
ESP32 pin rules, and a circuit drawing rendered from the lesson's
`diagram.json`.

## The rules

Every rule here describes a failure that is **silent**. That is the bar for
one existing: a mistake the compiler catches does not need a linter.

| rule | what actually happens |
|---|---|
| GPIO 6–11 | internal flash — the board hangs, with no message |
| GPIO 34–39 as an output | drives nothing, and compiles fine |
| analog on ADC2 | works until Wi-Fi comes up, then returns garbage |
| the same GPIO twice | one of the two silently wins |

The ADC2 one is the cruellest: the project works through all of development
and breaks the day it gains Wi-Fi, with nothing near the reading having
changed.

## The drawing

Built from the same `diagram.json` [Wokwi](https://wokwi.com) uses, with
Wokwi's own web components. Layout and wire routing come from
[ELK](https://github.com/kieler/elkjs), which is built for exactly this: nodes
with measured sizes, **ports at fixed positions** — the pins — and crossing
minimisation.

Static on purpose. This is for seeing the wiring, not for simulating it.

- wires are drawn **above** the parts; underneath a board they disappear, and
  a wire you cannot follow documents nothing
- hovering lights one wire, dims the rest, and names both ends
- pan by transform rather than scroll, so dragging works at any zoom
- pinch scales with the delta: a fixed step per event explodes on a trackpad,
  which fires dozens of them per gesture

Two parts the open element package does not have — `board-ssd1306` and
`wokwi-relay-module` — are drawn as a labelled box with the pins that diagram
uses, so the wires still land where they should.

## It needs the inventory, and works without it

The pin rules have to know whether a part is an output and whether it is
analog. That lives in [`@bancada/inventory`](https://github.com/HenriqueArtur/bancada-inventory),
which this plugin **never imports**: it reads what the inventory attached to
the lesson, so declare `inventory` first in the config.

With no inventory installed, the rules that depend only on the pin number
still run. Dropping them because a sibling plugin is missing would be worse.

## Install

```bash
bun add @bancada/electronics
```

```json
{
  "plugins": [
    { "name": "inventory", "script": "@bancada/inventory", "config": {} },
    {
      "name": "electronics",
      "script": "@bancada/electronics",
      "config": { "diagram": "diagram.json", "sketchDir": "sketch" }
    }
  ]
}
```

| setting | default | what it is |
|---|---|---|
| `diagram` | `diagram.json` | the circuit file, inside the lesson folder |
| `sketchDir` | `sketch` | folder holding the `.ino` |
| `labels` | English | every string the cards put on screen |

### Labels

Overriding one key leaves the rest in English.

| key | default | where it shows |
|---|---|---|
| `pins` | `Pins` | title of the pins card |
| `circuit` | `Circuit` | title of the circuit card |
| `simulate` | see below | the line under the drawing |
| `zoomIn` | `Zoom in` | zoom controls — icon-only buttons, so the |
| `zoomOut` | `Zoom out` | aria-label is the ONLY name a screen reader |
| `zoomFit` | `Fit to width` | has for them |
| `zoomFull` | `Open full screen` | |
| `zoomLevel` | `Zoom level, percent` | the editable percentage field |
| `close` | `Close` | the modal's close button |

The `data-zoom` values (`in`, `out`, `fit`, `full`) are stable ids the script
dispatches on — they are not display text and do not change with the language.

## License

MIT.
