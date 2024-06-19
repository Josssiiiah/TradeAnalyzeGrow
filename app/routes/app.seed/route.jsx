import axios from "axios";
import { doTheDBThing } from "../../lib/dbThing.tsx";
import { trades } from "../../drizzle/schema.server.ts";
import { Form } from "@remix-run/react";
import { doTheAuthThing } from "lib/authThing.tsx";




// Calculate trade duration given a closed session, returns "0:00"
function tradeDuration(session) {
  const buyTimes = session.buy.map(b => new Date(b.timestamp).getTime());
  const sellTimes = session.sell.map(s => new Date(s.timestamp).getTime());
  const minBuyTime = Math.min(...buyTimes);
  const maxSellTime = Math.max(...sellTimes);
  
  const durationInSeconds = (maxSellTime - minBuyTime) / 1000;
  const minutes = Math.floor(durationInSeconds / 60);
  const seconds = Math.floor(durationInSeconds % 60);
  
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// Most recent attempt at formatting the trade data returned by fetchData
function organizeTrades(trades) {
  const parseDate = timestamp => timestamp.split('T')[0];

  // Initialize the structure to store organized trades by dates
  const organizedTrades = {
    "All time stats": {
      totalTrades: 0,
      allTimeProfitLoss: 0,
      winRate: 0,
      averageProfitLoss: 0,
      largestProfit: -Infinity,
      largestLoss: Infinity
    }
  };

  trades.forEach(trade => {
    const tradeDate = parseDate(trade.created_at);
    if (!organizedTrades[tradeDate]) {
      organizedTrades[tradeDate] = {
        dailyProfitLoss: 0, // Initialize daily profit/loss  
        winRate: 0,
        averageProfitLoss: 0,
        largestProfit: -Infinity,
        largestLoss: Infinity,
        trades: [],
      
      };
    }

    trade.legs.forEach(leg => {
      leg.executions.forEach(execution => {
        const symbol = trade.chain_symbol;
        const optionType = leg.option_type;
        const strikePrice = leg.strike_price;
        const side = leg.side;
        const detail = {
          price: parseFloat(execution.price),
          quantity: parseFloat(execution.quantity),
          timestamp: execution.timestamp
        };

        // Find or create a trade session
        let session = organizedTrades[tradeDate].trades.find(session =>
          session.ticker === symbol && session.type === optionType &&
          session.strike === strikePrice && !session.closed);

        // Determine if this is a new session
        if (!session) {
          session = {
            ticker: symbol,
            strike: strikePrice,
            type: optionType,
            outcome: "",
            profit_loss: 0,
            duration: "0:00",
            buy: [],
            sell: [],
          };
          organizedTrades[tradeDate].trades.push(session);
        }

        // Append to respective side array
        if (side === 'buy') {
          session.buy.push(detail);
        } else if (side === 'sell') {
          session.sell.push(detail);
        }

        if (session.buy.length > 0 && session.sell.length > 0) {
          const totalBuyValue = session.buy.reduce((sum, b) => sum + b.price * b.quantity, 0).toFixed(2);
          const totalSellValue = session.sell.reduce((sum, s) => sum + s.price * s.quantity, 0).toFixed(2);
          session.profit_loss = (totalSellValue - totalBuyValue).toFixed(2);
          session.outcome = session.profit_loss > 0 ? "profit" : (session.profit_loss < 0 ? "loss" : "break-even");
          session.duration = tradeDuration(session);
        }

        const totalBought = session.buy.reduce((sum, b) => sum + b.quantity, 0);
        const totalSold = session.sell.reduce((sum, s) => sum + s.quantity, 0);
        if (totalBought === totalSold) {
          session.closed = true;
          organizedTrades[tradeDate].dailyProfitLoss += parseFloat(session.profit_loss);
          organizedTrades["All time stats"].allTimeProfitLoss += parseFloat(session.profit_loss);
          session.profit_loss = parseFloat(session.profit_loss).toFixed(2) * 100;

          // Update metrics for the day
          if (session.profit_loss > 0) {
            organizedTrades[tradeDate].winRate += 1;
            organizedTrades["All time stats"].winRate += 1;
          }
          organizedTrades[tradeDate].averageProfitLoss += parseFloat(session.profit_loss);
          organizedTrades["All time stats"].averageProfitLoss += parseFloat(session.profit_loss);
          organizedTrades["All time stats"].totalTrades += 1;
          if (parseFloat(session.profit_loss) > organizedTrades[tradeDate].largestProfit) {
            organizedTrades[tradeDate].largestProfit = parseFloat(session.profit_loss);
          }
          if (parseFloat(session.profit_loss) < organizedTrades[tradeDate].largestLoss) {
            organizedTrades[tradeDate].largestLoss = parseFloat(session.profit_loss);
          }
          if (parseFloat(session.profit_loss) > organizedTrades["All time stats"].largestProfit) {
            organizedTrades["All time stats"].largestProfit = parseFloat(session.profit_loss);
          }
          if (parseFloat(session.profit_loss) < organizedTrades["All time stats"].largestLoss) {
            organizedTrades["All time stats"].largestLoss = parseFloat(session.profit_loss);
          }
        }
      });
    });
  });

  // Finalize daily stats
  Object.keys(organizedTrades).forEach(date => {
    if (date !== "All time stats") {
      const dayTrades = organizedTrades[date].trades;
      const totalTrades = dayTrades.length;
      organizedTrades[date].winRate = totalTrades ? (organizedTrades[date].winRate / totalTrades * 100).toFixed(0) + "%" : "0.00%";
      organizedTrades[date].averageProfitLoss = totalTrades ? (organizedTrades[date].averageProfitLoss / totalTrades).toFixed(2) : "0.00";
      organizedTrades[date].largestProfit = organizedTrades[date].largestProfit === -Infinity ? "0.00" : organizedTrades[date].largestProfit.toFixed(2);
      organizedTrades[date].largestLoss = organizedTrades[date].largestLoss === Infinity ? "0.00" : organizedTrades[date].largestLoss.toFixed(2);

      // Filter to return only closed sessions, and remove the internal 'closed' property
      organizedTrades[date].trades = dayTrades.filter(trade => trade.closed).map(trade => {
        const { closed, ...tradeDetails } = trade;
        return tradeDetails;
      });

      // Format daily profit/loss to two decimal places
      organizedTrades[date].dailyProfitLoss = parseFloat(organizedTrades[date].dailyProfitLoss.toFixed(2) * 100);
    }
  });

  // Finalize all-time stats
  const allTimeStats = organizedTrades["All time stats"];
  allTimeStats.winRate = allTimeStats.totalTrades ? (allTimeStats.winRate / allTimeStats.totalTrades * 100).toFixed(2) + "%" : "0.00%";
  allTimeStats.averageProfitLoss = allTimeStats.totalTrades ? (allTimeStats.averageProfitLoss / allTimeStats.totalTrades).toFixed(2) * 100 : "0.00";
  allTimeStats.largestProfit = allTimeStats.largestProfit === -Infinity ? "0.00" : allTimeStats.largestProfit.toFixed(2);
  allTimeStats.largestLoss = allTimeStats.largestLoss === Infinity ? "0.00" : allTimeStats.largestLoss.toFixed(2);
  allTimeStats.allTimeProfitLoss = allTimeStats.allTimeProfitLoss.toFixed(2) * 100;

  return organizedTrades;
}

export default function SeedDatabase() {
  return (
    <div>
      <h1>Seed Database</h1>
      <Form method="post" action="/app/seed">
        <button type="submit">Seed Database</button>
      </Form>
      <Form method="POST">
        <input type="hidden" name="action" value="clear" />
        <button
          type="submit"
          style={{ backgroundColor: "red", color: "white" }}
        >
          Delete All Resources
        </button>
      </Form>
    </div>
  );
}

export const action = async ({ request, context }) => {

  const { db, user}  = await doTheAuthThing ({ request, context });
  const userId = user.id;
  const formData = await request.formData();
  const token = formData.get("token");


  let auth_token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJkY3QiOjE3MTEwOTI5NTAsImRldmljZV9oYXNoIjoiM2JiN2FiODQxZDdiYmQ4NGVlYmM5ZGJkODZhNjJhMTciLCJleHAiOjE3MTk0MjA2ODYsImxldmVsMl9hY2Nlc3MiOmZhbHNlLCJtZXRhIjp7Im9pZCI6ImM4MlNIMFdaT3NhYk9YR1Ayc3hxY2ozNEZ4a3ZmbldSWkJLbEJqRlMiLCJvbiI6IlJvYmluaG9vZCJ9LCJvcHRpb25zIjp0cnVlLCJzY29wZSI6ImludGVybmFsIiwic2VydmljZV9yZWNvcmRzIjpbeyJoYWx0ZWQiOmZhbHNlLCJzZXJ2aWNlIjoibnVtbXVzX3VzIiwic2hhcmRfaWQiOjEsInN0YXRlIjoiYXZhaWxhYmxlIn0seyJoYWx0ZWQiOmZhbHNlLCJzZXJ2aWNlIjoiYnJva2ViYWNrX3VzIiwic2hhcmRfaWQiOjgsInN0YXRlIjoiYXZhaWxhYmxlIn1dLCJzcm0iOnsiYiI6eyJobCI6ZmFsc2UsInIiOiJ1cyIsInNpZCI6OH0sIm4iOnsiaGwiOmZhbHNlLCJyIjoidXMiLCJzaWQiOjF9fSwidG9rZW4iOiI4TTRpQUZaMk1tTkh4cHdQOXlKMnVDc2RVTW5RdmIiLCJ1c2VyX2lkIjoiZmVlM2NmYTMtMTFlYi00NTMxLWIzMjctNWMzNWYzNzg0Y2QzIiwidXNlcl9vcmlnaW4iOiJVUyJ9.H8Biek_VYhAPsXssu9gKUdQySUWxfFLDKmbtJoY1_F9ccv4v23KUmpfDbLezHxn-dCpdaaNS0Pu-DCeFratKmrZmqkR5VwunQitjkCpzVDr2qhOr3fY9sm3ISA0F9lnRjyVvYaa5Su36UP9swFhOqNEhXNQClogChStfQVf5Yc2Ude11SkY6GqQNd5xPYRu0wwkgVpYGITjXSvc3v0CLlEvfSW3_e_QJgjdXvP2hdS1xGVWSCnViOYoAxvEjJcFjjHy9LHjKcp3y7BZ9AgHBg9krEI4sMblhRMpyPI2bDDp0OAKrvF1Do958d7r4iwFgfnwK6igNLc6T6dpmyVTKSw"

  if (token) {
    auth_token = token;
  }

  const actionType = formData.get("action");

  // Check if the clear action has been triggered
  if (actionType === "clear") {
    // Perform database clear operation
    console.log("deleting database sensei...")
    await db.delete(trades);
    console.log("Database cleared")
    return ({ message: "Database cleared" }, { status: 200 });
  }

  console.log("seeding database sensei...")

  const options = {
    method: "GET",
    url: "https://api.robinhood.com/options/orders/",
    headers: {
      Accept: "*/*",
      Authorization: `Bearer ${auth_token}`,
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "en-US,en;q=1",
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Robinhood-API-Version": "1.315.0",
      Connection: "keep-alive",
      "User-Agent": "*",
    },
  };

  const response = await axios(options);
  const allTrades = response.data.results;

  const organizedTrades = organizeTrades(allTrades);

  for (const [date, dayData] of Object.entries(organizedTrades)) {
    if (date === "All time stats") {
 
   
  
      continue;
    }
  

    let { dailyProfitLoss, winRate, averageProfitLoss, largestProfit, largestLoss, trades: dailyTrades } = dayData;
    console.log("userId: ", userId)

    await db.insert(trades).values({
      date,
      user_id: userId,
      dailyProfitLoss,
      winRate,
      averageProfitLoss,
      largestProfit,
      largestLoss,
      trades: JSON.stringify(dailyTrades)
    }).execute();
  }
  
  console.log("Database seeded successfully");
  return null;
}

     // We pull all the info from db to render calendar, so all time stats would mess that up
      // let { totalTrades, allTimeProfitLoss, winRate, averageProfitLoss, largestProfit, largestLoss } = dayData;
  

      // console.log("Total trades: ", totalTrades)
      // console.log("All time profit: ", allTimeProfitLoss)

      // await db.insert(allTime).values({
      //   totalTrades,
      //   allTimeProfitLoss,
      //   winRate,
      //   averageProfitLoss,
      //   largestProfit,
      //   largestLoss
      // }).execute();