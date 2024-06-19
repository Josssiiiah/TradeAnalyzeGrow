import { useState } from "react";
import { useNavigate } from "@remix-run/react";

export default function Calendar({
  tradeList,
}: {
  tradeList: {
    [id: string]: {
      dailyProfitLoss: number;
      winRate: string;
      averageProfitLoss: number;
      largestProfit: number;
      largestLoss: number;
      trades: any;
    };
  };
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const navigate = useNavigate();

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const days = [];
  for (let i = 0; i < daysOfWeek.length; i++) {
    days.push(
      <div
        key={i}
        className="bg-gray-200 p-2 rounded flex items-center justify-center h-[30px]"
      >
        <h2 className="text-xs">{daysOfWeek[i]}</h2>
      </div>
    );
  }

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getStartingDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const startingDay = getStartingDayOfMonth(currentMonth, currentYear);
  const cells = [];

  // Empty cells
  for (let i = 0; i < startingDay; i++) {
    cells.push(
      <div
        key={`empty-${i}`}
        className="bg-gray-100 rounded h-[75px] w-full"
      ></div>
    );
  }

  // Cells with dates
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${currentYear}-${(currentMonth + 1)
      .toString()
      .padStart(2, "0")}-${i.toString().padStart(2, "0")}`;

    const tradeInfo = tradeList[dateStr];
    let profitLoss: number | null = null;
    let tradeCount: number = 0;

    if (tradeInfo) {
      profitLoss = tradeInfo.dailyProfitLoss;
      tradeCount = tradeInfo.trades.length;
    }

    cells.push(
      <div
        key={i}
        className={`flex flex-col items-center justify-center pt-4 pr-2 rounded relative h-[75px] w-full border-2 cursor-pointer ${
          profitLoss !== null
            ? profitLoss >= 0
              ? "bg-green-500 border-green-400"
              : "bg-red-500 border-red-400"
            : "bg-gray-200"
        }`}
        onClick={() => navigate(`/app/trades/${dateStr}`)}
      >
        {/* Day (number) of the week  */}
        <p
          className="absolute top-0 right-0 p-[2px] pr-1 ml-auto"
          style={{ fontSize: "0.75rem" }}
        >
          {i}
        </p>
        {/* Profit/Loss number  */}
        {profitLoss !== null && (
          <p className="text-white text-sm ml-auto">
            {profitLoss >= 0
              ? `$${Math.floor(profitLoss)}`
              : `$${Math.floor(profitLoss)}`}
          </p>
        )}
        {/* Trade count number  */}
        {tradeCount > 0 && (
          <p
            className="bottom-0 p-[2px] text-white rounded ml-auto"
            style={{ fontSize: "0.6rem" }}
          >
            {tradeCount} trades
          </p>
        )}
      </div>
    );
  }

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  return (
    <div className="rounded">
      <div className="flex justify-between mb-4">
        <button
          className="bg-black text-white px-4 py-2 rounded"
          onClick={goToPreviousMonth}
        >
          Previous Month
        </button>
        <span className="text-xl font-bold">
          {monthNames[currentMonth]} {currentYear}
        </span>
        <button
          className="bg-black text-white px-4 py-2 rounded"
          onClick={goToNextMonth}
        >
          Next Month
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1 flex-1">{days}</div>
      <div className="grid grid-cols-7 grid-rows-5 gap-1 flex-1">{cells}</div>
    </div>
  );
}
