import {
  calcKStar,
  shrinkToLot,
  calculateMaintenanceMargin,
  calculateLiquidationPriceCollateralQuote,
  calculateLiquidationPriceCollateralQuanto,
  calculateLiquidationPriceCollateralBase,
} from './perpMath';

/*---
// Suffix CC/BC/QC:
// CC: collateral currency, BC: base currency, QC: quote currency
// Examples:
// for BTCUSD collateralized in BTC: CC=BTC, BC=BTC, QC=USD
// for ETHUSD collateralized in BTC: CC=BTC, BC=ETH, QC=USD
// for TeslaUSD collateralized in BTC: CC=BTC, BC=Tesla, QC=USD
----*/

export type PerpParameters = {
  //get perpetual
  //base parameters
  fInitialMarginRateAlpha: number;
  fMarginRateBeta: number;
  fInitialMarginRateCap: number;
  fMaintenanceMarginRateAlpha: number;
  fTreasuryFeeRate: number;
  fPnLPartRate: number;
  fReferralRebateRate: number;
  fLiquidationPenaltyRate: number;
  fMinimalSpread: number;
  fIncentiveSpread: number;
  fLotSizeBC: number;
  fFundingRateClamp: number;
  fMarkPriceEMALambda: number;
  fSigma2: number;
  fSigma3: number;
  fRho23: number;
  // default fund / AMM fund
  fStressReturnS2_0: number;
  fStressReturnS2_1: number;
  fStressReturnS3_0: number;
  fStressReturnS3_1: number;
  fDFCoverN: number;
  fDFLambda_0: number;
  fDFLambda_1: number;
  fAMMTargetDD: number;
  fAMMMinSizeCC: number;
  fMinimalTraderExposureEMA: number;
  fMaximalTradeSizeBumpUp: number;
  // funding state
  fCurrentFundingRate: number;
  fUnitAccumulatedFunding: number;
};

export type AMMState = {
  // values from AMM margin account:
  // L1 = -fLockedInValueQC
  // K2 = -fPositionBC
  L1: number;
  K2: number;
  // {M1, M2, M3} = -fLockedInValueQC
  M1: number;
  M2: number;
  M3: number;
  // PerpetualData.fCurrentTraderExposureEMA
  fCurrentTraderExposureEMA: number;
  // Oracle data:
  indexS2PriceData: number;
  indexS3PriceData: number;
  currentPremiumEMA: number;
  currentPremium: number;
};

export type TraderState = {
  marginBalanceCC: number; // current margin balance
  availableMarginCC: number; // amount above initial margin (can be negative if below)
  availableCashCC: number; // cash minus unpaid funding
  marginAccountCashCC: number; // from margin account
  marginAccountPositionBC: number; // from margin account
  marginAccountLockedInValueQC: number; // from margin account
  fUnitAccumulatedFundingStart: number; // from margin account
};

/**
 * Get the maximal trade size for a trader with position currentPos (can be 0) for a given
 * perpetual, assuming enough margin is available (i.e. not considering leverage).
 * @param {number} currentPos - The current position of the trade (base currency), negative if short
 * @param {number} direction - {-1, 1} Does the trader want to buy (1), or sell (-1)
 * @param {AMMState} ammData - Contains current price/state data
 * @param {PerpParameters} perpParams - Contains parameter of the perpetual
 * @param {boolean} isQuanto - True if collateral currency of instrument is different from base and quote
 *                             currency (e.g., SP500 quoted in USD and collateralized in BTC,
 *                             false for BTCUSD backed in BTC)
 * @returns {number} signed position size that the trader can enter
 */
