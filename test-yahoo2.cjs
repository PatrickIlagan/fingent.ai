const { default: yahooFinance } = require('yahoo-finance2');
async function test() {
  try {
    const quote = await yahooFinance.quote('BTC-USD');
    console.log(quote.regularMarketPrice);
  } catch (e) {
    console.error(e);
  }
}
test();
