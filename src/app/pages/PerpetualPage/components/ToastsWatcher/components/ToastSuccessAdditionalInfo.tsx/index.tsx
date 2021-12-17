import { AssetValue } from 'app/components/AssetValue';
import { AssetValueMode } from 'app/components/AssetValue/types';
import { ToastTransaction } from 'app/pages/PerpetualPage/contexts/ToastsContext';
import { translations } from 'locales/i18n';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { TradingPosition } from 'types/trading-position';
import { weiToNumberFormat } from 'utils/display-text/format';
import {
  isTrade,
  isDepositMargin,
  isWithdrawMargin,
} from '../../../TradeDialog/types';

type ToastSuccessAdditionalInfoProps = {
  transaction: ToastTransaction;
};

export const ToastSuccessAdditionalInfo: React.FC<ToastSuccessAdditionalInfoProps> = ({
  transaction,
}) => {
  const { t } = useTranslation();

  if (isTrade(transaction)) {
    const amount = weiToNumberFormat(transaction.amount, 3);
    if (transaction.isClosePosition) {
      return (
        <>
          {t(translations.perpetualPage.toasts.closePosition)} {amount} BTC
        </>
      );
    }

    return (
      <>
        {t(translations.perpetualPage.toasts.market)}{' '}
        {t(
          translations.perpetualPage.toasts[
            transaction.tradingPosition === TradingPosition.LONG
              ? 'buy'
              : 'sell'
          ],
        )}{' '}
        {amount} BTC
      </>
    );
  }

  if (transaction.leverage) {
    return (
      <>
        {t(translations.perpetualPage.toasts.editLeverage, {
          leverage: transaction.leverage,
        })}{' '}
      </>
    );
  }

  if (!transaction.leverage && isDepositMargin(transaction)) {
    return (
      <>
        {t(translations.perpetualPage.toasts.increaseMargin)}{' '}
        <AssetValue
          minDecimals={3}
          maxDecimals={6}
          mode={AssetValueMode.auto}
          value={transaction.amount}
          assetString="BCT"
        />
      </>
    );
  }

  if (!transaction.leverage && isWithdrawMargin(transaction)) {
    return (
      <>
        {t(translations.perpetualPage.toasts.decreaseMargin)}{' '}
        <AssetValue
          minDecimals={3}
          maxDecimals={6}
          mode={AssetValueMode.auto}
          value={transaction.amount}
          assetString="BCT"
        />
      </>
    );
  }

  return null;
};
