import React, { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Chain } from 'types';

import { actions } from '../../slice';
import { selectBridgeDepositPage } from '../../selectors';
import { BridgeDictionary } from '../../dictionaries/bridge-dictionary';
import { CrossBridgeAsset } from '../../types/cross-bridge-asset';
import { bridgeNetwork } from '../../utils/bridge-network';
import { discordInvite } from 'utils/classifiers';
import erc20Abi from '../../../../../utils/blockchain/abi/erc20.json';
import { DepositStep } from '../../types';
import { BridgeNetworkDictionary } from '../../dictionaries/bridge-network-dictionary';
import { TokenItem } from './TokenItem';
import { useTranslation, Trans } from 'react-i18next';
import { translations } from 'locales/i18n';
import { useWalletContext } from '@sovryn/react-wallet';
import { useMaintenance } from 'app/hooks/useMaintenance';
import { ErrorBadge } from 'app/components/Form/ErrorBadge';

export function TokenSelector() {
  const { chain, targetChain, targetAsset } = useSelector(
    selectBridgeDepositPage,
  );
  const walletContext = useWalletContext();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { checkMaintenances, States } = useMaintenance();
  const {
    [States.BRIDGE]: bridgeLocked,
    [States.ETH_BRIDGE]: ethBridgeLocked,
    [States.BSC_BRIDGE]: bscBridgeLocked,
    [States.ETH_BRIDGE_DEPOSIT]: ethBridgeDepositLocked,
    [States.BSC_BRIDGE_DEPOSIT]: bscBridgeDepositLocked,
    [States.BRIDGE_SOV_DEPOSIT]: sovDepositLocked,
    [States.BRIDGE_XUSD_DEPOSIT]: xusdDepositLocked,
    [States.BRIDGE_ETH_DEPOSIT]: ethDepositLocked,
    [States.BRIDGE_BNB_DEPOSIT]: bnbDepositLocked,
  } = checkMaintenances();

  const lockedChains = useMemo(
    () => ({
      [Chain.ETH]: ethBridgeLocked || ethBridgeDepositLocked,
      [Chain.BSC]: bscBridgeLocked || bscBridgeDepositLocked,
    }),
    [
      ethBridgeLocked,
      ethBridgeDepositLocked,
      bscBridgeLocked,
      bscBridgeDepositLocked,
    ],
  );

  const assetDepositLocked = useMemo(() => {
    switch (targetAsset) {
      case CrossBridgeAsset.SOV:
        return sovDepositLocked;
      case CrossBridgeAsset.XUSD:
        return xusdDepositLocked;
      case CrossBridgeAsset.ETH:
        return ethDepositLocked;
      case CrossBridgeAsset.BNB:
        return bnbDepositLocked;
      default:
        return false;
    }
  }, [
    targetAsset,
    sovDepositLocked,
    xusdDepositLocked,
    ethDepositLocked,
    bnbDepositLocked,
  ]);

  useEffect(() => {
    if (chain === null) {
      dispatch(actions.setStep(DepositStep.CHAIN_SELECTOR));
    }
  }, [chain, dispatch]);

  const selectSourceAsset = useCallback(
    (asset: CrossBridgeAsset) => {
      dispatch(actions.selectSourceAsset(asset));
    },
    [dispatch],
  );

  const disconnect = useCallback(() => {
    walletContext.disconnect();
    dispatch(actions.setStep(DepositStep.WALLET_SELECTOR));
  }, [dispatch, walletContext]);

  // It excludes current dapp chain (no RSK network), but i think it should be there in the end.
  const sourceAssets = useMemo(
    () =>
      (
        BridgeDictionary.get(chain as Chain, targetChain)?.assets || []
      ).filter(item =>
        item.usesAggregator
          ? item.aggregatedTokens.includes(targetAsset as CrossBridgeAsset)
          : item.group === targetAsset,
      ),
    [chain, targetAsset, targetChain],
  );

  // todo this will be used for withdrawals later.
  useEffect(() => {
    const callData = sourceAssets
      .filter(item => item.usesAggregator && !item.aggregatorMints)
      .map(item => {
        return {
          address:
            item.bridgeTokenAddresses.get(targetAsset as any) ||
            item.tokenContractAddress,
          abi: erc20Abi,
          fnName: 'balanceOf',
          args: [item.aggregatorContractAddress],
          key: item.symbol,
        };
      });

    if (callData.length) {
      bridgeNetwork
        .multiCall(targetChain as any, callData)
        .then(result => {
          // todo render these balance limits to respected asset (only when chain is RSK)
          console.log('token selector', result);
        })
        .catch(error => {
          console.error('what', error);
        });
    }
  }, [chain, targetChain, targetAsset, sourceAssets]);

  const network = useMemo(() => BridgeNetworkDictionary.get(chain as Chain), [
    chain,
  ]);

  return (
    <div>
      <div className="tw-mb-20 tw-text-2xl tw-text-center tw-font-semibold">
        {t(translations.BridgeDepositPage.tokenSelector.title)}
      </div>
      {sourceAssets.length > 0 ? (
        <div className="tw-flex tw-px-2 tw-justify-center">
          {sourceAssets.map(item => {
            return (
              <TokenItem
                key={item.asset}
                sourceAsset={item.asset}
                image={item.image}
                symbol={item.symbol}
                onClick={() => selectSourceAsset(item.asset)}
                disabled={
                  bridgeLocked ||
                  assetDepositLocked ||
                  (chain && lockedChains[chain])
                }
              />
            );
          })}
        </div>
      ) : (
        <p className="tw-w-80 tw-text-center">
          {t(translations.BridgeDepositPage.tokenSelector.notSupported, {
            targetAsset,
            network: network?.name,
          })}
        </p>
      )}
      {(bridgeLocked ||
        assetDepositLocked ||
        (chain && lockedChains[chain])) && (
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
      <div
        onClick={() => disconnect()}
        className="tw-cursor-pointer tw-font-semibold tw-text-sov-white tw-underline tw-text-center tw-mt-20"
      >
        {t(translations.BridgeDepositPage.changeWallet)}
      </div>
    </div>
  );
}
