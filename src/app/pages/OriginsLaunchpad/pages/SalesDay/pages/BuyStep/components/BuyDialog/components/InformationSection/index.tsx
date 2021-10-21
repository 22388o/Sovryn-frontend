import React from 'react';
import { useTranslation } from 'react-i18next';
import { translations } from 'locales/i18n';
import { AssetSymbolRenderer } from 'app/components/AssetSymbolRenderer';
import { Asset } from 'types';
import { BuyInformationWrapper } from './styled';
import { InfoItem } from './InfoItem';
import { ISaleInformation } from '../../../../../../../../types';

interface IInformationSectionProps {
  saleName: string;
  info: ISaleInformation;
}

export const InformationSection: React.FC<IInformationSectionProps> = ({
  saleName,
  info,
}) => {
  const { t } = useTranslation();

  return (
    <BuyInformationWrapper>
      <InfoItem
        label={t(
          translations.originsLaunchpad.saleDay.buyStep.buyInformationLabels
            .totalDepositReceived,
        )}
        value={
          <>
            19,944 <AssetSymbolRenderer asset={Asset.SOV} />
          </>
        }
        className="tw-text-primary"
      />

      <InfoItem
        label={t(
          translations.originsLaunchpad.saleDay.buyStep.buyInformationLabels
            .tokenPrice,
        )}
        // value={`${depositRateToSatoshis(info.depositRate)} Sats`}
        value={
          <>
            0.01 <AssetSymbolRenderer asset={Asset.SOV} />
          </>
        }
      />

      <InfoItem
        label={t(
          translations.originsLaunchpad.saleDay.buyStep.buyInformationLabels
            .participatingWallets,
        )}
        value={`${info.participatingWallets}`}
      />

      <InfoItem
        label={t(
          translations.originsLaunchpad.saleDay.buyStep.buyInformationLabels
            .acceptedCurrencies,
        )}
        value={
          <>
            {[Asset.RBTC, Asset.SOV, Asset.XUSD, Asset.ETH, Asset.BNB].map(
              (asset, i) => (
                <React.Fragment key={i}>
                  {i > 0 ? ', ' : ''}
                  <AssetSymbolRenderer asset={asset} key={i} />
                </React.Fragment>
              ),
            )}
          </>
        }
      />

      <InfoItem
        label={t(
          translations.originsLaunchpad.saleDay.buyStep.buyInformationLabels
            .tokenSaleEndTime,
        )}
        value={info.saleEnd}
        isLastItem={true}
      />
    </BuyInformationWrapper>
  );
};
