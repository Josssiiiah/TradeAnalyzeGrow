// app/routes/app/tradelog/$date.tsx
import { json, Link, useLoaderData } from "@remix-run/react";
import { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { doTheDbThing } from "lib/dbThing";
import { trades } from "~/drizzle/schema.server";
import { eq } from "drizzle-orm/expressions";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { format, parseISO } from "date-fns";

// Define the type for the individual trade data
type IndividualTrade = {
  ticker: string;
  strike: string;
  type: string;
  outcome: string;
  profit_loss: number;
  duration: string;
  buy: { price: number; quantity: number; timestamp: string }[];
  sell: { price: number; quantity: number; timestamp: string }[];
};

export async function loader({ params, context }: LoaderFunctionArgs) {
  const { db } = await doTheDbThing({ context } as any);
  const tradeDate = params.date;

  if (!tradeDate) {
    throw new Response("Date parameter is missing", { status: 400 });
  }

  const tradeArray = await db
    .select({
      id: trades.id,
      date: trades.date,
      dailyProfitLoss: trades.dailyProfitLoss,
      winRate: trades.winRate,
      averageProfitLoss: trades.averageProfitLoss,
      largestProfit: trades.largestProfit,
      largestLoss: trades.largestLoss,
      trades: trades.trades as any,
    })
    .from(trades)
    .where(eq(trades.date, tradeDate))
    .all();

  if (tradeArray.length === 0) {
    throw new Response("Trade not found", {
      status: 404,
    });
  }

  const trade = tradeArray[0];
  trade.trades = JSON.parse(trade.trades);

  return json({ trade });
}

const columnHelper = createColumnHelper<IndividualTrade>();

const columns = [
  columnHelper.accessor("ticker", {
    header: "Ticker",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("strike", {
    header: "Strike",
    cell: (info) => Number(info.getValue()),
  }),
  columnHelper.accessor("type", {
    header: "Type",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("outcome", {
    header: "Outcome",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("profit_loss", {
    header: "Profit/Loss",
    cell: (info) => `$${info.getValue().toFixed(2)}`,
  }),
  columnHelper.accessor("duration", {
    header: "Duration",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor((row) => row.buy[0].timestamp, {
    id: "buyTimestamp",
    header: "Buy Timestamp",
    cell: (info) => format(parseISO(info.getValue()), "hh:mm:ss a"),
  }),
  columnHelper.accessor((row) => row.sell[0].timestamp, {
    id: "sellTimestamp",
    header: "Sell Timestamp",
    cell: (info) => format(parseISO(info.getValue()), "hh:mm:ss a"),
  }),
];

export default function TradeDetails() {
  const { trade }: any = useLoaderData();

  const formattedDate = format(parseISO(trade.date), "EEEE, MMMM d");

  const table = useReactTable({
    data: trade.trades,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex mx-auto max-w-[2000px] w-full flex-col gap-8 p-10 bg-gray-200">
      <div className="flex items-center justify-between pb-6">
        <Link to="/app/tradelog" className="text-blue-500 underline text-2xl">
          Back
        </Link>
        <h1 className="text-4xl font-bold text-center w-full pr-[52px]">
          {formattedDate}
        </h1>
      </div>

      <div className="bg-white border border-gray-300 rounded-lg shadow-md p-4">
        <p>
          <strong>Date:</strong> {trade.date}
        </p>
        <p>
          <strong>Daily Profit/Loss:</strong> $
          {trade.dailyProfitLoss.toFixed(2)}
        </p>
        <p>
          <strong>Win Rate:</strong> {trade.winRate}
        </p>
        <p>
          <strong>Average Profit/Loss:</strong> $
          {trade.averageProfitLoss.toFixed(2)}
        </p>
        <p>
          <strong>Largest Profit:</strong> ${trade.largestProfit.toFixed(2)}
        </p>
        <p>
          <strong>Largest Loss:</strong> ${trade.largestLoss.toFixed(2)}
        </p>
        <h2 className="text-2xl font-semibold py-4 text-center">Trades</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300 rounded-lg shadow-md">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="bg-gray-100 border-b">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="p-4 text-left text-gray-700 font-medium"
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b hover:opacity-80 ${
                    row.original.profit_loss > 0
                      ? "bg-green-100"
                      : row.original.profit_loss < 0
                      ? "bg-red-100"
                      : "bg-gray-100"
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="p-4 text-gray-700">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
