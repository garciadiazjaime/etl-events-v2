const async = require("async");
const path = require("path");

require("dotenv").config();

const { SITE_ETL } = require("./sites");
const { AGGREGATORS_ETL } = require("./aggregators");
const logger = require("./support/logger")(path.basename(__filename));

async function main() {
  await async.eachSeries(Object.keys(SITE_ETL), async (key) => {
    logger.info("etl", { key });
    await SITE_ETL[key]().catch((error) => {
      logger.error("ABORT", { error, key });
    });
  });

  await async.eachSeries(Object.keys(AGGREGATORS_ETL), async (key) => {
    logger.info("etl", { key });
    await AGGREGATORS_ETL[key]().catch((error) => {
      logger.error("ABORT", { error, key });
    });
  });
}

main().then(() => {});
