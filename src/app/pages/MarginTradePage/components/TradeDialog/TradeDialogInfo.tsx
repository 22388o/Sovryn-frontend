import React from 'react';
import classNames from 'classnames';
import { Asset } from 'types';
import { toNumberFormat, weiToNumberFormat } from 'utils/display-text/format';
import { TradingPosition } from 'types/trading-position';
import { PricePrediction } from 'app/containers/MarginTradeForm/PricePrediction';
import { AssetRenderer } from 'app/components/AssetRenderer';
import { TradingTypes } from 'app/pages/SpotTradingPage/types';
import { OrderType } from 'app/components/OrderTypeTitle/types';

interface ITradeDialogInfoProps {
  position: TradingPosition;
  leverage: number;
  orderTypeValue: OrderType;
  amount: string;
  collateral: Asset;
  loanToken: Asset;
  collateralToken: Asset;
  useLoanTokens: boolean;
}

export const TradeDialogInfo: React.FC<ITradeDialogInfoProps> = ({
  position,
  leverage,
  orderTypeValue,
  amount,
  collateral,
  loanToken,
  collateralToken,
  useLoanTokens,
}) => (
  <div className="tw-pt-3 tw-pb-2 tw-px-6 tw-bg-gray-2 tw-mb-4 tw-rounded-lg tw-text-sm tw-font-light">
    <div
      className={classNames(
        'tw-text-center tw-font-medium tw-lowercase tw-text-xl',
        {
          'tw-text-trade-short': position === TradingPosition.SHORT,
          'tw-text-trade-long': position === TradingPosition.LONG,
        },
      )}
    >
      {toNumberFormat(leverage) + 'x'} {orderTypeValue}{' '}
      {position === TradingPosition.LONG ? TradingTypes.BUY : TradingTypes.SELL}
    </div>
    <div className="tw-text-center tw-my-1">
      <AssetRenderer asset={collateralToken} />/
      <AssetRenderer asset={loanToken} />
    </div>
    <div className="tw-flex tw-justify-center tw-items-center">
      {<div className="tw-mr-1">{weiToNumberFormat(amount, 4)}</div>}{' '}
      <AssetRenderer asset={collateral} />
      <div className="tw-px-1">&#64; &ge;</div>
      <PricePrediction
        position={position}
        leverage={leverage}
        loanToken={loanToken}
        collateralToken={collateralToken}
        useLoanTokens={useLoanTokens}
        weiAmount={amount}
      />
    </div>
  </div>
);
