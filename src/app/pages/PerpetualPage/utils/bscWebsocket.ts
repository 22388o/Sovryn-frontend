import Web3 from 'web3';
import IPerpetualManager from 'utils/blockchain/abi/PerpetualManager.json';
import { AbiItem } from 'web3-utils';
import { BridgeNetworkDictionary } from '../../BridgeDepositPage/dictionaries/bridge-network-dictionary';
import { ChainId } from '../../../../types';

const web3Socket = new Web3(
  new Web3.providers.WebsocketProvider(process.env.REACT_APP_BSC_WS_URL || ''),
);

const isMainnet = process.env.REACT_APP_NETWORK === 'mainnet';
const rpcAddress = BridgeNetworkDictionary.getByChainId(
  isMainnet ? ChainId.BSC_MAINNET : ChainId.BSC_TESTNET,
)?.rpc;
const web3Http = new Web3(rpcAddress || null);

const PerpetualManager = IPerpetualManager as AbiItem[];
const TradeParameters =
  PerpetualManager.find(item => item.name === 'Trade')?.inputs || [];

export function decodeTradeLogs(
  logs: string,
  topics: string[],
): { [key: string]: string } | undefined {
  try {
    return web3Http.eth.abi.decodeLog(TradeParameters, logs, topics);
  } catch (error) {
    console.error(error);
  }
}

export const subscription = (
  address: string,
  events: string[],
  fromBlock?: number,
) => {
  const topics = events.map(event =>
    web3Http.eth.abi.encodeEventSignature(
      PerpetualManager.find(item => item.name === event) || '',
    ),
  );
  let options = {
    address: address,
    topics: topics,
    fromBlock,
  };
  if (fromBlock) {
    options.fromBlock = fromBlock;
  }
  return web3Socket.eth.subscribe('logs', options, (err, res) => {
    if (err) {
      console.error(err);
    }
  });
};