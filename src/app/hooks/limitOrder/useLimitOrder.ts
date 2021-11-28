import { contractReader } from 'utils/sovryn/contract-reader';
import { getContract as getContractData } from 'utils/blockchain/contract-helpers';
import { selectWalletProvider } from 'app/containers/WalletProvider/selectors';
import { useAccount } from 'app/hooks/useAccount';
import { Asset } from 'types';
import { ethers } from 'ethers';
import { SignatureLike } from '@ethersproject/bytes';
import { useSelector } from 'react-redux';
import {
  CheckAndApproveResult,
  contractWriter,
} from 'utils/sovryn/contract-writer';
import { useCallback } from 'react';
import { TransactionConfig } from 'web3-core';
import { gas } from 'utils/blockchain/gas-price';
import { Order } from 'app/pages/SpotTradingPage/helpers';
import { useSendTx } from '../useSendTx';
import { signTypeData } from './utils';
import axios from 'axios';

export function useLimitOrder(
  sourceToken: Asset,
  targetToken: Asset,
  amount: string,
  amountOutMin: string,
  duration: number = 365,
) {
  const account = useAccount();
  const { chainId } = useSelector(selectWalletProvider);

  const { send, ...tx } = useSendTx();

  const createOrder = useCallback(async () => {
    let tx: CheckAndApproveResult = {};
    if (sourceToken !== Asset.RBTC) {
      tx = await contractWriter.checkAndApprove(
        sourceToken,
        getContract('settlement').address,
        amount,
      );
      if (tx.rejected) {
        return;
      }
    } else {
      try {
        await contractWriter.send('settlement', 'deposit', [account], {
          value: amount,
        });
      } catch (error) {
        return;
      }
    }

    try {
      const created = ethers.BigNumber.from(Math.floor(Date.now() / 1000));

      const order = new Order(
        account,
        sourceToken,
        targetToken,
        amount,
        amountOutMin,
        account,
        getDeadline(duration > 0 ? duration : 365).toString(),
        created.toString(),
      );

      const signature = await signTypeData(order, account, chainId);

      const sig = ethers.utils.splitSignature(signature as SignatureLike);
      console.log({ order });

      const args = [
        order.maker,
        order.fromToken,
        order.toToken,
        order.amountIn,
        order.amountOutMin,
        order.recipient,
        order.deadline,
        order.created,
        sig.v,
        sig.r,
        sig.s,
      ];

      const contract = getContract('orderBook');

      const populated = await contract.populateTransaction.createOrder(args);

      const apiUrl = 'http://18.217.222.156:3000/api/createOrder';

      const { status, data } = await axios.post(apiUrl, {
        data: populated.data,
        from: account,
      });

      return { status, data };
    } catch (error) {
      console.log('error', error);
    }
  }, [
    sourceToken,
    account,
    targetToken,
    amount,
    amountOutMin,
    duration,
    chainId,
  ]);

  return { createOrder, ...tx };
}

export function useCancelLimitOrder(sourceToken: Asset, amount: string) {
  const account = useAccount();

  const { send, ...tx } = useSendTx();

  const cancelOrder = useCallback(
    async (orderHash: string) => {
      console.log('orderHash: ', orderHash);
      const contract = getContract('settlement');

      try {
        if (sourceToken === Asset.RBTC) {
          await contractWriter.send('settlement', 'withdraw', [account]);
        }
      } catch (error) {
        console.error('error', error);
        return;
      }

      const populated = await contract.populateTransaction.cancelOrder(
        orderHash,
      );

      console.log({ populated });

      const nonce = await contractReader.nonce(account);

      send({
        ...populated,
        gas: '600000',
        gasPrice: gas.get(),
        nonce,
      } as TransactionConfig);
    },
    [account, send, sourceToken],
  );

  return { cancelOrder, ...tx };
}

export const getDeadline = daysFromNow =>
  ethers.BigNumber.from(
    Math.floor(Date.now() / 1000 + daysFromNow * 24 * 3600),
  );

export const getContract = contract => {
  const { address, abi } = getContractData(contract);
  return new ethers.Contract(address, abi);
};