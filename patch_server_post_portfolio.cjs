const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const oldPost = `app.post("/api/portfolios", async (req, res) => {
    try {
      const db = await getDb();
      const { type, name, invested, current_value: input_current_value, shares, avg_price, ticker } = req.body;`;

const newPost = `app.post("/api/portfolios", async (req, res) => {
    try {
      const db = await getDb();
      const { type, name, invested, current_value: input_current_value, shares, avg_price, ticker, currency = 'USD' } = req.body;`;

content = content.replace(oldPost, newPost);

const oldInsert = `const result = await db.run(
        "INSERT INTO portfolios (type, name, invested, current_value, shares, avg_price, ticker) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [type, name, invested, current_value, shares, avg_price, ticker]
      );`;

const newInsert = `const result = await db.run(
        "INSERT INTO portfolios (type, name, invested, current_value, shares, avg_price, ticker, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [type, name, invested, current_value, shares, avg_price, ticker, currency]
      );`;

content = content.replace(oldInsert, newInsert);

fs.writeFileSync('server.ts', content);
