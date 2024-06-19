type Trade = {
  id: number;
  user_id: string;
  date: string;
  trades: string; // trades is stored as a JSON string in the database
};

type RecentTradesProps = {
  trades: Trade[];
};

export default function RecentTrades({ trades }: RecentTradesProps) {
  return (
    <div className="flex flex-col w-full">
      <h1 className="text-2xl font-bold text-center">Recent Trades</h1>
      <div className="px-6 w-full">
        <div className="flex text-center justify-between font-bold w-full gap-12 px-2 py-4">
          <p className="w-[155px]">Close Date</p>
          <p className="w-1/3">Symbol</p>
          <p className="w-1/3">Net P&L</p>
        </div>
        {trades.map((trade) => {
          const parsedTrades = JSON.parse(trade.trades!) as Array<{
            ticker: string;
            profit_loss: number;
            sell: Array<{ timestamp: string }>;
          }>;

          return parsedTrades.map((t, index) => (
            <div
              className="flex text-center justify-between gap-8 px-2 py-2"
              key={`${trade.id}-${index}`}
            >
              <p className="w-[155px] pr-4">
                {new Date(t.sell[t.sell.length - 1].timestamp).toLocaleString()}
              </p>
              <p className="w-1/3 pr-6">{t.ticker}</p>
              <p className="w-1/3">
                <span className="">{`$${t.profit_loss.toFixed(2)}`}</span>
              </p>
            </div>
          ));
        })}
      </div>
    </div>
  );
}

const mockTrades = [
  {
    symbol: "AAPL",
    closeDate: "2023-06-01",
    pnl: 150.75,
  },
  {
    symbol: "GOOGL",
    closeDate: "2023-06-02",
    pnl: -80.5,
  },
  {
    symbol: "AMZN",
    closeDate: "2023-06-03",
    pnl: 250.25,
  },
  {
    symbol: "MSFT",
    closeDate: "2023-06-04",
    pnl: 100.0,
  },
  {
    symbol: "TSLA",
    closeDate: "2023-06-05",
    pnl: -200.0,
  },
];
