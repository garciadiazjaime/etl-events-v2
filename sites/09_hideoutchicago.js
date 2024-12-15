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

function transform(html) {
  const $ = cheerio.load(html);

  const events = $(".rhpSingleEvent")
    .toArray()
    .map((item) => {
      const name = $(item).find("h2").text().trim();
      const image = $(item).find(".eventListImage").attr("src");
      const url = $(item).find(".url").attr("href");
      const date = $(item).find("#eventDate").text().trim();
      const timeText = $(item).find(".eventDoorStartDate span").text().trim();

      const time = timeText.match(regexTime)[0];
      const dateTime = `${date} ${time}`;

      const startDate = moment(dateTime, "ddd, MMM DD, YYYY h:mma");
      const description = $(item).find(".eventDoorStartDate").text().trim();

      const event = {
        name,
        image,
        url,
        start_date: startDate,
        description,
      };

      return event;
    });

  return events;
}

async function main() {
  const venue = {
    venue: "Hideout Chicago",
    provider: "HIDEOUTCHICAGO",
    city: "Chicago",
    url: "https://hideoutchicago.com/",
  };
  const location = await getGMapsLocation(venue);

  if (!location) {
    return;
  }

  const html = await extract(venue.url);

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
