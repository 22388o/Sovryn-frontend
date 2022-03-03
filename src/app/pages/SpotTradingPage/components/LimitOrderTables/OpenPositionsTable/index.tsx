import React, { useMemo, useState } from 'react';
import { SkeletonRow } from 'app/components/Skeleton/SkeletonRow';
import { LimitOrderRow } from '../LimitOrderRow';
import { useTranslation } from 'react-i18next';

import { ILimitOrder } from 'app/pages/SpotTradingPage/types';
import { translations } from 'locales/i18n';
import { useSelector } from 'react-redux';
import { selectSpotTradingPage } from '../../../selectors';
import { Pagination } from 'app/components/Pagination';

interface IOpenPositionsTableProps {
  perPage?: number;
  orders: ILimitOrder[];
  loading: boolean;
}

export const OpenPositionsTable: React.FC<IOpenPositionsTableProps> = ({
  perPage = 5,
  orders,
  loading,
}) => {
  const { t } = useTranslation();
  const trans = translations.spotTradingPage.openLimitOrders;
  const { pendingLimitOrders } = useSelector(selectSpotTradingPage);

  const [page, setPage] = useState(1);

  const items = useMemo(
    () => orders.slice(page * perPage - perPage, page * perPage),
    [perPage, page, orders],
  );
  const pendingList = useMemo(() => {
    return pendingLimitOrders.filter(
      item =>
        orders.findIndex(
          order => order.created.toString() === item.created.toString(),
        ) < 0,
    );
  }, [orders, pendingLimitOrders]);

  const isEmpty = !loading && !items.length;

  const onPageChanged = data => {
    setPage(data.currentPage);
  };

  return (
    <>
      <table className="tw-table">
        <thead>
          <tr>
            <th className="tw-w-full">{t(trans.dateTime)}</th>
            <th className="tw-w-full">{t(trans.pair)}</th>
            <th className="tw-w-full">{t(trans.orderType)}</th>
            <th className="tw-w-full">{t(trans.tradeAmount)}</th>
            <th className="tw-w-full">{t(trans.limitPrice)}</th>
            <th className="tw-w-full">{t(trans.amountReceive)}</th>
            <th className="tw-w-full">{t(trans.deadline)}</th>
            <th className="tw-w-full">{t(trans.actions)}</th>
          </tr>
        </thead>
        <tbody>
          {isEmpty && (
            <tr>
              <td colSpan={99}>{t(trans.noData)}</td>
            </tr>
          )}

          {loading && !items.length && !pendingList.length && (
            <tr>
              <td colSpan={99}>
                <SkeletonRow />
              </td>
            </tr>
          )}

          {pendingList.length > 0 && (
            <>
              {pendingList.map(item => (
                <LimitOrderRow key={item.hash} item={item} pending={true} />
              ))}
            </>
          )}
          {items.length > 0 && (
            <>
              {items.map(item => (
                <LimitOrderRow key={item.hash} item={item} />
              ))}
            </>
          )}
        </tbody>
      </table>

      {orders.length > 0 && (
        <Pagination
          totalRecords={orders.length}
          pageLimit={perPage}
          pageNeighbours={1}
          onChange={onPageChanged}
        />
      )}
    </>
  );
};