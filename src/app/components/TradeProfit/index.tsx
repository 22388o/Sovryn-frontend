import React, { useState, useEffect, useCallback } from 'react';
import { bignumber } from 'mathjs';
import { Tooltip } from '@blueprintjs/core';
import { useTranslation } from 'react-i18next';
import { TradingPosition } from '../../../types/trading-position';
import {
  toNumberFormat,
  weiToNumberFormat,
} from '../../../utils/display-text/format';
import { Asset } from '../../../types/asset';
import { translations } from '../../../locales/i18n';
import { useAccount } from 'app/hooks/useAccount';
import { backendUrl, currentChainId } from 'utils/classifiers';
import { toWei } from 'utils/blockchain/math-helpers';
import { TradingPair } from 'utils/models/trading-pair';
import { btcInSatoshis } from 'app/constants';

interface ITradeProfitProps {
  asset: Asset;
  entryPrice: string;
  closePrice: string;
  position: TradingPosition;
  positionSize: string;
  loanToken: string;
  pair: TradingPair;
  loanId: string;
}

export const TradeProfit: React.FC<ITradeProfitProps> = ({
  loanToken,
  pair,
  loanId,
  position,
  asset,
}) => {
  const account = useAccount();
  const { t } = useTranslation();
  const [profit, setProfit] = useState('');
  const [profitDirection, setProfitDirection] = useState(0);
  const prettyPrice = useCallback(
    amount => {
      return loanToken !== pair.shortAsset
        ? toWei(bignumber(1).div(amount).mul(btcInSatoshis))
        : toWei(bignumber(amount).div(btcInSatoshis));
    },
    [loanToken, pair.shortAsset],
  );

  useEffect(() => {
    fetch(backendUrl[currentChainId] + '/events/trade/' + account)
      .then(response => {
        return response.json();
      })
      .then(loanEvents => {
        loanEvents.events.forEach(events => {
          if (events.loanId === loanId) {
            const entryPrice = prettyPrice(events.data[0].collateralToLoanRate);
            const closePrice = prettyPrice(
              events.data.slice(-1).pop().collateralToLoanRate,
            ); // getting the last element in data
            const positionSize = events.data[0].positionSize;

            //LONG position
            let change = bignumber(bignumber(closePrice).minus(entryPrice))
              .div(entryPrice)
              .mul(100)
              .toNumber();

            //SHORT position
            if (position === TradingPosition.SHORT) {
              change = bignumber(bignumber(entryPrice).minus(closePrice))
                .div(entryPrice)
                .mul(100)
                .toNumber();
            }
            setProfit(
              bignumber(change)
                .mul(bignumber(positionSize))
                .div(100)
                .toFixed(0),
            );
            setProfitDirection(change);
          }
        });
      })
      .catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <Tooltip
        content={
          <>
            {profitDirection > 0 ? (
              <>
                {t(translations.tradingHistoryPage.table.profitLabels.up)}
                <span className="tw-text-success">
                  {toNumberFormat(profitDirection, 2)}
                </span>{' '}
                %
              </>
            ) : (
              <>
                {t(translations.tradingHistoryPage.table.profitLabels.down)}
                <span className="tw-text-warning">
                  {toNumberFormat(Math.abs(profitDirection), 2)}
                </span>{' '}
                %
              </>
            )}
            {profitDirection === 0 && (
              <>
                {t(translations.tradingHistoryPage.table.profitLabels.noChange)}
              </>
            )}
          </>
        }
      >
        <span
          className={
            profitDirection < 0 ? 'tw-text-warning' : 'tw-text-success'
          }
        >
          {profitDirection > 0 && '+'}
          {weiToNumberFormat(profit, 8)} {asset}
        </span>
      </Tooltip>
    </div>
  );
};
