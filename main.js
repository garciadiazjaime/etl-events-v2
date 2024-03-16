const async = require("async");

require("dotenv").config();

const { SITE_ETL } = require("./sites");
const { AGGREGATORS_ETL } = require("./aggregators");

async function main() {
  await async.eachSeries(Object.keys(SITE_ETL), async (key) => {
    await SITE_ETL[key]();
  });

  await async.eachSeries(Object.keys(AGGREGATORS_ETL), async (key) => {
    await AGGREGATORS_ETL[key]();
  });
}

main().then(() => {});
