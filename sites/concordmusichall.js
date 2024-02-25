const async = require("async");
const cheerio = require("cheerio");
const path = require("path");
const moment = require("moment");

const { extract } = require("../support/extract");
const { regexTime, getPrice, getURL, getSocial } = require("../support/misc");
const { processEventWithArtistDetails } = require("../support/preEvents");
const { getGMapsLocation } = require("../support/gps");

const logger = require("../support/logger")(path.basename(__filename));

function transform(html) {
  const $ = cheerio.load(html);

  const events = $("article.group")
    .toArray()
    .map((item) => {
      const name = $(item).find("h1").text().trim();
      const image = getURL($(item).find(".img").attr("style"));
      const url = $(item).find("a").first().attr("href");
      const date = $(item).find(".date").text().trim();
      const time = $(item).find(".doors").text().trim().match(regexTime)?.[0];
      const dateTime = `${date} ${time}`;

      const startDate = moment(dateTime, "MMM D h:mm a");
      const description = `${$(item).find(".age").text().trim()}, ${$(item)
        .find(".doors")
        .text()
        .trim()}`;

      const price = getPrice($(item).find(".price").text());

      return {
        name,
        image,
        url,
        start_date: startDate,
        description,
        price,
      };
    });

  return events;
}

function transformDetails(html) {
  const $ = cheerio.load(html);

  const title = $("#main h1").first().text().trim();
  const metadata = getSocial($("#main .embeds.group").html());
  const mainArtist = {
    name: title.toLowerCase().split("presents")[0].split("-")[0].trim(),
    metadata,
  };

  const subtitle = $("#main h2").first().text().trim();

  const extraArtists =
    (subtitle.length &&
      subtitle
        .split("/")[1]
        ?.replace("and", "")
        ?.split(",")
        .map((name) => ({
          name: name.trim(),
        }))) ||
    [];

  const buyUrl = $("#main a.btn").first().attr("href");

  return { artists: [mainArtist, ...extraArtists], buyUrl };
}

async function getDetails(preEvent) {
  if (!preEvent.url) {
    return {};
  }

  const html = await extract(preEvent.url);

  const { artists, buyUrl } = transformDetails(html);

  return { artists, buyUrl };
}

async function main() {
  // todo: this is a nice page
  const venue = {
    venue: "Concord Music Hall",
    provider: "CONCORD_MUSIC_HALL",
    city: "Chicago",
    url: "https://concordmusichall.com/calendar/",
  };

  const location = await getGMapsLocation(venue);

  if (!location) {
    return;
  }

  const html = await extract(venue.url);
  const preEvents = transform(html);

  await async.eachSeries(preEvents, async (preEvent) => {
    const { artists, buyUrl } = await getDetails(preEvent);

    const event = {
      ...preEvent,
      artists,
      buyUrl,
    };

    await processEventWithArtistDetails(venue, location, event);
  });

  logger.info("processed", { total: preEvents.length });
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
