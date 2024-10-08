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
  const client = new S3Client({ region: "us-east-1" });

  const params = {
    Bucket: "cmc.data",
    Key: "public/events.json",
    Body: JSON.stringify(events),
    ContentType: "application/json",
  };

  const command = new PutObjectCommand(params);

  const response = await client.send(command);

  logger.info("s3 uploaded", response);
}

async function createInvalidation(invalidPath) {
  const client = new CloudFrontClient({ region: "us-east-1" });

  const params = {
    DistributionId: "E3MCEYJZ5K3N1E",
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

  logger.info(`invalidate`, { invalidPath, response });
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

  const results = await getEvents(query);

  const duplicate = {};
  const events = results.reduce((accumulator, event) => {
    const key = `${event.start_date}_${event.slug}`;
    if (!duplicate[key]) {
      duplicate[key] = true;
      accumulator.push(event);
    } else {
      logger.info("DUPLICATE_EVENT", { slug: event.slug });
    }

    return accumulator;
  }, []);

  await saveToS3({
    created: new Date().toJSON(),
    events,
  });
  await createInvalidation("/public/events.json");
  await createInvalidation("/data/*");
  await triggerDeploy();

  logger.info(`events`, {
    total: events.length,
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
