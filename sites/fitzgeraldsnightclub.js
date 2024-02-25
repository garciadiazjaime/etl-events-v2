const cheerio = require("cheerio");
const async = require("async");
const moment = require("moment");
const path = require("path");

const { getGMapsLocation } = require("../support/gps");
const { saveEvent } = require("../support/mint");
const { extract } = require("../support/extract");
const { getArtistsDetails } = require("../support/preEvents");

const logger = require("../support/logger")(path.basename(__filename));

function transform(html, preEvent) {
  const $ = cheerio.load(html);
  const regexTime = /(1[0-2]|0?[1-9]):([0-5][0-9]) ([AaPp][Mm])/;
  const regexMoney = /\$(\d)+/;

  const events = $(".tw-plugin-upcoming-event-list .tw-section")
    .toArray()
    .map((item) => {
      const name = $(item).find(".tw-name").text().trim();
      const image = $(item).find(".tw-image img").attr("src");
      const url = $(item).find(".tw-name a").attr("href");
      const date = $(item).find(".tw-event-date").text().trim();
      const time = $(item)
        .find(".tw-event-time")
        .text()
        .trim()
        .match(regexTime)?.[0];

      const dateTime = `${date} ${time}`;

      const startDate = moment(dateTime, "ddd MMM D h:mm a");
      const description = $(item).find(".tw-price").text().trim();
      const buyUrl = $(item).find("a.tw-buy-tix-btn").attr("href");
      const price = $(item)
        .find(".tw-price")
        .text()
        .match(regexMoney)?.[0]
        ?.replace("$", "");
      const { provider } = preEvent;
      const { venue } = preEvent;
      const { city } = preEvent;

      const event = {
        name,
        image,
        url,
        start_date: startDate,
        description,
        provider,
        venue,
        city,
        buyUrl,
        price,
      };

      return event;
    });

  return events;
}

function transformDetails(html) {
  const $ = cheerio.load(html);
  const artists = $(".tw-artists-container .tw-artist")
    .toArray()
    .map((item) => {
      const name = $(item).find(".tw-name").text().trim();

      const artist = {
        name,
      };

      return artist;
    });

  return {
    artists,
  };
}

async function getDetails(url) {
  if (!url) {
    return {};
  }

  const html = await extract(url);

  const preEvent = transformDetails(html);
  const response = await getArtistsDetails(preEvent);

  return response;
}

async function main() {
  // todo: Pagination
  // todo: this place is also registered in google as "Fitzgerald's Sidebar", admin has the two locations, they should be merged.
  const venue = {
    venue: "FitzGerald's",
    provider: "FITZGERALDS",
    city: "Chicago",
    url: "https://www.fitzgeraldsnightclub.com/shows/list/",
  };
  const location = await getGMapsLocation(venue);

  if (!location) {
    return;
  }

  const html = await extract(venue.url);

  const preEvents = transform(html, venue);

  await async.eachSeries(preEvents, async (preEvent) => {
    const { artists } = await getDetails(preEvent.url);

    const event = { ...preEvent, artists, location };

    await saveEvent(event);
  });

  logger.info("processed", { total: preEvents.length });
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
