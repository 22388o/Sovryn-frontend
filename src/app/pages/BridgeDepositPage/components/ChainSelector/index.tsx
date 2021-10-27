import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useWalletContext } from '@sovryn/react-wallet';

import { actions } from '../../slice';
import { Chain } from '../../../../../types';
import { BridgeDictionary } from '../../dictionaries/bridge-dictionary';
import { currentChainId, discordInvite } from 'utils/classifiers';
import { SelectBox } from '../SelectBox';
import { useTranslation, Trans } from 'react-i18next';
import { translations } from 'locales/i18n';
import { CrossBridgeAsset } from '../../types/cross-bridge-asset';
import { selectBridgeDepositPage } from '../../selectors';
import { useMaintenance } from 'app/hooks/useMaintenance';
import { useDepositMaintenance } from 'app/pages/BridgeDepositPage/hooks/useDepositMaintenance';
import { ErrorBadge } from 'app/components/Form/ErrorBadge';

export function ChainSelector() {
  const dispatch = useDispatch();
  const walletContext = useWalletContext();
  const { t } = useTranslation();
  const { checkMaintenance, States } = useMaintenance();
  const bridgeLocked = checkMaintenance(States.BRIDGE);

  const { targetAsset } = useSelector(selectBridgeDepositPage);

  const selectNetwork = useCallback(
    (chain: Chain) => {
      dispatch(actions.selectNetwork({ chain, walletContext }));
    },
    [dispatch, walletContext],
  );

  // It excludes current dapp chain (no RSK network), but i think it should be there in the end.
  const networks = useMemo(
    () =>
      BridgeDictionary.listNetworks()
        .filter(item => item.chainId !== currentChainId)
        .filter(item =>
          BridgeDictionary.get(item.chain, Chain.RSK)?.getAssetFromGroup(
            targetAsset as CrossBridgeAsset,
          ),
        ),
    [targetAsset],
  );

  const { lockedChains, isAssetDepositLocked } = useDepositMaintenance();
  const assetDepositLocked = isAssetDepositLocked(targetAsset);
  const lockedChainsVisible = useMemo(
    () =>
      networks.filter(val => val.chain && lockedChains[val.chain] === true)
        .length > 0,
    [lockedChains, networks],
  );

  return (
    <div>
      <div className="tw-mb-20 tw-text-2xl tw-text-center tw-font-semibold">
        {t(translations.BridgeDepositPage.chainSelector.chooseNetwork.title)}
      </div>
      <div className="tw-flex tw-px-2 tw-justify-center">
        {networks.map(item => (
          <SelectBox
            key={item.chain}
            onClick={() => selectNetwork(item.chain)}
            disabled={
              bridgeLocked || assetDepositLocked || lockedChains[item.chain]
            }
          >
            <img className="tw-mb-5 tw-mt-2" src={item.logo} alt={item.chain} />
            <div>
              <span className="tw-uppercase">{item.chain} </span>{' '}
              {t(translations.BridgeDepositPage.network)}
            </div>
          </SelectBox>
        ))}
      </div>
      {(bridgeLocked || assetDepositLocked || lockedChainsVisible) && (
        <ErrorBadge
          content={
            <Trans
              i18nKey={translations.maintenance.bridgeSteps}
              components={[
                <a
                  href={discordInvite}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="tw-text-warning tw-text-xs tw-underline hover:tw-no-underline"
                >
                  x
                </a>,
              ]}
            />
          }
        />
      )}
    </div>
  );
}
