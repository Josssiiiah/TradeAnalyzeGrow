import axios from "axios";
import fs from "fs";




// Exchange username, password, and MFA code for auth_token 
async function retrieve_auth_token() {
  const RH_USERNAME = "josiahgriggs8@gmail.com"
  const RH_PASSWORD = "Coder1633<><"
  const mfa = "155621"

  const options = {
    method: "POST",
    url: "https://api.robinhood.com/oauth2/token/",
    headers: {
      Accept: "*/*",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "en-US,en;q=1",
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Robinhood-API-Version": "1.315.0",
      Connection: "keep-alive",
      "User-Agent": "*",
    },
    data: {
      client_id: "c82SH0WZOsabOXGP2sxqcj34FxkvfnWRZBKlBjFS",
      grant_type: "password",
      password: RH_PASSWORD,
      scope: "internal",
      username: RH_USERNAME,
      challenge_type: "sms",
      device_token: "fe3e28aa-4914-0cbb-d631-110568146b29",
      mfa_code: mfa,
    },
  };

  const response = await axios(options)
  console.log(response)
}

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
      organizedTrades[date].averageProfitLoss = totalTrades ? (organizedTrades[date].averageProfitLoss / totalTrades).toFixed(2) * 100 : "0.00";
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


// Use auth token to make request for one page of trading data and log it  
async function fetchData() {
  const auth_token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJkY3QiOjE3MTEwOTI5NTAsImRldmljZV9oYXNoIjoiM2JiN2FiODQxZDdiYmQ4NGVlYmM5ZGJkODZhNjJhMTciLCJleHAiOjE3MTk0MjA2ODYsImxldmVsMl9hY2Nlc3MiOmZhbHNlLCJtZXRhIjp7Im9pZCI6ImM4MlNIMFdaT3NhYk9YR1Ayc3hxY2ozNEZ4a3ZmbldSWkJLbEJqRlMiLCJvbiI6IlJvYmluaG9vZCJ9LCJvcHRpb25zIjp0cnVlLCJzY29wZSI6ImludGVybmFsIiwic2VydmljZV9yZWNvcmRzIjpbeyJoYWx0ZWQiOmZhbHNlLCJzZXJ2aWNlIjoibnVtbXVzX3VzIiwic2hhcmRfaWQiOjEsInN0YXRlIjoiYXZhaWxhYmxlIn0seyJoYWx0ZWQiOmZhbHNlLCJzZXJ2aWNlIjoiYnJva2ViYWNrX3VzIiwic2hhcmRfaWQiOjgsInN0YXRlIjoiYXZhaWxhYmxlIn1dLCJzcm0iOnsiYiI6eyJobCI6ZmFsc2UsInIiOiJ1cyIsInNpZCI6OH0sIm4iOnsiaGwiOmZhbHNlLCJyIjoidXMiLCJzaWQiOjF9fSwidG9rZW4iOiI4TTRpQUZaMk1tTkh4cHdQOXlKMnVDc2RVTW5RdmIiLCJ1c2VyX2lkIjoiZmVlM2NmYTMtMTFlYi00NTMxLWIzMjctNWMzNWYzNzg0Y2QzIiwidXNlcl9vcmlnaW4iOiJVUyJ9.H8Biek_VYhAPsXssu9gKUdQySUWxfFLDKmbtJoY1_F9ccv4v23KUmpfDbLezHxn-dCpdaaNS0Pu-DCeFratKmrZmqkR5VwunQitjkCpzVDr2qhOr3fY9sm3ISA0F9lnRjyVvYaa5Su36UP9swFhOqNEhXNQClogChStfQVf5Yc2Ude11SkY6GqQNd5xPYRu0wwkgVpYGITjXSvc3v0CLlEvfSW3_e_QJgjdXvP2hdS1xGVWSCnViOYoAxvEjJcFjjHy9LHjKcp3y7BZ9AgHBg9krEI4sMblhRMpyPI2bDDp0OAKrvF1Do958d7r4iwFgfnwK6igNLc6T6dpmyVTKSw"
  // make request for trades
  const allTrades = [];
  let nextUrl = "https://api.robinhood.com/options/orders/";

  const options = {
    method: "GET",
    url: nextUrl,
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
  const trades = response.data.results;
  allTrades.push(...trades);

  // optional modifier to only return trades from the last n days, 
  // but you have to setup multiple requests like in writeAllData()
  const finalFullTrades = [];
  const now = new Date();
  for (const fullTrade of allTrades) {
    const date = new Date(fullTrade.last_transaction_at);
    if (now - date <= 8 * 24 * 60 * 60 * 1000) {
      finalFullTrades.push(fullTrade);
    }
  }

  const processed_trades = organizeTrades(allTrades)

  console.log("Trading Information: ", processed_trades)

}

// Writes all time trading data to a file called 'trades.json'
async function writeAllData() {
  const auth_token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJkY3QiOjE3MTEwOTI5NTAsImRldmljZV9oYXNoIjoiM2JiN2FiODQxZDdiYmQ4NGVlYmM5ZGJkODZhNjJhMTciLCJleHAiOjE3MTk0MjA2ODYsImxldmVsMl9hY2Nlc3MiOmZhbHNlLCJtZXRhIjp7Im9pZCI6ImM4MlNIMFdaT3NhYk9YR1Ayc3hxY2ozNEZ4a3ZmbldSWkJLbEJqRlMiLCJvbiI6IlJvYmluaG9vZCJ9LCJvcHRpb25zIjp0cnVlLCJzY29wZSI6ImludGVybmFsIiwic2VydmljZV9yZWNvcmRzIjpbeyJoYWx0ZWQiOmZhbHNlLCJzZXJ2aWNlIjoibnVtbXVzX3VzIiwic2hhcmRfaWQiOjEsInN0YXRlIjoiYXZhaWxhYmxlIn0seyJoYWx0ZWQiOmZhbHNlLCJzZXJ2aWNlIjoiYnJva2ViYWNrX3VzIiwic2hhcmRfaWQiOjgsInN0YXRlIjoiYXZhaWxhYmxlIn1dLCJzcm0iOnsiYiI6eyJobCI6ZmFsc2UsInIiOiJ1cyIsInNpZCI6OH0sIm4iOnsiaGwiOmZhbHNlLCJyIjoidXMiLCJzaWQiOjF9fSwidG9rZW4iOiI4TTRpQUZaMk1tTkh4cHdQOXlKMnVDc2RVTW5RdmIiLCJ1c2VyX2lkIjoiZmVlM2NmYTMtMTFlYi00NTMxLWIzMjctNWMzNWYzNzg0Y2QzIiwidXNlcl9vcmlnaW4iOiJVUyJ9.H8Biek_VYhAPsXssu9gKUdQySUWxfFLDKmbtJoY1_F9ccv4v23KUmpfDbLezHxn-dCpdaaNS0Pu-DCeFratKmrZmqkR5VwunQitjkCpzVDr2qhOr3fY9sm3ISA0F9lnRjyVvYaa5Su36UP9swFhOqNEhXNQClogChStfQVf5Yc2Ude11SkY6GqQNd5xPYRu0wwkgVpYGITjXSvc3v0CLlEvfSW3_e_QJgjdXvP2hdS1xGVWSCnViOYoAxvEjJcFjjHy9LHjKcp3y7BZ9AgHBg9krEI4sMblhRMpyPI2bDDp0OAKrvF1Do958d7r4iwFgfnwK6igNLc6T6dpmyVTKSw"

  // make request for trades
  const allTrades = [];
  let nextUrl = "https://api.robinhood.com/options/orders/";

  while (nextUrl) {
    const options = {
      method: "GET",
      url: nextUrl,
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
    const trades = response.data.results;
    allTrades.push(...trades);

    nextUrl = response.data.next;
  }

  const finalFullTrades = [];
  const now = new Date();
  for (const fullTrade of allTrades) {
    const date = new Date(fullTrade.last_transaction_at);
    if (now - date <= 8 * 24 * 60 * 60 * 1000) {
      finalFullTrades.push(fullTrade);
    }
  }

  const processed_trades = organizeTrades(allTrades)

  // Write each trade to txt file
  fs.writeFile('trades.json', JSON.stringify(processed_trades, null, 2), (err) => {
    if (err) {
      console.error('Error writing trades to file:', err);
    } else {
      console.log('Trades written to trades.json');
    }
  });
}







// retrieve_auth_token();
// fetchData();
// writeAllData();