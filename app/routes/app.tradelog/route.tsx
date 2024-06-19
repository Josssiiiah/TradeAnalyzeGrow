import React from "react";
import { json, Link, useLoaderData } from "@remix-run/react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { trades } from "~/drizzle/schema.server";
import { doTheAuthThing } from "lib/authThing";
import {eq} from "drizzle-orm/expressions"


// Define the type for the trade data
type Trade = {
  id: number;
  date: string;
  dailyProfitLoss: number;
  winRate: string;
  averageProfitLoss: number;
  largestProfit: number;
  largestLoss: number;
  trades: any[];
};

// Define the type for the loader data
type LoaderData = {
  resourceList: Trade[];
};

// -----------------------------------------------------------------------------
// LOADER
// -----------------------------------------------------------------------------

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { user, db } = await doTheAuthThing({ request,context } as any);

  const resourceList = await db
    .select({
      id: trades.id,
      userId: trades.user_id,
      date: trades.date,
      dailyProfitLoss: trades.dailyProfitLoss,
      winRate: trades.winRate,
      averageProfitLoss: trades.averageProfitLoss,
      largestProfit: trades.largestProfit,
      largestLoss: trades.largestLoss,
      trades: trades.trades as any,
    })
    .from(trades)
    .where(eq(trades.user_id, user!.id))

    .orderBy(trades.id);

  return json({
    resourceList,
  });
}

const columnHelper = createColumnHelper<Trade>();

const columns = [
  columnHelper.accessor("date", {
    header: "Date",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("dailyProfitLoss", {
    header: "Daily Profit/Loss",
    cell: (info) => `$${info.getValue().toFixed(2)}`, // Format as dollar amount
  }),
  columnHelper.accessor("winRate", {
    header: "Win Rate",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("averageProfitLoss", {
    header: "Average Profit/Loss",
    cell: (info) => `$${info.getValue().toFixed(2)}`, // Format as dollar amount
  }),
  columnHelper.accessor("largestProfit", {
    header: "Largest Profit",
    cell: (info) => `$${info.getValue().toFixed(2)}`, // Format as dollar amount
  }),
  columnHelper.accessor("largestLoss", {
    header: "Largest Loss",
    cell: (info) => `$${info.getValue().toFixed(2)}`, // Format as dollar amount
  }),
];

// -----------------------------------------------------------------------------
// Tradelog
// -----------------------------------------------------------------------------

export default function TradeLog() {
  const { resourceList } = useLoaderData<LoaderData>();

  const table = useReactTable({
    data: resourceList,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex mx-auto max-w-[2000px] w-full flex-col gap-8 p-10 bg-gray-200">
      <h1 className="text-4xl font-bold text-center">Trade Log</h1>
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
              <tr key={row.id} className="border-b hover:bg-gray-50">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="p-4 text-gray-700">
                    <Link to={`/app/trades/${row.original.date}`}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </Link>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
