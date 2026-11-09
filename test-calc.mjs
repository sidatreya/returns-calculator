/**
 * Sidatreya Designs — calculator maths check
 * Uses obviously dummy EXAMPLE DATA only. Not real fees or a real property.
 */
import { compute, fromDeal, resolveRent } from "./calc-core.js";
import assert from "node:assert/strict";

const EXAMPLE = {
  label: "EXAMPLE DATA — dummy numbers only",
  buyingPrice: 100000,
  sellingPrice: 120000,
  monthlyRent: 1000,
  annualMaintenance: 1000,
  annualPropertyTax: 1200,
  annualCouncilFees: 300,
  agentMonthlyRetainer: 100,
  agentPctOfRent: 5,
  agentTravelOneOff: 2000,
  companyFormationOneOff: 1500,
  companyAnnualUpkeep: 500,
  purchaseClosingCosts: 0,
  saleCosts: 0,
  holdingYears: 2,
};

const r = compute(EXAMPLE);
assert.equal(r.annualGrossRent, 12000);
assert.equal(r.grossRentalYieldPct, 12);
assert.equal(r.breakdown.agentAnnual, 1800);
assert.equal(r.annualOperatingCosts, 4800);
assert.equal(r.annualNetRentalIncome, 7200);
assert.equal(r.netRentalYieldPct, 7.2);
assert.equal(r.totalNetRentalIncome, 14400);
assert.equal(r.capitalGain, 20000);
assert.equal(r.oneOffCosts, 3500);
assert.equal(r.cashInvested, 103500);
assert.equal(r.totalReturn, 30900);
assert.ok(Math.abs(r.roiPct - (30900 / 103500) * 100) < 1e-3);
assert.ok(Math.abs(r.cashOnCashPct - (7200 / 103500) * 100) < 1e-3);
assert.ok(Math.abs(r.breakEvenYears - 103500 / 7200) < 1e-3);
assert.equal(r.breakEvenSalePrice, 89100);
const expectedCagr = (Math.pow(134400 / 103500, 0.5) - 1) * 100;
assert.ok(Math.abs(r.annualisedReturnPct - expectedCagr) < 1e-3);

// Purchase closing + sale costs
const r2 = compute({
  ...EXAMPLE,
  purchaseClosingCosts: 2000,
  saleCosts: 5000,
  agentTravelOneOff: 0,
  companyFormationOneOff: 0,
});
assert.equal(r2.cashInvested, 102000); // 100k + 2k
assert.equal(r2.netSaleProceeds, 115000);
assert.equal(r2.capitalGain, 15000); // 115k - 100k
// totalNetRent still 14400; totalReturn = 14400 + 115000 - 102000 = 27400
assert.equal(r2.totalReturn, 27400);

// Actual rent collected overrides rate×years
const r3 = compute({
  buyingPrice: 100000,
  sellingPrice: 100000,
  monthlyRent: 1000,
  annualPropertyTax: 0,
  holdingYears: 2,
  actualRentCollected: 5000, // less than 24000 rate-based
  purchaseClosingCosts: 0,
  saleCosts: 0,
});
assert.equal(r3.breakdown.usedActualRent, true);
assert.equal(r3.breakdown.grossRentTotal, 5000);
assert.equal(r3.totalNetRentalIncome, 5000);
assert.equal(r3.totalReturn, 5000); // rent only, flat sale

const viaYield = resolveRent(100000, undefined, 12);
assert.equal(viaYield.monthlyRent, 1000);

const mapped = fromDeal({
  id: "EXAMPLE-deal",
  address: "1 Example St, Sampletown, AL 35000",
  price: 85000,
  rent: 1100,
});
assert.equal(mapped.buyingPrice, 85000);
assert.equal(mapped.purchaseClosingCosts, 0);
assert.equal(mapped.saleCosts, 0);

console.log("OK — all checks passed (EXAMPLE DATA only)");