export function getMaximalTradeSizeInPerpetual(
  currentPos: number,
  direction: number,
  ammData: AMMState,
  perpParams: PerpParameters,
): number {
  let kStar = 0;
  let lotSize = perpParams.fLotSizeBC;
  let isQuanto: boolean = ammData.M3 !== 0;
  if (!isQuanto) {
    kStar = calcKStar(
      ammData.K2,
      ammData.L1,
      ammData.indexS2PriceData,
      ammData.M1,
      ammData.M2,
      ammData.M3,
    );
    kStar = shrinkToLot(kStar, lotSize);
  }
  let maxAbsTradeSize =
    ammData.fCurrentTraderExposureEMA * perpParams.fMaximalTradeSizeBumpUp;
  maxAbsTradeSize = shrinkToLot(maxAbsTradeSize, lotSize);
  let maxSignedTradeSize: number;
  if (direction < 0) {
    maxSignedTradeSize = Math.min(
      kStar,
      Math.min(-maxAbsTradeSize - currentPos, 0),
    );
  } else {
    maxSignedTradeSize = Math.max(
      kStar,
      Math.max(maxAbsTradeSize - currentPos, 0),
    );
  }
  // round
  maxSignedTradeSize = shrinkToLot(maxSignedTradeSize, lotSize);
  return maxSignedTradeSize;
}

/**
 * Extract the mark-price from AMMState-data
 * @param {AMMState} ammData - Should contain current state of perpetual
 * @returns {number} mark price
 */

export function getMarkPrice(ammData: AMMState): number {
  return ammData.indexS2PriceData + ammData.currentPremiumEMA;
}

/**
 * Extract the index-price from AMMState-data
 * @param {AMMState} ammData - Should contain current state of perpetual
 * @returns {number} index price
 */

export function getIndexPrice(ammData: AMMState): number {
  return ammData.indexS2PriceData;
}

/**
 * Extract the quanto-price from AMMState-data.
 * E.g., if ETHUSD backed in BTC, the BTCUSD price is the quanto-price
 * @param {AMMState} ammData - Should contain current state of perpetual
 * @returns {number} quanto price (non-zero if 3rd currency involved)
 */

export function getQuantoPrice(ammData: AMMState): number {
  return ammData.indexS3PriceData;
}

/**
 * Get the trading fee rate, so that fee = abs(position)*rate
 * @param {PerpParameters} perpParams - Contains parameter of the perpetual
 * @returns {number} fee relative to position size
 */

export function getTradingFeeRate(perpParams: PerpParameters): number {
  return perpParams.fTreasuryFeeRate + perpParams.fPnLPartRate;
}

/**
 * Get trading fee in collateral currency
 * @param {PerpParameters} perpParams - Contains parameter of the perpetual
 * @returns {number} fee relative to position size
 */

export function getTradingFee(
  position: number,
  perpParams: PerpParameters,
): number {
  return position * getTradingFeeRate(perpParams);
}

/**
 * Get initial margin rate
 * @param {number} position - The position for which we calculate the initial margin rate
 * @param {PerpParameters} perpParams - Contains parameter of the perpetual
 * @returns {number} maintenance margin rate
 */

export function getInitialMarginRate(
  position: number,
  perpParams: PerpParameters,
): number {
  let cap = perpParams.fInitialMarginRateCap;
  return Math.min(
    perpParams.fInitialMarginRateAlpha +
      perpParams.fMarginRateBeta * Math.abs(position),
    cap,
  );
}

/**
 * Get maintenance margin rate
 * The margin requirement depends on the position size.
 * @param {number} position - The position for which we calculate the maintenance margin rate
 * @param {PerpParameters} perpParams - Contains parameter of the perpetual
 * @returns {number} maintenance margin rate
 */
export function getMaintenanceMarginRate(
  position: number,
  perpParams: PerpParameters,
): number {
  return calculateMaintenanceMargin(
    perpParams.fInitialMarginRateAlpha,
    perpParams.fMaintenanceMarginRateAlpha,
    perpParams.fInitialMarginRateCap,
    perpParams.fMarginRateBeta,
    position,
  );
}

/**
 * Get the maximal leverage that is allowed by the initial margin requirement.
 * The margin requirement depends on the position size.
 * @param {number} position - The position for which we calculate the maximal initial leverage
 * @param {PerpParameters} perpParams - Contains parameter of the perpetual
 * @returns {number} maximal leverage
 */

export function getMaxInitialLeverage(
  position: number,
  perpParams: PerpParameters,
): number {
  let mRate = getInitialMarginRate(position, perpParams);
  // leverage = 1 / marginrate
  return 1 / mRate;
}

