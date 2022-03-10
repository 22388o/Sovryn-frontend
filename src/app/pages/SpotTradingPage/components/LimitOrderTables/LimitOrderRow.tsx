import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useMaintenance } from 'app/hooks/useMaintenance';
import { ILimitOrder, pairList, TradingTypes } from '../../types';
import { AssetsDictionary } from 'utils/dictionaries/assets-dictionary';
import { AssetSymbolRenderer } from 'app/components/AssetSymbolRenderer';
import { toNumberFormat, weiToNumberFormat } from 'utils/display-text/format';
import { DisplayDate } from 'app/components/ActiveUserLoanContainer/components/DisplayDate';
import { ActionButton } from 'app/components/Form/ActionButton';
import { translations } from 'locales/i18n';
import { ClosePositionDialog } from './ClosePositionDialog';
import { AssetRenderer } from 'app/components/AssetRenderer';
import { bignumber } from 'mathjs';
import classNames from 'classnames';
import { TableTransactionStatus } from 'app/components/FinanceV2Components/TableTransactionStatus';
import { TxStatus } from 'store/global/transactions-store/types';
import { LinkToExplorer } from 'app/components/LinkToExplorer';

interface ILimitOrderRowProps {
  item: ILimitOrder;
  pending?: boolean;
}

export const LimitOrderRow: React.FC<ILimitOrderRowProps> = ({
  item,
  pending,
}) => {
  const { t } = useTranslation();
  const [showClosePosition, setShowClosePosition] = useState(false);
  const { checkMaintenances, States } = useMaintenance();
  const { [States.CLOSE_SPOT_LIMIT]: closeTradesLocked } = checkMaintenances();

  const isOpenPosition = item.filledAmount === '0';

  const fromToken = useMemo(
    () => AssetsDictionary.getByTokenContractAddress(item.fromToken),
    [item.fromToken],
  );
  const toToken = useMemo(
    () => AssetsDictionary.getByTokenContractAddress(item.toToken),
    [item.toToken],
  );

  const tradeType = useMemo(() => {
    return pairList.find(
      item => item === `${toToken?.asset}_${fromToken?.asset}`,
    )
      ? TradingTypes.BUY
      : TradingTypes.SELL;
  }, [fromToken, toToken]);

  const pair = useMemo(() => {
    return tradeType === TradingTypes.BUY
      ? [toToken, fromToken]
      : [fromToken, toToken];
  }, [fromToken, toToken, tradeType]);

  const limitPrice = useMemo(() => {
    return tradeType === TradingTypes.BUY
      ? bignumber(item.amountIn.toString()).div(item.amountOutMin.toString())
      : bignumber(item.amountOutMin.toString()).div(item.amountIn.toString());
  }, [item.amountIn, item.amountOutMin, tradeType]);

  return (
    <tr>
      <td>
        <DisplayDate
          timestamp={new Date(Number(item.created.toString()))
            .getTime()
            .toString()}
        />
      </td>
      <td>
        {item.hash ? (
          <LinkToExplorer
            className="tw-m-0"
            txHash={item.hash}
            startLength={5}
            endLength={5}
          />
        ) : (
          '-'
        )}
      </td>
      <td>
        <div className={'tw-flex tw-items-center tw-select-none'}>
          <div className="tw-rounded-full tw-z-10">
            <img
              className="tw-w-8 tw-h-8 tw-object-scale-down"
              alt={pair[0]?.asset}
              src={pair[0]?.logoSvg}
            />
          </div>
          <div className="tw-rounded-full tw--ml-3">
            <img
              className="tw-w-8 tw-h-8 tw-object-scale-down"
              alt={pair[1]?.asset}
              src={pair[1]?.logoSvg}
            />
          </div>

          <div className="tw-font-light text-white tw-ml-2.5">
            <AssetSymbolRenderer asset={pair[0]?.asset} />
            /
            <AssetSymbolRenderer asset={pair[1]?.asset} />
          </div>
        </div>
      </td>
      <td
        className={classNames('', {
          'tw-text-trade-short': tradeType === TradingTypes.SELL,
          'tw-text-trade-long': tradeType === TradingTypes.BUY,
        })}
      >
        {t(translations.spotTradingPage.tradeForm.limit)}{' '}
        {tradeType === TradingTypes.BUY
          ? t(translations.spotTradingPage.tradeForm.buy)
          : t(translations.spotTradingPage.tradeForm.sell)}
      </td>
      <td className="tw-hidden md:tw-table-cell">
        {weiToNumberFormat(item.amountIn.toString(), 6)}{' '}
        <AssetRenderer asset={fromToken.asset} />
      </td>

      <td className="tw-hidden md:tw-table-cell">
        {toNumberFormat(limitPrice.toString(), 6)}{' '}
        <AssetRenderer asset={pair[1].asset} />
      </td>
      <td>
        {weiToNumberFormat(item.amountOutMin.toString(), 6)}{' '}
        <AssetRenderer asset={toToken.asset} />
      </td>
      {!isOpenPosition && (
        <td>
          {weiToNumberFormat(item.filledAmount, 6)}{' '}
          <AssetRenderer asset={fromToken.asset} />
        </td>
      )}
      {isOpenPosition && (
        <>
          <td>
            <DisplayDate
              timestamp={new Date(Number(item.deadline.toString()))
                .getTime()
                .toString()}
            />
          </td>

          <td>
            <div className="tw-flex tw-items-center">
              {!pending && (
                <ActionButton
                  text={t(translations.openPositionTable.cta.close)}
                  onClick={() => setShowClosePosition(true)}
                  className={`tw-border-none tw-ml-0 tw-pl-0 ${
                    closeTradesLocked && 'tw-cursor-not-allowed'
                  }`}
                  textClassName="tw-text-xs tw-overflow-visible tw-font-bold"
                  disabled={closeTradesLocked}
                  title={
                    (closeTradesLocked &&
                      t(translations.maintenance.closeMarginTrades).replace(
                        /<\/?\d+>/g,
                        '',
                      )) ||
                    undefined
                  }
                />
              )}
              {pending && (
                <TableTransactionStatus transactionStatus={TxStatus.PENDING} />
              )}
            </div>
            <ClosePositionDialog
              order={item}
              onCloseModal={() => setShowClosePosition(false)}
              showModal={showClosePosition}
              fromToken={fromToken}
              toToken={toToken}
              tradeType={tradeType}
              limitPrice={limitPrice.toString()}
              pair={pair}
            />
          </td>
        </>
      )}
    </tr>
  );
};
