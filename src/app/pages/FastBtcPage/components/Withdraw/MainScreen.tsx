import React, { useCallback, useContext } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { translations } from 'locales/i18n';
import { WithdrawContext, WithdrawStep } from '../../contexts/withdraw-context';
import { AssetSymbolRenderer } from '../../../../components/AssetSymbolRenderer';
import { WithdrawDetails } from './WithdrawDetails';
import { WithdrawInstructions } from './WithdrawInstructions';
import { FastBtcButton } from '../FastBtcButton';
import { NetworkAwareComponentProps } from '../../types';
import { getBTCAssetForNetwork } from '../../helpers';
import { useMaintenance } from 'app/hooks/useMaintenance';
import { discordInvite } from 'utils/classifiers';
import { ErrorBadge } from 'app/components/Form/ErrorBadge';

export const MainScreen: React.FC<NetworkAwareComponentProps> = ({
  network,
}) => {
  const { set } = useContext(WithdrawContext);
  const { t } = useTranslation();
  const { checkMaintenance, States } = useMaintenance();
  const fastBtcLocked = checkMaintenance(States.FASTBTC);

  const onContinueClick = useCallback(
    () => set(prevState => ({ ...prevState, step: WithdrawStep.AMOUNT })),
    [set],
  );

  return (
    <>
      <div className="tw-mb-6 tw-text-2xl tw-text-center tw-font-semibold">
        <Trans
          i18nKey={translations.fastBtcPage.withdraw.mainScreen.title}
          components={[
            <AssetSymbolRenderer asset={getBTCAssetForNetwork(network)} />,
          ]}
        />
      </div>
      <div className="tw-w-full">
        <div className="tw-py-4 tw-px-8 tw-bg-gray-5 tw-text-white tw-rounded tw-mb-4">
          {t(translations.fastBtcPage.withdraw.mainScreen.description)}
        </div>
        <WithdrawDetails network={network} />
        <WithdrawInstructions />
        <div className="tw-px-8">
          <FastBtcButton
            text={t(translations.common.continue)}
            onClick={onContinueClick}
            disabled={fastBtcLocked}
          />
          {fastBtcLocked && (
            <ErrorBadge
              content={
                <Trans
                  i18nKey={translations.maintenance.fastBTC}
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
      </div>
    </>
  );
};
