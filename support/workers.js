const { Worker } = require("bullmq");
const path = require("path");

const { SITE_ETL } = require("../sites");
const { AGGREGATORS_ETL } = require("../aggregators");

const logger = require("./logger")(path.basename(__filename));

require("dotenv").config();

async function main() {
  const worker = new Worker(
    "livemusic",
    async (job) => {
      logger.info("__job__", { name: job.name, data: job.data });
      if (job.name === "AGGREGATOR") {
        const etl = AGGREGATORS_ETL[job.data];

        if (typeof etl === "function") {
          await etl();
        }
        return;
      }

      if (job.name === "provider") {
        const etl = SITE_ETL[job.data.name];

        if (typeof etl === "function") {
          await etl();
        }
      }
    },
    {
      connection: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
      },
    }
  );

  worker.on("completed", ({ name, data }) => {
    logger.info("done", { name, data });
  });

  worker.on("failed", (job, err) => {
    logger.error(`${job.id} has failed`, err);
  });
}

main().then(() => {
  logger.info("queue started");
});
