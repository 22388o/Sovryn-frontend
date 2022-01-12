import React, { useCallback, useMemo, useEffect } from 'react';
import { useCachedAssetPrice } from 'app/hooks/trading/useCachedAssetPrice';
import { useAccount } from 'app/hooks/useAccount';
import { useTranslation } from 'react-i18next';
import { AssetDetails } from 'utils/models/asset-details';
import { getContract } from 'utils/blockchain/contract-helpers';
import { Tooltip } from '@blueprintjs/core';
import { numberFromWei, weiTo4 } from 'utils/blockchain/math-helpers';
import {
  staking_withdrawFee,
  staking_numTokenCheckpoints,
} from 'utils/blockchain/requests/staking';
import { useStaking_getAccumulatedFees } from 'app/hooks/staking/useStaking_getAccumulatedFees';
import { translations } from 'locales/i18n';
import { LoadableValue } from 'app/components/LoadableValue';
import { ContractName } from 'utils/types/contracts';
import { bignumber } from 'mathjs';
import { Asset } from 'types';
import { weiToUSD } from 'utils/display-text/format';

interface IFeeBlockProps {
  contractToken: AssetDetails;
  usdTotal: (asset: AssetDetails, value: number) => void;
  useNewContract?: boolean;
  title?: string;
}

export const FeeBlock: React.FC<IFeeBlockProps> = ({
  contractToken,
  usdTotal,
  useNewContract = false,
  title,
}) => {
  const account = useAccount();
  const { t } = useTranslation();
  const token =
    contractToken.asset +
    (contractToken.asset === Asset.SOV ? '_token' : '_lending');
  const dollars = useCachedAssetPrice(contractToken.asset, Asset.USDT);
  const tokenAddress = getContract(token as ContractName)?.address;
  const currency = useStaking_getAccumulatedFees(
    account,
    tokenAddress,
    useNewContract,
  );
  const dollarValue = useMemo(() => {
    if (currency.value === null) return '';
    return bignumber(currency.value)
      .mul(dollars.value)
      .div(10 ** contractToken.decimals)
      .toFixed(0);
  }, [dollars.value, currency.value, contractToken.decimals]);

  const handleWithdrawFee = useCallback(
    async e => {
      e.preventDefault();
      try {
        const numTokenCheckpoints = (await staking_numTokenCheckpoints(
          tokenAddress,
          useNewContract,
        )) as string;
        await staking_withdrawFee(
          tokenAddress,
          numTokenCheckpoints,
          account,
          useNewContract,
        );
      } catch (e) {
        console.error(e);
      }
    },
    [tokenAddress, account, useNewContract],
  );

  useEffect(() => {
    usdTotal(contractToken, Number(weiTo4(dollarValue)));
  }, [contractToken, dollarValue, usdTotal]);

  return (
    <>
      {Number(currency.value) > 0 && (
        <div className="tw-flex tw-justify-between tw-items-center tw-mb-1 tw-mt-1 tw-leading-6">
          <div className="tw-w-2/5">
            {contractToken.asset !== Asset.SOV ? (
              <Tooltip
                content={
                  <>{contractToken.asset} will be sent to the lending pool.</>
                }
              >
                <>i{contractToken.asset} (?)</>
              </Tooltip>
            ) : (
              <Tooltip
                content={
                  <>
                    {contractToken.asset} will be converted to RBTC and sent
                    directly to your wallet.
                  </>
                }
              >
                <>{title || contractToken.asset} (?)</>
              </Tooltip>
            )}
          </div>
          <div className="tw-w-1/2 tw-mx-4">
            {numberFromWei(currency.value).toFixed(4)} ≈{' '}
            <LoadableValue
              value={weiToUSD(dollarValue)}
              loading={dollars.loading}
            />
          </div>
          <button
            onClick={handleWithdrawFee}
            type="button"
            className="tw-text-primary hover:tw-text-primary tw-p-0 tw-text-normal tw-lowercase hover:tw-underline tw-font-medium tw-font-body tw-tracking-normal"
          >
            {t(translations.userAssets.actions.withdraw)}
          </button>
        </div>
      )}
    </>
  );
};