const cheerio = require("cheerio");
const async = require("async");
const moment = require("moment");
const path = require("path");

const { getGMapsLocation } = require("../support/gps");
const { extract } = require("../support/extract");
const { regexTime } = require("../support/misc");
const { processEventWithArtistDetails } = require("../support/preEvents");

const logger = require("../support/logger")(path.basename(__filename));

function transformEventDetails(html) {
  const $ = cheerio.load(html);
  const price = $(".eventCost").text().trim().match(/\d+/)?.[0];
  const buyUrl = $(".on-sale a").attr("href");
  const artists = $(".singleEventDescription a")
    .toArray()
    .map((item) => ({
      name: $(item).text().trim(),
      metadata: {
        website: $(item).attr("href"),
      },
    }));

  const details = {
    price,
    buyUrl,
    artists,
  };

  return details;
}

async function getEventDetails(url) {
  if (!url) {
    return {};
  }

  const html = await extract(url);

  const eventDetails = transformEventDetails(html);

  return eventDetails;
}

const getDates = ($) => {
  if ($.find(".m-date__singleDate").length) {
    const date = $.find(".date").text().trim();
    const startDate = moment(date, "MMMM DD, YYYY");
    return [startDate];
  }

  if ($.find(".m-date__rangeFirst").length) {
    let value = $.find(".m-date__rangeLast").text().trim();
    const lastDate = moment(value, "MMMM DD, YYYY");

    value = $.find(".m-date__rangeFirst").text().trim();
    const startDate = moment(`${value} ${lastDate.year()}`, "MMMM DD YYYY");

    const dates = [];
    while (startDate <= lastDate) {
      dates.push(startDate.toJSON());
      startDate.add(1, "days");
    }

    return dates;
  }

  return [];
};

function transform(html) {
  const htmlCleaned = html
    .replace(/(\\t)|(\\n)/g, "")
    .replace(/\\/g, "")
    .replace('"', "")
    .slice(0, -1);
  const $ = cheerio.load(htmlCleaned);

  const events = [];

  $(".eventItem")
    .toArray()
    .map((item) => {
      const name = $(item).find(".title").text().trim();
      const image = $(item).find(".thumb img").attr("src");
      const url = $(item).find(".thumb a").attr("href");
      const dates = getDates($(item));
      const buyUrl = $(item).find(".tickets").attr("href");

      if (!dates.length) {
        logger.info("NO_DATE");
      }

      dates.map((startDate) => {
        const event = {
          name,
          image,
          url,
          start_date: startDate,
          buyUrl,
        };

        events.push(event);
      });
    });

  return events;
}

async function main() {
  const venue = {
    venue: "Soldier Field",
    provider: "SOLDIERFIELD",
    city: "Chicago",
    url: "https://www.soldierfield.com/",
    urlSource:
      "https://www.soldierfield.com/events/events_ajax/0?category=1&venue=0&team=0&per_page=200&came_from_page=event-list-page",
  };
  const location = await getGMapsLocation(venue);

  if (!location) {
    return;
  }

  const html = await extract(venue.urlSource);

  const preEvents = transform(html);

  await async.eachSeries(preEvents, async (preEvent) => {
    const { price, buyUrl, artists } = await getEventDetails(preEvent.url);

    const event = {
      ...preEvent,
      price,
      buyUrl,
      artists,
    };
    await processEventWithArtistDetails(venue, location, event);
  });

  logger.info("processed", {
    total: preEvents.length,
    provider: venue.provider,
  });
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
