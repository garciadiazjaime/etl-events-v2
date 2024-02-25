const async = require("async");
const { Queue } = require("bullmq");

const { getTransformer, getPaginator } = require("../providers/factories");
const logger = require("./logger")("events");

require("dotenv").config();

const queue = new Queue("livemusic", {
  connection: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
});

async function extract(url) {
  const response = await fetch(url);

  return response.text();
}

function transform(html, link) {
  const transformer = getTransformer(link.provider);
  const events = transformer(html, link);

  return events;
}

async function load(events) {
  await async.eachSeries(events, async (payload) => {
    await queue.add("event", payload);
  });
}

async function processLink(links, getPages = true) {
  await async.eachSeries(links, async (link) => {
    logger.info("scrapping", { url: link.url, getPages });
    const html = await extract(link.url);
    const events = transform(html, link);
    logger.info("found", { total: events.length });

    await load(events);

    if (getPages) {
      const paginator = getPaginator(link.provider);
      const paginatorLinks = paginator(html, link);
      await processLink(paginatorLinks, false);
    }
  });
}

module.exports = {
  processLink,
};
