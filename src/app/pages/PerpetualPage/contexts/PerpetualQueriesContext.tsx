import React, {
  createContext,
  useMemo,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { getContract } from '../../../../utils/blockchain/contract-helpers';
import {
  subscription,
  PerpetualManagerEventKeys,
  decodePerpetualManagerLog,
  getWeb3Socket,
} from '../utils/bscWebsocket';
import { PerpetualPair } from '../../../../utils/models/perpetual-pair';
import debounce from 'lodash.debounce';
import { useAccount } from '../../../hooks/useAccount';
import { usePerpetual_completedTransactions } from '../hooks/usePerpetual_completedTransactions';
import {
  initialAmmState,
  initialPerpetualParameters,
  initialTraderState,
  initialLiquidityPoolState,
  ammStateCallData,
  liquidityPoolStateCallData,
  perpetualParametersCallData,
  traderStateCallData,
  balanceCallData,
} from '../utils/contractUtils';
import { useBridgeNetworkMultiCall } from '../../../hooks/useBridgeNetworkMultiCall';
import { PERPETUAL_CHAIN } from '../types';
import { usePerpetual_queryLiqPoolId } from '../hooks/usePerpetual_queryLiqPoolId';
import {
  perpUtils,
  AMMState,
  LiqPoolState,
  PerpParameters,
  TraderState,
} from '@sovryn/perpetual-swap';
import { PerpetualPairDictionary } from 'utils/dictionaries/perpetual-pair-dictionary';
import { MultiCallData } from 'app/pages/BridgeDepositPage/utils/bridge-network';

const { getDepthMatrix } = perpUtils;

const THROTTLE_DELAY = 1000; // 1s
const UPDATE_INTERVAL = 10000; // 10s

const address = getContract('perpetualManager').address.toLowerCase();
const pairIds = PerpetualPairDictionary.list().map(item => item.id);

type InitSocketParams = {
  update: (isEventByTrader: boolean) => void;
  account: string;
};

const initSocket = (
  { update, account }: InitSocketParams,
  perpetualId: string,
) => {
  const socket = subscription(address, [
    PerpetualManagerEventKeys.Trade,
    PerpetualManagerEventKeys.Liquidate,
    PerpetualManagerEventKeys.UpdatePrice,
  ]);
  socket.on('data', data => {
    const decoded = decodePerpetualManagerLog(data);
    if (
      decoded &&
      decoded.perpetualId?.toLowerCase() === perpetualId.toLowerCase()
    ) {
      update(!!account && decoded.trader?.toLowerCase() === account);
    }
  });

  return {
    socket,
    web3: getWeb3Socket(),
  };
};

type PerpetualValue = {
  ammState: AMMState;
  perpetualParameters: PerpParameters;
  traderState: TraderState;
  liquidityPoolState: LiqPoolState;
  depthMatrixEntries: any[][];
  averagePrice: number;
  lotSize: number;
  lotPrecision: number;
  availableBalance: string;
};

type PerpetualQueriesContextValue = {
  perpetuals: {
    [key: string]: PerpetualValue;
  };
};

const initialPerpetualValue = {
  ammState: initialAmmState,
  perpetualParameters: initialPerpetualParameters,
  traderState: initialTraderState,
  liquidityPoolState: initialLiquidityPoolState,
  depthMatrixEntries: [],
  averagePrice: 0,
  lotSize: 0.002,
  lotPrecision: 3,
  availableBalance: '0',
};

const initialContext = {
  perpetuals: {
    '0': initialPerpetualValue,
  },
};

export const PerpetualQueriesContext = createContext<
  PerpetualQueriesContextValue
>(initialContext);

const getAveragePrice = (depthMatrixEntries: any[][]): number => {
  if (depthMatrixEntries && depthMatrixEntries.length >= 3) {
    const averagePriceIndex = depthMatrixEntries[1].indexOf(0);
    return depthMatrixEntries[0][averagePriceIndex];
  }

  return 0;
};

type PerpetualQueriesContextProviderProps = {
  pair: PerpetualPair;
  children: React.ReactNode;
};

export const PerpetualQueriesContextProvider: React.FC<PerpetualQueriesContextProviderProps> = ({
  pair,
  children,
}) => {
  const transactions = usePerpetual_completedTransactions();
  const account = useAccount();
  const [disconnected, setDisconnected] = useState(false);

  // TODO: Temporary solution, hook adjustment will be necessary
  const { result: firstPoolId } = usePerpetual_queryLiqPoolId(pairIds[0]);
  const { result: secondPoolId } = usePerpetual_queryLiqPoolId(pairIds[1]);

  const multiCallData: MultiCallData[][] = useMemo(
    () => getMultiCallData([firstPoolId, secondPoolId], account),
    [account, firstPoolId, secondPoolId],
  );

  const {
    result: firstResult,
    refetch: firstRefetch,
  } = useBridgeNetworkMultiCall(PERPETUAL_CHAIN, multiCallData[0]);

  const {
    result: secondResult,
    refetch: secondRefetch,
  } = useBridgeNetworkMultiCall(PERPETUAL_CHAIN, multiCallData[1]);

  const perpetuals = useMemo(
    () =>
      pairIds.reduce((acc, currentId, currentIndex) => {
        const result = currentIndex === 0 ? firstResult : secondResult;

        const {
          ammState,
          perpetualParameters,
          liquidityPoolState,
          traderState,
          availableBalance,
        } = { ...initialPerpetualValue, ...(result?.returnData || {}) };

        const { depthMatrixEntries, lotSize, lotPrecision } = getAdditionalInfo(
          perpetualParameters,
          ammState,
        );

        return {
          ...acc,
          [currentId]: {
            ammState: ammState,
            perpetualParameters: perpetualParameters,
            liquidityPoolState: liquidityPoolState,
            traderState: traderState,
            availableBalance: availableBalance,
            depthMatrixEntries: depthMatrixEntries,
            averagePrice: getAveragePrice(depthMatrixEntries),
            lotPrecision: lotPrecision,
            lotSize: lotSize,
          },
        };
      }, [] as any),
    [firstResult, secondResult],
  );

  const value: PerpetualQueriesContextValue = useMemo(
    () => ({
      perpetuals: perpetuals,
    }),
    [perpetuals],
  );

  const refetch = useCallback(() => {
    firstRefetch();
    secondRefetch();
  }, [firstRefetch, secondRefetch]);

  const refetchDebounced = useMemo(
    () =>
      debounce(refetch, THROTTLE_DELAY, {
        leading: true,
        maxWait: THROTTLE_DELAY,
      }),
    [refetch],
  );

  useEffect(() => {
    if (account) {
      refetchDebounced();
    }
    // transactions is required to refetch once new transactions complete
  }, [transactions, account, refetchDebounced]);

  useEffect(() => {
    let { socket, web3 } = initSocket(
      {
        update: () => {
          refetchDebounced();
          setDisconnected(false);
        },
        account: account?.toLowerCase(),
      },
      pair.id,
    );

    const intervalId = setInterval(() => {
      if (!web3.currentProvider) {
        return;
      }
      setDisconnected(!web3.currentProvider['connected']);
    }, UPDATE_INTERVAL);

    return () => {
      clearInterval(intervalId);
      refetchDebounced.cancel();
      socket.unsubscribe((error, success) => {
        if (error) {
          console.error(error);
        }
      });
    };
  }, [refetchDebounced, account, pair.id]);

  useEffect(() => {
    const intervalId = setInterval(
      refetchDebounced,
      disconnected ? THROTTLE_DELAY : UPDATE_INTERVAL,
    );
    return () => {
      clearInterval(intervalId);
      refetchDebounced.cancel();
    };
  }, [disconnected, refetchDebounced]);

  return (
    <PerpetualQueriesContext.Provider value={value}>
      {children}
    </PerpetualQueriesContext.Provider>
  );
};

const getAdditionalInfo = (
  perpetualParameters: perpUtils.PerpParameters,
  ammState: perpUtils.AMMState,
): { depthMatrixEntries: any[][]; lotSize: number; lotPrecision: number } => {
  const depthMatrixEntries =
    perpetualParameters &&
    ammState &&
    getDepthMatrix(perpetualParameters, ammState);

  const lotSize = Number(perpetualParameters.fLotSizeBC.toPrecision(8));
  const lotPrecision = lotSize.toString().split(/[,.]/)[1]?.length || 1;

  return {
    depthMatrixEntries,
    lotSize,
    lotPrecision,
  };
};

const getMultiCallData = (poolIds: (string | undefined)[], account) => {
  const multiCallData: MultiCallData[][] = [];

  pairIds.forEach((pairId, index) => {
    const callData = [
      ammStateCallData(pairId),
      perpetualParametersCallData(pairId),
    ];

    const poolId = poolIds?.[index];
    if (poolId) {
      callData.push(liquidityPoolStateCallData(poolId));
    }

    if (account) {
      callData.push(traderStateCallData(pairId, account));
      callData.push(
        balanceCallData('PERPETUALS_token', account, 'availableBalance'),
      );
    }

    multiCallData.push(callData);
  });

  return multiCallData;
};
