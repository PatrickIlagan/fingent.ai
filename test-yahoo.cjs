const yahooFinance = require('yahoo-finance2').default;
async function test() {
  try {
    const quote = await yahooFinance.quote('BTC-USD');
    console.log(quote.regularMarketPrice);
  } catch (e) {
    console.error(e);
  }
}
test();
