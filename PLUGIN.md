# Sidatreya Designs — Returns & Yields Calculator plugin contract

**Status:** Prototype only. Not wired into the property tool yet.
**Core module:** `calc-core.js` (ES module, no DOM)

## Purpose

Later, the US property identification tool (`/workspace/us-realestate/app/`) will call this calculator for a selected deal so Sid can see rental yield + sale return after India-dispatched agent costs and company formation fees.

## How the property tool will call it (future)

```js
import { compute, fromDeal } from "../calculator/calc-core.js";

// deal = one object from app/deals.json → deals[]
const inputs = fromDeal(deal);
// Sid (or a form) then fills fee fields / sellingPrice / holdingYears
inputs.sellingPrice = /* exit price */;
inputs.annualPropertyTax = /* real figure */;
// …
const result = compute(inputs);
```

`fromDeal` only maps `price` → `buyingPrice` and `rent` → `monthlyRent` (plus a label). All fee fields stay **0** until Sid supplies them. It does not invent fees from the deal's estimate `costs` block.

## Inputs schema (`compute(inputs)`)

| Field | Type | Default | Meaning |
|---|---|---|---|
| `buyingPrice` | number USD | 0 | Purchase price |
| `sellingPrice` | number USD | 0 | Exit / sale price |
| `monthlyRent` | number USD/mo | — | Monthly rent. Wins if both rent and yield given |
| `rentalYieldPct` | number %/yr | — | Gross yield vs buy price; used when monthlyRent absent |
| `annualMaintenance` | number USD/yr | 0 | Maintenance |
| `annualPropertyTax` | number USD/yr | 0 | Property tax |
| `annualCouncilFees` | number USD/yr | 0 | Council / local fees |
| `agentMonthlyRetainer` | number USD/mo | 0 | India-dispatched agent retainer |
| `agentPctOfRent` | number % | 0 | Agent share of gross rent |
| `agentTravelOneOff` | number USD | 0 | One-off travel / dispatch |
| `companyFormationOneOff` | number USD | 0 | One-off company setup |
| `companyAnnualUpkeep` | number USD/yr | 0 | Annual company upkeep |
| `holdingYears` | number years | 1 | Hold period |
| `label` | string | null | Optional address / case-study id |

Deal fields recognised by `fromDeal`: `price`, `rent`, `address`, `city`, `state`, `zip`, `id`, plus passthrough hints under `_source` (`beds`, `property_type`, `rent_src`, `zillow_url`).

## Outputs schema (`compute` return)

| Field | Meaning |
|---|---|
| `grossRentalYieldPct` | Annual gross rent ÷ buy price × 100 |
| `netRentalYieldPct` | Annual net rent ÷ buy price × 100 |
| `annualNetRentalIncome` | Gross rent − yearly operating costs |
| `totalNetRentalIncome` | Annual net × holding years |
| `capitalGain` | Sale − buy |
| `oneOffCosts` | Agent travel + company formation |
| `cashInvested` | Buy + one-off costs |
| `totalReturn` | Total net rent + capital gain − one-offs |
| `roiPct` | Total return ÷ cash invested × 100 |
| `annualisedReturnPct` | CAGR-style on end wealth (sale + total net rent) vs cash invested; null if not computable |
| `cashOnCashPct` | Annual net ÷ cash invested × 100 |
| `breakEvenYears` | Cash invested ÷ annual net (rent-only recovery); null if annual net ≤ 0 |
| `breakEvenSalePrice` | Sale price that makes total return = 0 for this hold |
| `breakdown` | Cost line items |
| `explanations` | Layman blurbs for each metric |
| `inputsResolved` | Normalised inputs actually used |

## Case-study presets

JSON files under `presets/` match the inputs schema. Load with `compute(JSON.parse(…))`.  
`presets/case-study-template.json` is **empty placeholders** waiting for Sid's real bought-and-sold house metrics (last two years). Do not treat its zeros as real data.

## What this prototype does NOT do

- No mortgage / interest / leverage modelling
- No vacancy or insurance auto-estimates (those stay for Sid to type in, or for a later averaging layer)
- No write-back into `deals.json`
- No public deploy / tunnel


## Honest-cash additions (prototype)

| Field | Meaning |
|---|---|
| `purchaseClosingCosts` | Net cash at purchase beyond price (can be negative) |
| `saleCosts` | Sale price − net proceeds |
| `actualRentCollected` | Optional gross rent actually banked; overrides rate × years |
| `otherOneOffCosts` | Mid-hold one-offs (e.g. repair estimate) |
| `netSaleProceeds` (output) | `sellingPrice − saleCosts` |
| `cashInvested` (output) | `buyingPrice + purchaseClosingCosts + buy-side one-offs` |
| `totalReturn` (output) | `totalNetRentalIncome + netSaleProceeds − cashInvested` |
