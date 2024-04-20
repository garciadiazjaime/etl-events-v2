const path = require("path");
const moment = require("moment");
const {
  CloudFrontClient,
  CreateInvalidationCommand,
} = require("@aws-sdk/client-cloudfront");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

require("dotenv").config();

const { getEvents } = require("./mint");
const logger = require("./logger")(path.basename(__filename));

async function saveToS3(events) {
  const client = new S3Client({ region: "us-west-2" });

  const params = {
    Bucket: "django-models-static",
    Key: "public/events.json",
    Body: JSON.stringify(events),
  };

  const command = new PutObjectCommand(params);

  const response = await client.send(command);

  logger.info("s3 uploaded", response);
}

async function createInvalidation(invalidPath) {
  const client = new CloudFrontClient({ region: "us-west-2" });

  const params = {
    DistributionId: "EOU0PLBOU18RM",
    InvalidationBatch: {
      CallerReference: String(new Date().getTime()),
      Paths: {
        Quantity: 1,
        Items: [invalidPath],
      },
    },
  };

  const createInvalidationCommand = new CreateInvalidationCommand(params);

  const response = await client.send(createInvalidationCommand);

  logger.info("invalidation created", response);
}

async function triggerDeploy() {
  const response = await fetch(process.env.NETLIFY_DEPLOY_HOOK, {
    method: "POST",
  });

  logger.info("deployed", { status: response.status });
}

async function resetEvents() {
  const today = moment().subtract(1, "days").format("YYYY-MM-DD");
  const nextWeek = moment().add(8, "days").format("YYYY-MM-DD");

  const query = `location_empty=false&start_date=${today}&end_date=${nextWeek}&ordering=-rank&limit=700`;

  const events = await getEvents(query);

  const eventsSorted = events.sort((a, b) => {
    const popularityA =
      a.artists.reduce((total, item) => Math.max(total, item.popularity), 0) ||
      0;
    const popularityB =
      b.artists.reduce((total, item) => Math.max(total, item.popularity), 0) ||
      0;

    return popularityB - popularityA;
  });

  await saveToS3({
    created: new Date(),
    events: eventsSorted,
  });
  await createInvalidation("/public/events.json");
  await createInvalidation("/data/*");
  await triggerDeploy();

  logger.info(`events`, {
    total: eventsSorted.length,
    date: today,
  });
}

async function main() {
  logger.info("reset starting");

  await resetEvents();
}

main().then(() => {
  logger.info("reset end");
  logger.flush();
});
