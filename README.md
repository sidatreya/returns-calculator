# Sidatreya Designs — Returns & Yields Calculator (prototype)

Standalone prototype for US property investment returns. Designed to plug into the existing Zillow-linked property tool later — **not integrated yet**.

## Open it

- File: open `index.html` in a browser, or
- Local server (from this folder): `python3 -m http.server <port>`

## Files

| File | Role |
|---|---|
| `calc-core.js` | Pure maths + `fromDeal` plugin adapter |
| `index.html` | Standalone UI |
| `PLUGIN.md` | Inputs/outputs contract for later integration |
| `presets/case-study-template.json` | Empty case-study preset (waiting for Sid) |
| `test-calc.mjs` | Node maths check with labelled dummy numbers |

## Run the test

```bash
node test-calc.mjs
```
