import { GoogleGenAI, Type, FunctionDeclaration, GenerateContentResponse } from "@google/genai";
import { getDb } from "./db";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Category A: Action/CRUD Tools
const logTransactionFunction: FunctionDeclaration = {
  name: "log_transaction",
  description: "Log a transaction (income or expense) to a specific account.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      account_name: { type: Type.STRING, description: "Name of the account (e.g., 'BDO Savings', 'GCash')" },
      amount: { type: Type.NUMBER, description: "Amount of the transaction" },
      category: { type: Type.STRING, description: "Category (e.g., 'food', 'salary')" },
      type: { type: Type.STRING, description: "'income' or 'expense'" }
    },
    required: ["account_name", "amount", "category", "type"]
  }
};

const addPortfolioPositionFunction: FunctionDeclaration = {
  name: "add_portfolio_position",
  description: "Add a stock portfolio position.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      ticker: { type: Type.STRING, description: "Stock ticker (e.g., 'AAPL')" },
      shares: { type: Type.NUMBER, description: "Number of shares" },
      buy_price_usd: { type: Type.NUMBER, description: "Average buy price in USD" }
    },
    required: ["ticker", "shares", "buy_price_usd"]
  }
};

// Category B: Analytics Tools
const compareAssetsFunction: FunctionDeclaration = {
  name: "compare_assets",
  description: "Compare two stock tickers by fetching live market data.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      ticker1: { type: Type.STRING, description: "First stock ticker" },
      ticker2: { type: Type.STRING, description: "Second stock ticker" }
    },
    required: ["ticker1", "ticker2"]
  }
};

const getSpendingSummaryFunction: FunctionDeclaration = {
  name: "get_spending_summary",
  description: "Get total spending for a category.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      category: { type: Type.STRING, description: "Category to summarize" }
    },
    required: ["category"]
  }
};

const tools = [{
  functionDeclarations: [
    logTransactionFunction, 
    addPortfolioPositionFunction,
    compareAssetsFunction,
    getSpendingSummaryFunction
  ]
}];

export async function handleAgentChat(req, res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendLog = (msg: string) => res.write(`data: {"type":"log","message":"${msg}"}\\n\\n`);
  const sendDone = (data: any) => res.write(`data: {"type":"done","data":${JSON.stringify(data)}}\\n\\n`);

  const userMessage = req.body.message;
  sendLog("> Parsing user intent...");

  try {
    const db = await getDb();
    
    // First turn
    let response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userMessage,
      config: {
        tools: tools,
        systemInstruction: "You are FinGent, an AI financial copilot. Determine if you need to use tools to answer the user's request. If logging a transaction, find the closest account. Base currency is PHP unless specified.",
      }
    });

    const functionCalls = response.functionCalls;
    let requiresRefresh = false;

    if (functionCalls && functionCalls.length > 0) {
      sendLog("> Selecting analytical tools...");
      
      const functionResponses = [];
      
      for (const call of functionCalls) {
        sendLog(`> Executing ${call.name}...`);
        let resultData = {};

        try {
          if (call.name === "log_transaction") {
            const args = call.args as any;
            const { account_name, amount, category, type } = args;
            const account = await db.get("SELECT id FROM accounts WHERE name LIKE ?", [`%${account_name}%`]);
            if (account) {
              await db.run(
                "INSERT INTO transactions (account_id, type, amount, category, date) VALUES (?, ?, ?, ?, datetime('now'))",
                [account.id, type, amount, category]
              );
              if (type === 'expense') {
                await db.run("UPDATE accounts SET balance = balance - ? WHERE id = ?", [amount, account.id]);
              } else {
                await db.run("UPDATE accounts SET balance = balance + ? WHERE id = ?", [amount, account.id]);
              }
              resultData = { success: true, message: `Logged ${type} of ${amount} to ${account_name}` };
              requiresRefresh = true;
            } else {
              resultData = { success: false, message: "Account not found" };
            }
          } else if (call.name === "compare_assets") {
             const args = call.args as any;
             const ticker1 = String(args.ticker1);
             const ticker2 = String(args.ticker2);
             sendLog("> Fetching live market comparisons...");
             const quote1: any = await yahooFinance.quote(ticker1);
             const quote2: any = await yahooFinance.quote(ticker2);
             resultData = { 
               [ticker1]: quote1.regularMarketPrice,
               [ticker2]: quote2.regularMarketPrice
             };
          } else if (call.name === "get_spending_summary") {
             const args = call.args as any;
             const { category } = args;
             const sum = await db.get("SELECT SUM(amount) as total FROM transactions WHERE category = ? AND type = 'expense'", [category]);
             resultData = { category, total: sum.total || 0 };
          } else {
             resultData = { success: false, message: "Tool not implemented fully yet" };
          }
        } catch(e) {
          resultData = { success: false, error: e.message };
        }

        functionResponses.push({
          functionResponse: {
            name: call.name,
            response: resultData
          }
        });
      }

      sendLog("> Synthesizing final response...");
      
      const secondTurnResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
           { role: "user", parts: [{ text: userMessage }] },
           { role: "model", parts: response.candidates[0].content.parts },
           { role: "user", parts: functionResponses }
        ],
        config: {
           tools: tools
        }
      });

      sendDone({
         text: secondTurnResponse.text,
         requires_refresh: requiresRefresh
      });

    } else {
       sendDone({
         text: response.text,
         requires_refresh: false
       });
    }

  } catch(e) {
    console.error(e);
    sendDone({ text: "Sorry, I encountered an error.", error: e.message });
  }

  res.end();
}
