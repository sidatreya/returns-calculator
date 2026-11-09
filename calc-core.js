/**
 * Sidatreya Designs — Returns & Yields Calculator (prototype core)
 * Pure calculation module. No DOM. Works in browser (ES module) and Node.
 *
 * Plugin contract: see PLUGIN.md
 */

/**
 * @typedef {Object} CalcInputs
 * @property {number} buyingPrice
 * @property {number} sellingPrice
 * @property {number} [monthlyRent]
 * @property {number} [rentalYieldPct]
 * @property {number} [annualMaintenance]
 * @property {number} [annualPropertyTax]
 * @property {number} [annualCouncilFees]
 * @property {number} [agentMonthlyRetainer]
 * @property {number} [agentPctOfRent]
 * @property {number} [agentTravelOneOff]
 * @property {number} [companyFormationOneOff]
 * @property {number} [companyAnnualUpkeep]
 * @property {number} [purchaseClosingCosts]  Net cash at purchase beyond price (can be negative if credits > fees). cashInvested = buy + this + buy-side one-offs.
 * @property {number} [saleCosts]             Costs that bridge sale price → net proceeds (commissions, seller debits, etc.)
 * @property {number|null} [actualRentCollected]  Optional total gross rent actually received over the hold; when set (>0 or 0), overrides rate×years for total gross rent
 * @property {number} [otherOneOffCosts]      Mid-hold one-offs (e.g. repair estimate) subtracted from return; not in initial cash invested unless you fold them in
 * @property {number} [holdingYears]
 * @property {string} [label]
 */

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function round4(n) {
  return Math.round((n + Number.EPSILON) * 10000) / 10000;
}

export function resolveRent(buyingPrice, monthlyRent, rentalYieldPct) {
  const buy = num(buyingPrice);
  let monthly = num(monthlyRent, NaN);
  let yieldPct = num(rentalYieldPct, NaN);

  if (Number.isFinite(monthly) && monthly > 0) {
    const annual = monthly * 12;
    yieldPct = buy > 0 ? (annual / buy) * 100 : 0;
    return { monthlyRent: monthly, annualGrossRent: annual, grossRentalYieldPct: yieldPct };
  }
  if (Number.isFinite(yieldPct) && yieldPct > 0 && buy > 0) {
    const annual = buy * (yieldPct / 100);
    monthly = annual / 12;
    return { monthlyRent: monthly, annualGrossRent: annual, grossRentalYieldPct: yieldPct };
  }
  return { monthlyRent: 0, annualGrossRent: 0, grossRentalYieldPct: 0 };
}

/**
 * @param {CalcInputs} raw
 */
