import { useEffect, useState, useCallback, useMemo } from 'react';
import { bridgeNetwork } from 'app/pages/BridgeDepositPage/utils/bridge-network';
import { Chain } from 'types';
import { getContract } from 'utils/blockchain/contract-helpers';
import perpetualManagerAbi from 'utils/blockchain/abi/PerpetualManager.json';

export const usePerpetual_queryLiqPoolId = (perpetualId: string) => {
  const [poolId, setPoolId] = useState<string>();

  const fetch = useCallback(() => {
    bridgeNetwork
      .call(
        Chain.BSC,
        getContract('perpetualManager').address,
        perpetualManagerAbi,
        'getPoolIdByPerpetualId',
        [perpetualId],
      )
      .then(setPoolId);
  }, [perpetualId]);

  useEffect(fetch, [fetch]);

  return useMemo(
    () => ({
      refetch: fetch,
      result: poolId,
    }),
    [fetch, poolId],
  );
};
