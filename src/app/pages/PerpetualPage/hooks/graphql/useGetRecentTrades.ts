import { useQuery, gql } from '@apollo/client';

/** Hook to get recents trades for right hand panel
 * Takes count as parameters: numbe of rows to return, perpetualId
 * Default is 20
 */

export function useGetRecentTrades(perpetualId: string, count: number = 20) {
  console.debug('Getting recent trades');
  const RECENT_TRADES_QUERY = gql`
    {
      trades(
        first: ${count}
        where: {
          perpetualId: "${perpetualId}"
        }
      ) {
        tradeAmount
        price
        blockTimestamp
        transaction {
          id
        }
      }
    }
  `;
  const recentTradesQuery = useQuery(RECENT_TRADES_QUERY);
  return recentTradesQuery;
}