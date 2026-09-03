const {syncMarketCheck}=require('../src/marketcheck');
const {closeDatabase}=require('../src/db');

syncMarketCheck()
  .then(result=>console.log(`MarketCheck sync complete: ${result.imported} listings across ${result.pages} page(s).`))
  .catch(error=>{console.error(`MarketCheck sync failed: ${error.message}`);process.exitCode=1})
  .finally(closeDatabase);