/**
 * Get minimal short or maximal long position for trader. Direction=-1 for short, 1 for long
 * This function calculates the largest position considering
 * - leverage constraints
 * - position size constraint by AMM
 * - available funds in wallet balance and margin account
 * @param {number} direction - {-1, 1} Does the trader want to buy (1), or sell (-1)
 * @param {number} availableWalletBalance - trader's available wallet balance
 * @param {PerpParameters} perpParams - Contains parameter of the perpetual
 * @returns {number} maintenance margin rate
 */

export function getSignedMaxAbsPositionForTrader(
  direction: number,
  availableWalletBalance: number,
  perpParams: PerpParameters,
  traderState: TraderState,
  ammData: AMMState,
): number {
  // max position = min(current position + maximal trade size, max position allowed by leverage constraint)
  let currentPos = traderState.marginAccountPositionBC;
  let maxSignedPos =
    currentPos +
    getMaximalTradeSizeInPerpetual(currentPos, direction, ammData, perpParams);
  let availableCollateral =
    traderState.availableMarginCC + availableWalletBalance;
  if (availableCollateral < 0) {
    return 0;
  }
  let alpha = perpParams.fInitialMarginRateAlpha;
  let beta = perpParams.fMarginRateBeta;
  // solution to quadratic equation
  let posMargin =
    (-alpha + Math.sqrt(alpha ** 2 + 4 * beta * availableCollateral)) /
    (2 * beta);
  if (direction < 0) {
    return Math.max(-posMargin, maxSignedPos);
  } else {
    return Math.max(posMargin, maxSignedPos);
  }
}

/**
 * Calculate the worst price, the trader is willing to accept compared to the mid-price
 * @param {number} currentMidPrice - The current price from which we calculate the slippage
 * @param {number} slippagePercent - The slippage that the trader is willing to accept. The number is in Percentage points.
 * @param {number} direction - {-1, 1} Does the trader want to buy (1), or sell (-1)
 * @returns {number} worst acceptable price
 */
export function calculateSlippagePrice(
  currentMidPrice: number,
  slippagePercent: number,
  direction: number,
) {
  slippagePercent = slippagePercent / 100;
  return currentMidPrice * (1 + Math.sign(direction) * slippagePercent);
}

/**
 * Conversion rate quote to collateral
 * @param {AMMState} ammData - Contains current price/state data
 * @returns {number} conversion rate
 */
export function getQuote2CollateralFX(ammData: AMMState): number {
  if (ammData.M1 !== 0) {
    // quote
    return 1;
  } else if (ammData.M2 !== 0) {
    // base
    return 1 / ammData.indexS2PriceData;
  } else {
    // quanto
    return 1 / ammData.indexS3PriceData;
  }
}

/**
 * Conversion rate base to collateral
 * @param {AMMState} ammData - Contains current price/state data
 * @param {boolean} atMarkPrice - conversion at spot or mark price
 * @returns {number} conversion rate
 */
export function getBase2CollateralFX(
  ammData: AMMState,
  atMarkPrice: boolean,
): number {
  let s2 = atMarkPrice
    ? ammData.currentPremiumEMA + ammData.indexS2PriceData
    : ammData.indexS2PriceData;
  if (ammData.M1 !== 0) {
    // quote
    return s2;
  } else if (ammData.M2 !== 0) {
    // base
    return s2 / ammData.indexS2PriceData;
  } else {
    // quanto
    return s2 / ammData.indexS3PriceData;
  }
}

/**
 * Conversion rate base to quote
 * @param {AMMState} ammData - Contains current price/state data
 * @param {boolean} atMarkPrice - conversion at spot or mark price
 * @returns {number} conversion rate
 */
export function getBase2QuoteFX(
  ammData: AMMState,
  atMarkPrice: boolean,
): number {
  let s2 = atMarkPrice
    ? ammData.currentPremiumEMA + ammData.indexS2PriceData
    : ammData.indexS2PriceData;
  return s2;
}

/**
 * Calculate the price at which the perpetual will be liquidated
 * @param {number} currentPos - The current position of the trade (base currency), negative if short
 * @param {number} traderCash - Cash of the trader
 * @param {AMMState} ammData - AMM state
 * @param {PerpParameters} perpParams - Contains parameter of the perpetual
 * @returns {number} approximate liquidation price
 */
