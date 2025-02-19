import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { bignumber } from 'mathjs';
import { Icon, Tooltip } from '@blueprintjs/core';

import { translations } from '../../../locales/i18n';
import { getTokenContractName } from '../../../utils/blockchain/contract-helpers';
import { AssetsDictionary } from '../../../utils/dictionaries/assets-dictionary';
import { AssetDetails } from '../../../utils/models/asset-details';
import { LoadableValue } from '../LoadableValue';
import { Asset } from '../../../types';
import { Skeleton } from '../PageSkeleton';
import {
  weiToNumberFormat,
  weiToUSD,
} from '../../../utils/display-text/format';
import { contractReader } from '../../../utils/sovryn/contract-reader';
import {
  useAccount,
  useBlockSync,
  useIsConnected,
} from '../../hooks/useAccount';
import { AssetRenderer } from '../AssetRenderer/';
import { Sovryn } from '../../../utils/sovryn';
import { useMaintenance } from 'app/hooks/useMaintenance';
import { Dialog } from '../../containers/Dialog';
import { Button, ButtonSize, ButtonStyle } from '../Button';
import { discordInvite } from 'utils/classifiers';
import { ConversionDialog } from './ConversionDialog';
import { BridgeLink } from './BridgeLink';
import { UnWrapDialog } from './UnWrapDialog';
import { useDollarValue } from '../../hooks/useDollarValue';
import styles from './index.module.scss';
import { CrossBridgeAsset } from 'app/pages/BridgeDepositPage/types/cross-bridge-asset';

import busdIcon from 'app/pages/BridgeDepositPage/dictionaries/assets/icons/busd.svg';
import usdtIcon from 'app/pages/BridgeDepositPage/dictionaries/assets/icons/usdt.svg';
import usdcIcon from 'app/pages/BridgeDepositPage/dictionaries/assets/icons/usdc.svg';
import daiIcon from 'app/pages/BridgeDepositPage/dictionaries/assets/icons/dai.svg';
import { Link } from 'react-router-dom';
import { TransakDialog } from '../TransakDialog/TransakDialog';

export const UserAssets: React.FC = () => {
  const { t } = useTranslation();
  const connected = useIsConnected();
  const account = useAccount();
  const { checkMaintenances, States } = useMaintenance();
  const {
    [States.FASTBTC]: fastBtcLocked,
    [States.TRANSACK]: transackLocked,
  } = checkMaintenances();

  const assets = useMemo(
    () =>
      AssetsDictionary.list().filter(
        item => ![Asset.CSOV].includes(item.asset),
      ),
    [],
  );

  const [transack, setTransack] = useState(false);
  const [conversionDialog, setConversionDialog] = useState(false);
  const [unwrapDialog, setUnwrapDialog] = useState(false);
  const [conversionToken, setConversionToken] = useState<Asset>(null!);

  const onConvertOpen = useCallback((asset: Asset) => {
    setConversionToken(asset);
    setConversionDialog(true);
  }, []);

  const onConvertClose = useCallback(() => {
    setConversionToken(null!);
    setConversionDialog(false);
  }, []);

  return (
    <>
      <div className="sovryn-border sovryn-table tw-pt-1 tw-pb-4 tw-pr-4 tw-pl-4 tw-mb-12 tw-overflow-auto">
        <table className="tw-w-full">
          <thead>
            <tr>
              <th>{t(translations.userAssets.tableHeaders.asset)}</th>
              <th className="tw-text-right">
                {t(translations.userAssets.tableHeaders.totalBalance)}
              </th>
              <th className="tw-text-right tw-hidden md:tw-table-cell">
                {t(translations.userAssets.tableHeaders.dollarBalance)}
              </th>
              <th className="tw-text-right tw-hidden md:tw-table-cell">
                {t(translations.userAssets.tableHeaders.action)}
              </th>
            </tr>
          </thead>
          <tbody className="tw-mt-12">
            {!connected && (
              <>
                <tr>
                  <td>
                    <Skeleton />
                  </td>
                  <td>
                    <Skeleton />
                  </td>
                  <td className="tw-hidden md:tw-table-cell">
                    <Skeleton />
                  </td>
                  <td className="tw-hidden md:tw-table-cell">
                    <Skeleton />
                  </td>
                </tr>
              </>
            )}
            {connected &&
              account &&
              assets.map(item => (
                <AssetRow
                  key={item.asset}
                  item={item}
                  onTransack={() => setTransack(true)}
                  onConvert={onConvertOpen}
                  onUnWrap={() => setUnwrapDialog(true)}
                />
              ))}
          </tbody>
        </table>
      </div>
      <TransakDialog isOpen={transack} onClose={() => setTransack(false)} />
      <ConversionDialog
        isOpen={conversionDialog}
        asset={conversionToken}
        onClose={onConvertClose}
      />
      <UnWrapDialog
        isOpen={unwrapDialog}
        onClose={() => setUnwrapDialog(false)}
      />
      <Dialog
        isOpen={(fastBtcLocked && transack) || (transackLocked && transack)}
        onClose={() => {
          setTransack(false);
        }}
      >
        <div className="tw-mw-340 tw-mx-auto">
          <h1 className="tw-mb-6 tw-text-sov-white tw-text-center">
            {t(translations.common.maintenance)}
          </h1>
          <div className="tw-text-sm tw-font-normal tw-tracking-normal tw-text-center">
            <Trans
              i18nKey={translations.maintenance.transack}
              components={[
                <a
                  href={discordInvite}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="tw-underline hover:tw-no-underline"
                >
                  x
                </a>,
              ]}
            />
          </div>
          <div className="tw-text-center tw-mt-5">
            <Button
              text={t(translations.modal.close)}
              size={ButtonSize.lg}
              style={ButtonStyle.inverted}
              onClick={() => {
                setTransack(false);
              }}
            />
          </div>
        </div>
      </Dialog>
    </>
  );
};

