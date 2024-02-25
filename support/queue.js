const { Queue } = require("bullmq");
const async = require("async");

const { getLinks } = require("./links");
const { PROVIDERS } = require("../sites");

require("dotenv").config();

async function queueAggregators(myQueue) {
  const links = getLinks();

  const promises = links.map(async (link) => {
    await myQueue.add("link", link);
  });

  await Promise.all(promises);
}

async function queueSites(myQueue) {
  await async.eachSeries(PROVIDERS, async (PROVIDER) => {
    await myQueue.add("provider", { name: PROVIDER });
  });
}

async function main() {
  const myQueue = new Queue("livemusic", {
    connection: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
    },
  });

  const flag = false;
  if (flag) {
    await queueAggregators(myQueue);
  }

  await queueSites(myQueue);
}

main().then(() => {
  process.exit(1);
});
