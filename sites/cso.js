const async = require("async");
const cheerio = require("cheerio");
const path = require("path");
const moment = require("moment");

const { extract, extractJSON } = require("../support/extract");
const { removeHTML, getPrice } = require("../support/misc");
const { processEventWithArtist } = require("../support/preEvents");
const { getGMapsLocation } = require("../support/gps");

const logger = require("../support/logger")(path.basename(__filename));

function transform(data, venue) {
  const events = [];

  data.productions?.forEach((event) => {
    if (!event.venuesJson?.includes("Symphony")) {
      return;
    }

    events.push({
      name: event.contentTitle,
      image: event.listImageUrl,
      url: `${venue.url}${event.url}`,
      start_date: event.nextPerformanceDate,
      description: removeHTML(event.contentMetaDescription),
      price: getPrice(event.priceRange),
    });
  });

  return events;
}

function transformDetails(html) {
  const $ = cheerio.load(html);
  const response = {
    artists: [],
  };

  $("#performers .persons__item")
    .toArray()
    .forEach((item) => {
      const name = $(item).find(".persons__name").text().trim();

      if (name) {
        response.artists.push({ name });
      }
    });

  return response;
}

async function getDetails(event) {
  if (!event.url) {
    return {};
  }

  const html = await extract(event.url);
  const { artists } = transformDetails(html);

  return { artists };
}

async function main() {
  const venue = {
    venue: "Chicago Symphony Orchestra",
    provider: "CHICAGO_SYMPHONY_ORCHESTRA",
    city: "Chicago",
    url: "https://cso.org/",
  };

  const location = await getGMapsLocation(venue);

  if (!location) {
    return;
  }

  const from = moment().subtract(1, "days").toJSON();

  const payload = {
    from,
    paid: "",
    group: true,
    concerttypes: [],
    genres: [],
    venues: [],
    platforms: [],
    seasons: [],
    page: 0,
  };
  const headers = {
    "Content-Type": "application/json",
  };
  const data = await extractJSON(
    "https://cso.org/umbraco/surface/events/calendar",
    {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    }
  );
  const preEvents = transform(data, venue);

  await async.eachSeries(preEvents, async (preEvent) => {
    const { artists } = await getDetails(preEvent);

    await processEventWithArtist(venue, location, {
      ...preEvent,
      artists,
    });
  });

  logger.info("processed", { total: preEvents.length });
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