export function calculateApproxLiquidationPrice(
  position: number,
  traderCash: number,
  ammData: AMMState,
  perpParams: PerpParameters,
): number {
  let maintMarginRate = getMaintenanceMarginRate(position, perpParams);
  if (ammData.M1 !== 0) {
    // quote currency perpetual
    return calculateLiquidationPriceCollateralQuote(
      ammData.L1,
      position,
      traderCash,
      maintMarginRate,
    );
  } else if (ammData.M2 !== 0) {
    // base currency perpetual
    return calculateLiquidationPriceCollateralBase(
      ammData.L1,
      position,
      traderCash,
      maintMarginRate,
    );
  } else if (ammData.M3 !== 0) {
    // quanto currency perpetual
    // we calculate a price that in 90% of the cases leads to a liquidation according to the
    // instrument parameters sigma2/3, rho and current prices
    return calculateLiquidationPriceCollateralQuanto(
      ammData.L1,
      position,
      traderCash,
      maintMarginRate,
      perpParams.fRho23,
      perpParams.fSigma2,
      perpParams.fSigma3,
      ammData.indexS2PriceData,
      ammData.indexS3PriceData,
    );
  }
  return -1;
}

/**
 * Get the amount of collateral required to obtain a given leverage with a given position size.
 * Considers the trading fees.
 * @param {number} leverage - The leverage that the trader wants to achieve, given the position size
 * @param {number} currentPos - The trader's current signed position (can be 0) in base currency
 * @param {number} targetPos  - The trader's (signed) target position in base currency
 * @param {PerpParameters} perpParams - Contains parameter of the perpetual
 * @returns {number} balance required to arrive at the perpetual contract to obtain requested leverage
 */
export function getRequiredMarginCollateral(
  leverage: number,
  currentPos: number,
  targetPos: number,
  perpParams: PerpParameters,
): number {
  let positionToTrade = targetPos - currentPos;
  let fees = Math.abs(positionToTrade) * getTradingFeeRate(perpParams);
  // leverage = position/margincollateral
  // Protocol fees are subtracted from the margincollateral
  // Hence: leverage = position/(margincollateral - fees)
  //   -> margincollateral =  position/leverage + fees
  return targetPos / leverage + fees;
}

/**
 * Get the unrealized Profit/Loss of a trader using mark price as benchmark. Reported in Quote currency.
 * @param {AMMState} ammData - AMM state (for mark price and CCY conversion)
 * @param {TraderState} traderState - Trader state (for account balances)
 * @returns {number} PnL = value of position at mark price minus locked in value
 */
export function getTraderPnL(
  traderState: TraderState,
  ammData: AMMState,
): number {
  return (
    traderState.marginAccountPositionBC * getMarkPrice(ammData) -
    traderState.marginAccountLockedInValueQC
  );
}

/**
 * Get the unrealized Profit/Loss of a trader using mark price as benchmark. Reported in Quote currency.
 * @param {AMMState} ammData - AMM state (for mark price and CCY conversion)
 * @param {TraderState} traderState - Trader state (for account balances)
 * @returns {number} current leverage for the trader
 */
export function getTraderLeverage(
  traderState: TraderState,
  ammData: AMMState,
): number {
  return (
    (traderState.marginAccountPositionBC *
      getBase2CollateralFX(ammData, true)) /
    traderState.availableCashCC
  );
}

/**
 * Get the unrealized Profit/Loss of a trader using mark price as benchmark. Reported in collateral currency
 * @param {AMMState} ammData - AMM state (for mark price and CCY conversion)
 * @param {TraderState} traderState - Trader state (for account balances)
 * @returns {number} PnL = value of position at mark price minus locked in value
 */
export function getTraderPnLInCC(
  traderState: TraderState,
  ammData: AMMState,
): number {
  return getQuote2CollateralFX(ammData) * getTraderPnL(traderState, ammData);
}

export function getFundingFee(
  traderState: TraderState,
  perpData: PerpParameters,
  ammData: AMMState,
): number {
  let fCurrentRate =
    perpData.fUnitAccumulatedFunding - traderState.fUnitAccumulatedFundingStart;
  // TODO: this is not correct!
  return fCurrentRate * traderState.marginAccountPositionBC;
}