interface IAssetRowProps {
  item: AssetDetails;
  onTransack: () => void;
  onConvert: (asset: Asset) => void;
  onUnWrap: () => void;
}

const XUSD_ASSETS: {
  asset: CrossBridgeAsset;
  image: string;
}[] = [
  { asset: CrossBridgeAsset.DAI, image: daiIcon },
  { asset: CrossBridgeAsset.USDT, image: usdtIcon },
  { asset: CrossBridgeAsset.USDC, image: usdcIcon },
  { asset: CrossBridgeAsset.BUSD, image: busdIcon },
];

const AssetRow: React.FC<IAssetRowProps> = ({
  item,
  onTransack,
  onConvert,
  onUnWrap,
}) => {
  const { t } = useTranslation();
  const account = useAccount();
  const [loading, setLoading] = useState(true);
  const [tokens, setTokens] = useState('0');
  const blockSync = useBlockSync();

  const { checkMaintenance, States } = useMaintenance();
  const fastBtcLocked = checkMaintenance(States.FASTBTC);

  useEffect(() => {
    const get = async () => {
      setLoading(true);
      let tokenA: string = '0';
      if (item.asset === Asset.RBTC) {
        tokenA = await Sovryn.getWeb3().eth.getBalance(account);
      } else {
        tokenA = await contractReader
          .call<string>(getTokenContractName(item.asset), 'balanceOf', [
            account,
          ])
          .catch(e => {
            console.error('failed to load balance of ', item.asset, e);
            return '0';
          });
      }

      let tokenB: string = '0';
      if (item.asset === Asset.CSOV) {
        tokenB = await contractReader.call('CSOV2_token', 'balanceOf', [
          account,
        ]);
      }
      setTokens(
        bignumber(tokenA)
          .add(tokenB || '0')
          .toFixed(0),
      );
      setLoading(false);
    };
    get().catch();
  }, [item.asset, account, blockSync]);

  const assetDollarValue = useDollarValue(item.asset, tokens);

  if (tokens === '0' && item.hideIfZero)
    return <React.Fragment key={item.asset} />;

  return (
    <tr key={item.asset}>
      <td>
        <div className="tw-flex tw-flex-row tw-items-center">
          <div className="tw-inline-flex tw-items-center">
            <AssetRenderer asset={item.asset} showImage />
          </div>
          {item.asset === Asset.XUSD && (
            <div className="tw-inline-flex tw-flex-row tw-space-x-1 tw-ml-4 tw-items-center">
              {XUSD_ASSETS.map(xusdAsset => (
                <img
                  key={xusdAsset.asset}
                  src={xusdAsset.image}
                  className="tw-inline-block tw-h-6"
                  alt={xusdAsset.asset}
                  title={xusdAsset.asset}
                />
              ))}
              <a
                href="https://wiki.sovryn.app/en/technical-documents/xusd-overview"
                target="_blank"
                rel="noopener noreferrer"
                className="tw-text-white hover:tw-text-gray-9"
              >
                <Icon className="tw-cursor-pointer" icon="help" />
              </a>
            </div>
          )}
        </div>
      </td>
      <td className="tw-text-right">
        <LoadableValue value={weiToNumberFormat(tokens, 4)} loading={loading} />
      </td>
      <td className="tw-text-right tw-hidden md:tw-table-cell">
        <LoadableValue
          value={weiToUSD(assetDollarValue.value)}
          loading={assetDollarValue.loading}
        />
      </td>
      <td className="tw-text-right tw-hidden md:tw-table-cell">
        <div className="tw-w-full tw-flex tw-flex-row tw-space-x-4 tw-justify-end">
          {item.asset === Asset.RBTC && (
            <>
              <button className={styles.actionLink} onClick={onTransack}>
                {t(translations.userAssets.actions.buy)}
              </button>
              {fastBtcLocked ? (
                <Tooltip
                  position="bottom"
                  hoverOpenDelay={0}
                  hoverCloseDelay={0}
                  interactionKind="hover"
                  content={<>{t(translations.maintenance.fastBTCPortfolio)}</>}
                >
                  <div className="tw-cursor-not-allowed tw-opacity-25">
                    {t(translations.common.deposit)}
                  </div>
                </Tooltip>
              ) : (
                <Link to="/fast-btc/deposit">
                  <span>{t(translations.common.deposit)}</span>
                </Link>
              )}
              {fastBtcLocked ? (
                <Tooltip
                  position="bottom"
                  hoverOpenDelay={0}
                  hoverCloseDelay={0}
                  interactionKind="hover"
                  content={<>{t(translations.maintenance.fastBTCPortfolio)}</>}
                >
                  <div className="tw-cursor-not-allowed tw-opacity-25">
                    {t(translations.common.withdraw)}
                  </div>
                </Tooltip>
              ) : (
                <Link to="/fast-btc/withdraw">
                  <span>{t(translations.common.withdraw)}</span>
                </Link>
              )}
            </>
          )}
          {[Asset.USDT, Asset.RDOC].includes(item.asset) && (
            <button
              className={styles.actionLink}
              onClick={() => onConvert(item.asset)}
            >
              {t(translations.userAssets.actions.convert)}
            </button>
          )}
          {[Asset.SOV, Asset.ETH, Asset.XUSD, Asset.BNB].includes(
            item.asset,
          ) && <BridgeLink asset={item.asset} />}
          {item.asset === Asset.WRBTC && (
            <button className={styles.actionLink} onClick={onUnWrap}>
              {t(translations.userAssets.actions.unwrap)}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};
