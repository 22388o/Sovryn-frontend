import React, { useMemo, useState } from 'react';
import { SkeletonRow } from 'app/components/Skeleton/SkeletonRow';
import { LimitOrderRow } from './LimitOrderRow';
import { useTranslation } from 'react-i18next';
import { translations } from 'locales/i18n';
import { Pagination } from 'app/components/Pagination';
import { LimitOrder } from 'app/pages/SpotTradingPage/types';

interface ILimitOrderHistoryProps {
  perPage?: number;
  orders: LimitOrder[];
  loading: boolean;
}

export const LimitOrderHistory: React.FC<ILimitOrderHistoryProps> = ({
  perPage = 5,
  orders,
  loading,
}) => {
  const { t } = useTranslation();
  const trans = translations.spotTradingPage.openLimitOrders;

  const [page, setPage] = useState(1);

  const items = useMemo(
    () => orders.slice(page * perPage - perPage, page * perPage),
    [perPage, page, orders],
  );

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
            <th className="tw-w-full">{t(trans.filledAmount)}</th>
          </tr>
        </thead>
        <tbody>
          {isEmpty && (
            <tr>
              <td colSpan={99}>{t(trans.noData)}</td>
            </tr>
          )}

          {loading && !items.length && (
            <tr>
              <td colSpan={99}>
                <SkeletonRow />
              </td>
            </tr>
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
