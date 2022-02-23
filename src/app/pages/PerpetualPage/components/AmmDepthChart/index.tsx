import classNames from 'classnames';
import React, { useMemo } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import trendArrowUp from 'assets/images/trend-arrow-up.svg';
import trendArrowDown from 'assets/images/trend-arrow-down.svg';
import { translations } from '../../../../../locales/i18n';
import { PerpetualPair } from '../../../../../utils/models/perpetual-pair';
import { AssetSymbolRenderer } from '../../../../components/AssetSymbolRenderer';
import { usePerpetual_AmmDepthChart } from '../../hooks/usePerpetual_AmmDepthChart';
import { Tooltip } from '@blueprintjs/core';
import { toNumberFormat } from '../../../../../utils/display-text/format';
import { TradePriceChange } from '../RecentTradesTable/types';
import { AssetValue } from '../../../../components/AssetValue';
import { AssetValueMode } from '../../../../components/AssetValue/types';
import { AmmDepthChartRow } from './AmmDepthChartRow';

type AmmDepthChartProps = {
  pair: PerpetualPair;
};

export const AmmDepthChart: React.FC<AmmDepthChartProps> = ({ pair }) => {
  const { t } = useTranslation();
  const data = usePerpetual_AmmDepthChart(pair);
  const { maxTotal, trendImage, trendText, trendClass } = useMemo(() => {
    let max = 0;
    let trendImage: string | undefined = undefined;
    let trendText: string | undefined = undefined;
    let trendClass: string = 'tw-text-sov-white';

    if (data) {
      max = data.shorts.reduce(
        (acc, entry) => Math.max(acc, entry.amount),
        max,
      );
      max = data.longs.reduce((acc, entry) => Math.max(acc, entry.amount), max);
      switch (data.trend) {
        case TradePriceChange.UP:
          trendImage = trendArrowUp;
          trendText = 'trending upwards';
          trendClass = 'tw-text-trade-long';
          break;
        case TradePriceChange.DOWN:
          trendImage = trendArrowDown;
          trendText = 'trending downwards';
          trendClass = 'tw-text-trade-short';
          break;
        case TradePriceChange.NO_CHANGE:
          trendImage = undefined;
          trendText = 'trend stable';
          trendClass = 'tw-text-sov-white';
          break;
      }
    }

    return { maxTotal: max, trendImage, trendText, trendClass };
  }, [data]);

  return (
    <table className="tw-w-full tw-h-full tw-text-xs tw-leading-snug">
      <thead>
        <tr>
          <th className="tw-h-6 tw-w-4/12 tw-pr-4 tw-pb-1 tw-text-right tw-whitespace-nowrap">
            <Trans
              i18nKey={translations.perpetualPage.ammDepth.price}
              components={[
                <AssetSymbolRenderer assetString={pair.quoteAsset} />,
              ]}
            />
          </th>
          <th className="tw-h-6 tw-w-4/12 tw-pr-4 tw-pb-1 tw-text-right tw-whitespace-nowrap">
            <Tooltip
              position="bottom"
              popoverClassName="tw-max-w-md tw-font-light"
              content={t(translations.perpetualPage.ammDepth.tooltips.change)}
            >
              <Trans i18nKey={translations.perpetualPage.ammDepth.change} />
            </Tooltip>
          </th>
          <th className="tw-h-6 tw-pr-4 tw-pb-1 tw-text-right tw-whitespace-nowrap">
            <Trans
              i18nKey={translations.perpetualPage.ammDepth.total}
              components={[
                <AssetSymbolRenderer assetString={pair.baseAsset} />,
              ]}
            />
          </th>
        </tr>
      </thead>
      <tbody>
        {data && (
          <>
            {data?.shorts?.map((entry, index) => (
              <AmmDepthChartRow
                key={entry.id}
                type="short"
                row={entry}
                maxTotal={maxTotal}
                isOddRow={index % 2 === 0}
              />
            ))}
            <tr>
              <td
                colSpan={3}
                className="tw-p-2 tw-text-center tw-bg-gray-2 tw-rounded tw-transition-colors tw-duration-300"
              >
                <Tooltip
                  position="bottom"
                  content={
                    <Trans
                      i18nKey={
                        translations.perpetualPage.ammDepth.tooltips.midPrice
                      }
                      components={[
                        <AssetValue
                          value={data.price}
                          assetString={pair.quoteAsset}
                          minDecimals={2}
                          maxDecimals={4}
                          mode={AssetValueMode.auto}
                        />,
                      ]}
                    />
                  }
                >
                  <div
                    className={classNames(
                      'tw-flex tw-justify-center tw-text-xl tw-font-semibold ',
                      trendClass,
                    )}
                  >
                    {toNumberFormat(data.price, 2)}
                    {trendImage && (
                      <img
                        className="tw-inline-block tw-w-4 tw-ml-1"
                        src={trendImage}
                        alt={trendText}
                      />
                    )}
                  </div>
                </Tooltip>
                <div>
                  <Tooltip
                    position="bottom"
                    content={
                      <Trans
                        i18nKey={
                          translations.perpetualPage.ammDepth.tooltips
                            .indexPrice
                        }
                        components={[
                          <AssetValue
                            value={data.indexPrice}
                            assetString={pair.quoteAsset}
                            minDecimals={2}
                            maxDecimals={4}
                            mode={AssetValueMode.auto}
                          />,
                        ]}
                      />
                    }
                  >
                    <span className="tw-opacity-50">
                      {toNumberFormat(data.indexPrice, 2)}
                    </span>
                  </Tooltip>
                  {' / '}
                  <Tooltip
                    position="bottom"
                    content={
                      <Trans
                        i18nKey={
                          translations.perpetualPage.ammDepth.tooltips.markPrice
                        }
                        components={[
                          <AssetValue
                            value={data.markPrice}
                            assetString={pair.quoteAsset}
                            minDecimals={2}
                            maxDecimals={4}
                            mode={AssetValueMode.auto}
                          />,
                        ]}
                      />
                    }
                  >
                    {toNumberFormat(data.markPrice, 2)}
                  </Tooltip>
                </div>
              </td>
            </tr>
            {data?.longs?.map((entry, index) => (
              <AmmDepthChartRow
                key={entry.id}
                type="long"
                row={entry}
                maxTotal={maxTotal}
                isOddRow={index % 2 === 0}
              />
            ))}
          </>
        )}
      </tbody>
    </table>
  );
};
