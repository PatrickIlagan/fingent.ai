import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();
async function test() {
  try {
    const quote = await yahooFinance.quote('SMPH');
    console.log(quote);
  } catch(e) { console.error(e) }
}
test();
