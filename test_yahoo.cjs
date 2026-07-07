const yahooFinance = require('yahoo-finance2').default;
async function test() {
  try {
    const quote = await yahooFinance.quote('AAPL');
    console.log(quote.regularMarketPrice);
  } catch (err) {
    console.error(err);
  }
}
test();