export function compute(raw = {}) {
  const buyingPrice = num(raw.buyingPrice);
  const sellingPrice = num(raw.sellingPrice);
  const holdingYears = Math.max(0, num(raw.holdingYears, 1));

  const annualMaintenance = num(raw.annualMaintenance);
  const annualPropertyTax = num(raw.annualPropertyTax);
  const annualCouncilFees = num(raw.annualCouncilFees);
  const agentMonthlyRetainer = num(raw.agentMonthlyRetainer);
  const agentPctOfRent = num(raw.agentPctOfRent);
  const agentTravelOneOff = num(raw.agentTravelOneOff);
  const companyFormationOneOff = num(raw.companyFormationOneOff);
  const companyAnnualUpkeep = num(raw.companyAnnualUpkeep);
  const purchaseClosingCosts = num(raw.purchaseClosingCosts);
  const saleCosts = num(raw.saleCosts);
  const otherOneOffCosts = num(raw.otherOneOffCosts);

  const rent = resolveRent(buyingPrice, raw.monthlyRent, raw.rentalYieldPct);
  const { monthlyRent, annualGrossRent, grossRentalYieldPct } = rent;

  const agentFromRent = annualGrossRent * (agentPctOfRent / 100);
  const agentAnnual = agentMonthlyRetainer * 12 + agentFromRent;

  const annualOperatingCosts =
    annualMaintenance +
    annualPropertyTax +
    annualCouncilFees +
    agentAnnual +
    companyAnnualUpkeep;

  const annualNetRentalIncome = annualGrossRent - annualOperatingCosts;

  // Optional actual rent collected (gross) overrides rate × years for totals
  const hasActualRent =
    raw.actualRentCollected !== undefined &&
    raw.actualRentCollected !== null &&
    raw.actualRentCollected !== "" &&
    Number.isFinite(Number(raw.actualRentCollected));
  const actualRentCollected = hasActualRent ? num(raw.actualRentCollected) : null;

  const rateBasedGrossRentTotal = annualGrossRent * holdingYears;
  const grossRentTotal = hasActualRent
    ? actualRentCollected
    : rateBasedGrossRentTotal;

  const operatingCostsTotal = annualOperatingCosts * holdingYears;
  const totalNetRentalIncome = grossRentTotal - operatingCostsTotal - otherOneOffCosts;

  // Yields: when actual rent is set, net yield uses annualised actual rent
  const annualisedGrossFromActual =
    hasActualRent && holdingYears > 0 ? actualRentCollected / holdingYears : annualGrossRent;
  const annualisedNetFromActual = annualisedGrossFromActual - annualOperatingCosts;
  const yieldBasisCash = buyingPrice + purchaseClosingCosts; // price + net purchase closing
  const netYieldBasis = yieldBasisCash > 0 ? yieldBasisCash : buyingPrice;
  const netRentalYieldPct =
    netYieldBasis > 0
      ? ((hasActualRent ? annualisedNetFromActual : annualNetRentalIncome) / netYieldBasis) * 100
      : 0;
  const grossYieldBasis = buyingPrice > 0 ? buyingPrice : netYieldBasis;
  const grossRentalYieldPctResolved =
    grossYieldBasis > 0
      ? ((hasActualRent ? annualisedGrossFromActual : annualGrossRent) / grossYieldBasis) * 100
      : grossRentalYieldPct;

  const buySideOneOffs = agentTravelOneOff + companyFormationOneOff;
  const cashInvested = buyingPrice + purchaseClosingCosts + buySideOneOffs;
  const netSaleProceeds = sellingPrice - saleCosts;
  const capitalGain = netSaleProceeds - buyingPrice; // price path net of sale costs
  const oneOffCosts = buySideOneOffs + otherOneOffCosts;

  // Honest total return: net rent + net sale proceeds − cash put in at purchase
  const totalReturn = totalNetRentalIncome + netSaleProceeds - cashInvested;
  const roiPct = cashInvested > 0 ? (totalReturn / cashInvested) * 100 : 0;

  const endWealth = netSaleProceeds + Math.max(0, totalNetRentalIncome);
  // If totalNetRentalIncome negative, end wealth still adds it (cash drained)
  const endWealthHonest = netSaleProceeds + totalNetRentalIncome;
  let annualisedReturnPct = null;
  if (holdingYears > 0 && cashInvested > 0 && endWealthHonest > 0) {
    annualisedReturnPct =
      (Math.pow(endWealthHonest / cashInvested, 1 / holdingYears) - 1) * 100;
  }

  const cashOnCashPct =
    cashInvested > 0
      ? ((hasActualRent ? annualisedNetFromActual : annualNetRentalIncome) / cashInvested) * 100
      : null;

  let breakEvenYears = null;
  const annualNetForBreakeven = hasActualRent
    ? annualisedNetFromActual
    : annualNetRentalIncome;
  if (annualNetForBreakeven > 0) {
    breakEvenYears = cashInvested / annualNetForBreakeven;
  }

  // Sale price that zeros total return for this hold (given current rent path & costs)
  // totalReturn = totalNetRent + (sell - saleCosts) - cashInvested = 0
  // sell = cashInvested - totalNetRent + saleCosts
  const breakEvenSalePrice = cashInvested - totalNetRentalIncome + saleCosts;

  const inputsResolved = {
    label: raw.label || null,
    buyingPrice,
    sellingPrice,
    monthlyRent: round2(monthlyRent),
    rentalYieldPct: round4(grossRentalYieldPct),
    annualMaintenance,
    annualPropertyTax,
    annualCouncilFees,
    agentMonthlyRetainer,
    agentPctOfRent,
    agentTravelOneOff,
    companyFormationOneOff,
    companyAnnualUpkeep,
    purchaseClosingCosts: round2(purchaseClosingCosts),
    saleCosts: round2(saleCosts),
    actualRentCollected: hasActualRent ? round2(actualRentCollected) : null,
    otherOneOffCosts: round2(otherOneOffCosts),
    holdingYears,
  };

  const breakdown = {
    annualGrossRent: round2(annualGrossRent),
    grossRentTotal: round2(grossRentTotal),
    rateBasedGrossRentTotal: round2(rateBasedGrossRentTotal),
    usedActualRent: hasActualRent,
    agentAnnual: round2(agentAnnual),
    agentFromRent: round2(agentFromRent),
    agentRetainerAnnual: round2(agentMonthlyRetainer * 12),
    annualMaintenance: round2(annualMaintenance),
    annualPropertyTax: round2(annualPropertyTax),
    annualCouncilFees: round2(annualCouncilFees),
    companyAnnualUpkeep: round2(companyAnnualUpkeep),
    annualOperatingCosts: round2(annualOperatingCosts),
    operatingCostsTotal: round2(operatingCostsTotal),
    otherOneOffCosts: round2(otherOneOffCosts),
    purchaseClosingCosts: round2(purchaseClosingCosts),
    saleCosts: round2(saleCosts),
    netSaleProceeds: round2(netSaleProceeds),
    buySideOneOffs: round2(buySideOneOffs),
    oneOffCosts: round2(oneOffCosts),
  };

  const explanations = {
    grossRentalYieldPct:
      "Gross rental yield is yearly rent (or annualised actual rent collected) divided by the buy price, before costs.",
    netRentalYieldPct:
      "Net rental yield is yearly rent left after yearly costs, divided by cash tied to the purchase (buy price plus net purchase closing costs). This is the more realistic yield.",
    annualNetRentalIncome:
      "Annual net rental income is the rate-based yearly leftover after tax, maintenance, council, agent and company upkeep (before any actual-rent override).",
    totalNetRentalIncome:
      "Total net rental income is gross rent over the hold (actual collected if you entered it, otherwise rate × years) minus operating costs over the hold and any other one-off repairs.",
    capitalGain:
      "Capital gain here is net sale proceeds minus buy price. Net sale proceeds are sale price minus sale costs (commissions and seller closing debits).",
    totalReturn:
      "Total return (net profit) is total net rent plus net sale proceeds, minus what you actually put in at purchase (buy price + purchase closing costs + buy-side one-offs).",
    roiPct:
      "ROI percent is that net profit divided by cash invested at purchase.",
    annualisedReturnPct:
      "Annualised return (CAGR-style) spreads the whole journey — ending cash from net sale proceeds plus net rent, versus cash invested — over the holding years.",
    cashOnCashPct:
      "Cash-on-cash is yearly net rent (annualised from actual collections when set) divided by cash invested.",
    breakEvenYears:
      "Break-even years from rent alone is how long net yearly rent would take to recover cash invested, ignoring the sale.",
    breakEvenSalePrice:
      "Break-even sale price is the gross sale price that would make total return exactly zero for this hold, given your sale costs and rent path.",
    purchaseClosingCosts:
      "Purchase closing costs are the net extra cash at purchase beyond the price (fees minus credits). Negative means credits (for example transferred deposits or prepaid rent) outweighed fees, so you paid less than the price in total cash.",
    saleCosts:
      "Sale costs bridge the sale price down to net proceeds (agent commissions, transfer tax, title fees, and other seller debits). Passthroughs such as security-deposit transfer or prorated rent to the buyer sit inside this bridge when you use bank-confirmed net proceeds.",
    actualRentCollected:
      "Actual rent collected is the sum of rent that really hit the bank over the hold. When set, it replaces rent-rate × years for the totals.",
  };

  return {
    inputsResolved,
    annualGrossRent: round2(annualGrossRent),
    monthlyRent: round2(monthlyRent),
    grossRentalYieldPct: round4(grossRentalYieldPctResolved),
    annualOperatingCosts: round2(annualOperatingCosts),
    annualNetRentalIncome: round2(annualNetRentalIncome),
    netRentalYieldPct: round4(netRentalYieldPct),
    totalNetRentalIncome: round2(totalNetRentalIncome),
    capitalGain: round2(capitalGain),
    purchaseClosingCosts: round2(purchaseClosingCosts),
    saleCosts: round2(saleCosts),
    netSaleProceeds: round2(netSaleProceeds),
    actualRentCollected: hasActualRent ? round2(actualRentCollected) : null,
    otherOneOffCosts: round2(otherOneOffCosts),
    oneOffCosts: round2(oneOffCosts),
    cashInvested: round2(cashInvested),
    totalReturn: round2(totalReturn),
    roiPct: round4(roiPct),
    annualisedReturnPct:
      annualisedReturnPct === null ? null : round4(annualisedReturnPct),
    cashOnCashPct: cashOnCashPct === null ? null : round4(cashOnCashPct),
    breakEvenYears: breakEvenYears === null ? null : round4(breakEvenYears),
    breakEvenSalePrice: round2(breakEvenSalePrice),
    breakdown,
    explanations,
  };
}

export function fromDeal(deal = {}) {
  const price = num(deal.price);
  const rent = num(deal.rent);
  const label =
    deal.address ||
    [deal.city, deal.state, deal.zip].filter(Boolean).join(", ") ||
    deal.id ||
    null;

  return {
    label,
    buyingPrice: price,
    sellingPrice: price,
    monthlyRent: rent,
    rentalYieldPct: undefined,
    annualMaintenance: 0,
    annualPropertyTax: 0,
    annualCouncilFees: 0,
    agentMonthlyRetainer: 0,
    agentPctOfRent: 0,
    agentTravelOneOff: 0,
    companyFormationOneOff: 0,
    companyAnnualUpkeep: 0,
    purchaseClosingCosts: 0,
    saleCosts: 0,
    actualRentCollected: null,
    otherOneOffCosts: 0,
    holdingYears: 2,
    _source: {
      id: deal.id || null,
      zip: deal.zip || null,
      state: deal.state || null,
      city: deal.city || null,
      beds: deal.beds ?? null,
      property_type: deal.property_type || null,
      rent_src: deal.rent_src || null,
      zillow_url: deal.zillow_url || null,
    },
  };
}

export default { compute, fromDeal, resolveRent };
