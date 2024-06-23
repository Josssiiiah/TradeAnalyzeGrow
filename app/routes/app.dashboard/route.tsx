import React, { useEffect, useRef } from "react";
import { json, useLoaderData } from "@remix-run/react";
import { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { Google } from "arctic"; // Ensure this is correctly imported
import { doTheDbThing } from "lib/dbThing";
import { trades } from "../../drizzle/schema.server";
import { doTheAuthThing } from "lib/authThing";
import {
  Chart,
  ArcElement,
  Tooltip,
  Legend,
  DoughnutController,
} from "chart.js";
import { eq } from "drizzle-orm/expressions";
import { Button } from "~/components/ui/button";
import Calendar from "./calendar";
import Recent from "./recent";

Chart.register(ArcElement, Tooltip, Legend, DoughnutController);

type Trade = {
  ticker: string;
  strike: string;
  type: string;
  outcome: string;
  profit_loss: number;
  duration: string;
  buy: any[];
  sell: any[];
};

type TradeDayData = {
  dailyProfitLoss: number;
  winRate: string;
  averageProfitLoss: number;
  largestProfit: number;
  largestLoss: number;
  trades: Trade[];
};

type TradeList = {
  [date: string]: {
    dailyProfitLoss: number;
    winRate: string;
    averageProfitLoss: number;
    largestProfit: number;
    largestLoss: number;
    trades: any[];
  };
};

// Transforming data to the expected format
function transformData(resourceList: any[]): {
  tradeList: TradeList;
  netProfitLoss: number;
  positiveDays: number;
  averageProfitLoss: number;
  tradeWinPercentage: string;
  positiveTrades: number;
  breakEvenTrades: number;
  negativeTrades: number;
} {
  const tradeList: TradeList = {};
  let netProfitLoss = 0;
  let positiveDays = 0;
  let totalDays = 0;
  let totalTrades = 0;
  let winningTrades = 0;
  let breakEvenTrades = 0;
  let losingTrades = 0;

  resourceList.forEach((item) => {
    const tradesData = JSON.parse(item.trades || "[]");

    tradeList[item.date] = {
      dailyProfitLoss: item.dailyProfitLoss,
      winRate: item.winRate,
      averageProfitLoss: item.averageProfitLoss,
      largestProfit: item.largestProfit,
      largestLoss: item.largestLoss,
      trades: tradesData,
    };

    netProfitLoss += item.dailyProfitLoss;
    if (item.dailyProfitLoss >= 0) {
      positiveDays += 1;
    }
    totalDays += 1;

    tradesData.forEach((trade: any) => {
      totalTrades += 1;
      if (trade.profit_loss > 0) {
        winningTrades += 1;
      } else if (trade.profit_loss === 0) {
        breakEvenTrades += 1;
      } else {
        losingTrades += 1;
      }
    });
  });

  const averageProfitLoss = totalDays ? netProfitLoss / totalDays : 0;
  const num = totalTrades ? (winningTrades / totalTrades) * 100 : 0;

  const tradeWinPercentage = num.toFixed(0);

  return {
    tradeList,
    netProfitLoss,
    positiveDays,
    averageProfitLoss,
    tradeWinPercentage,
    positiveTrades: winningTrades,
    breakEvenTrades: breakEvenTrades,
    negativeTrades: losingTrades,
  };
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { db, user } = await doTheAuthThing({ request, context } as any);

  const resourceList = await db
    .select({
      id: trades.id,
      user_id: trades.user_id,
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

  let recentTrades: any = await db
    .select({
      id: trades.id,
      user_id: trades.user_id,
      date: trades.date,
      trades: trades.trades as any,
    })
    .from(trades)
    .where(eq(trades.user_id, user!.id))
    .limit(2)
    .orderBy(trades.id);

  const {
    tradeList,
    netProfitLoss,
    positiveDays,
    averageProfitLoss,
    tradeWinPercentage,
    positiveTrades,
    breakEvenTrades,
    negativeTrades,
  } = transformData(resourceList);

  return json({
    tradeList,
    netProfitLoss,
    positiveDays,
    averageProfitLoss,
    tradeWinPercentage,
    recentTrades,
    positiveTrades,
    breakEvenTrades,
    negativeTrades,
  });
}

export default function Dashboard() {
  const {
    tradeList,
    netProfitLoss,
    positiveDays,
    averageProfitLoss,
    tradeWinPercentage,
    recentTrades,
    positiveTrades,
    breakEvenTrades,
    negativeTrades,
  } = useLoaderData<typeof loader>();

  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<Chart<"doughnut"> | null>(null);

  useEffect(() => {
    if (chartRef.current) {
      const ctx = chartRef.current.getContext("2d");
      if (ctx) {
        // Destroy previous chart instance if it exists
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }
        // Create new chart instance with custom plugin for labels
        chartInstance.current = new Chart(ctx, {
          type: "doughnut",
          data: {
            datasets: [
              {
                data: [positiveTrades, breakEvenTrades, negativeTrades],
                backgroundColor: ["#10B981", "#FCD34D", "#EF4444"],
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            circumference: 180,
            rotation: -90,
            cutout: "80%",
            plugins: {
              tooltip: {
                callbacks: {
                  label: function (tooltipItem) {
                    const data =
                      tooltipItem.dataset.data[tooltipItem.dataIndex];
                    const label = tooltipItem.label;
                    return `${label}: ${data}`;
                  },
                },
              },
            },
          },
          plugins: [
            {
              id: "customLabels",
              afterDraw: function (chart) {
                const ctx = chart.ctx;
                const chartArea = chart.chartArea;
                const x = (chartArea.left + chartArea.right) / 2;
                const y = chartArea.bottom + 20;

                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.font = "bold 14px Arial";

                const labels = [
                  { color: "#10B981", text: positiveTrades, offset: -60 },
                  { color: "#FCD34D", text: breakEvenTrades, offset: 0 },
                  { color: "#EF4444", text: negativeTrades, offset: 60 },
                ];

                labels.forEach((label) => {
                  ctx.fillStyle = label.color;
                  ctx.fillText(label.text.toString(), x + label.offset, y);
                });
              },
            },
          ],
        });
      }
    }
  }, [positiveTrades, breakEvenTrades, negativeTrades]);

  return (
    <div className="items-left flex mx-auto max-w-[2000px] w-full flex-col gap-8 p-10 bg-gray-200">
      <h1 className="text-4xl font-bold text-center">Dashboard</h1>

      <div className="flex flex-row justify-between gap-6 rounded-xl">
        <div className=" border flex items-center justify-center gap-8 p-4 rounded-xl bg-white shadow w-full">
          {/* Net P&L */}
          <div className="flex flex-col flex-1 justify-center">
            <h1>Net P&L</h1>
            <div className="text-2xl font-bold">
              <p>${netProfitLoss}</p>
            </div>
          </div>
        </div>

        <div className=" border flex items-center justify-center gap-8 p-4 rounded-xl bg-white shadow w-full">
          {/* Positive Days */}
          <div className="flex flex-col flex-1 justify-center">
            <h1>Positive Days</h1>
            <div className="text-2xl font-bold">
              <p>{positiveDays}</p>
            </div>
          </div>
        </div>

        <div className="border p-4 rounded-xl bg-white shadow w-full">
          <div className="flex items-center gap-8">
            {/* Left  */}
            <div className="flex flex-col flex-1 justify-center">
              <h1>Win Rate %</h1>
              {/* Trade percentage  */}
              <div className="text-2xl font-bold">
                <p>{tradeWinPercentage}%</p>
              </div>
            </div>
            {/* Right  */}
            <div className="flex flex-col flex-1">
              {/* Chart  */}
              <div>
                <canvas
                  ref={chartRef}
                  style={{ width: "100%", height: "100px" }}
                ></canvas>
              </div>
            </div>
          </div>
        </div>

        <div className=" border flex items-center justify-center gap-8 p-4 rounded-xl bg-white shadow w-full">
          {/* Avg Profit/Loss */}
          <div className="flex flex-col flex-1 justify-center">
            <h1>Avg Profit/Loss</h1>
            <div className="text-2xl font-bold">
              <p>${averageProfitLoss.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 rounded-xl">
        <div className="flex-2 bg-white rounded-xl py-10 shadow-xl">
          <div className="flex w-full">
            <Recent trades={recentTrades} />
          </div>
        </div>
        <div className="flex-1 bg-white rounded-xl px-10 py-10 shadow-xl">
          <Calendar tradeList={tradeList} />
        </div>
      </div>
    </div>
  );
}
