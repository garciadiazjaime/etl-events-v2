const { Queue } = require("bullmq");
const async = require("async");

const { AGGREGATORS } = require("../aggregators");
const { SITES } = require("../sites");

require("dotenv").config();

async function queueAggregators(myQueue) {
  await async.eachSeries(AGGREGATORS, async (AGGREGATOR) => {
    await myQueue.add("AGGREGATOR", AGGREGATOR);
  });
}

async function queueSites(myQueue) {
  await async.eachSeries(SITES, async (SITE) => {
    await myQueue.add("provider", { name: SITE });
  });
}

async function main() {
  const myQueue = new Queue("livemusic", {
    connection: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
    },
  });

  await queueSites(myQueue);
  await queueAggregators(myQueue);
}

main().then(() => {
  process.exit(1);
});
