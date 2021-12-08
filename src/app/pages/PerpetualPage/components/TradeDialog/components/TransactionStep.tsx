import React, { useContext, useMemo, Fragment, useCallback } from 'react';
import { TransitionStep } from '../../../../../containers/TransitionSteps';
import { TradeDialogStep, PerpetualTxMethods } from '../types';
import { TradeDialogContext } from '../index';
import styles from '../index.module.scss';
import { translations } from '../../../../../../locales/i18n';
import { useTranslation } from 'react-i18next';
import { TradeSummary } from './TradeSummary';
import {
  TxStatus,
  Transaction,
} from '../../../../../../store/global/transactions-store/types';
import { TxStatusIcon } from '../../../../../components/Dialogs/TxDialog';
import { useSelector, useDispatch } from 'react-redux';
import { selectTransactions } from '../../../../../../store/global/transactions-store/selectors';
import { actions } from '../../../slice';
import { PerpetualPageModals } from '../../../types';

const TxStatusPriority = {
  [TxStatus.NONE]: 0,
  [TxStatus.CONFIRMED]: 1,
  [TxStatus.PENDING]: 2,
  [TxStatus.PENDING_FOR_USER]: 3,
  [TxStatus.FAILED]: 4,
};

export const TransactionStep: TransitionStep<TradeDialogStep> = ({
  changeTo,
}) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const {
    origin,
    trade,
    pair,
    analysis,
    transactions,
    currentTransaction,
  } = useContext(TradeDialogContext);

  const transactionsMap = useSelector(selectTransactions);

  const requiredTransactions: Transaction[] = useMemo(
    () =>
      transactions.reduce<Transaction[]>((acc, transaction) => {
        if (
          (transaction.method === PerpetualTxMethods.deposit ||
            transaction.method === PerpetualTxMethods.trade) &&
          transaction.approvalTx &&
          transactionsMap[transaction.approvalTx]
        ) {
          acc.push(transactionsMap[transaction.approvalTx]);
        }
        if (transaction.tx && transactionsMap[transaction.tx]) {
          acc.push(transactionsMap[transaction.tx]);
        }
        return acc;
      }, []),
    [transactions, transactionsMap],
  );

  const currentTransactionStatus = useMemo(
    () =>
      requiredTransactions.reduce(
        (acc, transaction) =>
          TxStatusPriority[acc] > TxStatusPriority[transaction.status]
            ? acc
            : transaction.status,
        TxStatus.NONE,
      ),
    [requiredTransactions],
  );

  const title = useMemo(
    () =>
      getTitle(
        t,
        currentTransactionStatus,
        (currentTransaction?.index || 0) + 1,
        transactions.length,
      ),
    [t, currentTransactionStatus, currentTransaction?.index, transactions],
  );

  const onClose = useCallback(
    () => dispatch(actions.setModal(PerpetualPageModals.NONE)),
    [dispatch],
  );

  return (
    <>
      <h1 className="tw-font-semibold">{title}</h1>
      <div className={styles.contentWrapper}>
        <TxStatusIcon status={currentTransactionStatus} />
        <TradeSummary
          origin={origin}
          trade={trade}
          pair={pair}
          {...analysis}
          transactions={requiredTransactions}
        />
        <div className="tw-flex tw-justify-center">
          <button className={styles.confirmButton} onClick={onClose}>
            {t(translations.perpetualPage.reviewTrade.confirm)}
          </button>
        </div>
      </div>
    </>
  );
};

const getTitle = (t, status: TxStatus, current: number, count: number) => {
  switch (status) {
    case TxStatus.CONFIRMED:
      return t(translations.perpetualPage.processTrade.titles.completed);
    case TxStatus.FAILED:
      return t(translations.perpetualPage.processTrade.titles.failed);
    default:
      return t(translations.perpetualPage.processTrade.titles.processing);
  }
};