const cheerio = require("cheerio");
const async = require("async");
const moment = require("moment");
const path = require("path");

const { getGMapsLocation } = require("../support/gps");
const { getSocial } = require("../support/misc");
const { extract } = require("../support/extract");
const { regexTime, regexMoney } = require("../support/misc");
const { processEventWithArtistDetails } = require("../support/preEvents");

const logger = require("../support/logger")(path.basename(__filename));

function transform(html, preEvent) {
  const $ = cheerio.load(html);

  const events = $("#middle article.type-show")
    .toArray()
    .map((item) => {
      const name = $(item).find("h2").text().trim();
      const image = `${preEvent.url}${$(item)
        .find(".thumbnail img")
        .attr("src")}`;
      const url = $(item).find(".entry-footer a.expandshow").attr("href");
      const date = $(item).find(".entry-header time").attr("datetime");
      const timeText = $(item).find(".entry-footer .details li").text().trim();
      const time = timeText.match(regexTime)?.[0];

      const dateTime = `${date} ${time}`;

      const startDate = moment(dateTime, "YYYY-MM-DD h:mma");
      const description = $(item).find(".details").text().trim();
      const buyUrl = $(item).find("a.ticketfly").attr("href");
      const price = $(item)
        .find(".details")
        .text()
        .match(regexMoney)?.[0]
        ?.replace("$", "");

      const event = {
        name,
        image,
        url,
        start_date: startDate,
        description,
        buyUrl,
        price,
      };

      return event;
    });

  return events;
}

function transformDetails(html) {
  const $ = cheerio.load(html);
  const artists = [];

  $(".entry-content .band")
    .toArray()
    .forEach((item) => {
      const social = getSocial($(item).html());

      const website = $(item)
        .find(".details li")
        .filter((_index, _item) => $(_item).text() === "Band Website")
        .find("a")
        .attr("href");

      if (!Object.keys(social).length) {
        return;
      }

      artists.push({
        name: $(item).find(".show-title").text().trim(),
        metadata: {
          ...social,
          website,
        },
      });
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

  const { artists } = transformDetails(html);

  return {
    artists,
  };
}

async function etl() {
  const venue = {
    venue: "Reggies Chicago",
    provider: "REGGIESLIVE",
    city: "Chicago",
    url: "https://www.reggieslive.com/",
  };
  const location = await getGMapsLocation(venue);

  if (!location) {
    return;
  }

  const html = await extract(venue.url);

  const preEvents = transform(html, venue);

  await async.eachSeries(preEvents, async (preEvent) => {
    const { artists } = await getDetails(preEvent.url);

    const event = {
      ...preEvent,
      artists,
      location,
      provider: venue.provider,
      venue: venue.venue,
      city: venue.city,
    };

    await processEventWithArtistDetails(venue, location, event);
  });

  logger.info("processed", {
    total: preEvents.length,
    provider: venue.provider,
  });
}

async function etlDetails() {
  const url = "https://www.reggieslive.com/show/donny-konz/";
  const { artists } = await getDetails(url);
  console.log(artists);
  logger.info("artists", { total: artists.length });
  await processEventWithArtistDetails({}, null, { artists });
}

async function main() {
  // await etl();
  await etlDetails();
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
