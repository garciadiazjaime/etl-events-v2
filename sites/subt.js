const cheerio = require("cheerio");
const moment = require("moment");
const path = require("path");

const { extract } = require("../support/extract");
const { processEventsWithArtist } = require("../support/preEvents");
const { getTime } = require("../support/misc");
const logger = require("../support/logger")(path.basename(__filename));

function getArtists(value) {
  if (!value || value.includes(":")) {
    return [];
  }

  return value
    .replace("with ", "")
    .split(",")
    .map((name) => ({ name: name.trim() }));
}

function transformDetails($) {
  const mainArtist = getArtists($.find(".headliners").text().trim());

  const artist = getArtists($.find(".supporting-talent").text().trim());

  return {
    artists: [...mainArtist, ...artist],
  };
}

function transform(html) {
  const $ = cheerio.load(html);

  const events = [];

  $(".seetickets-list-event-container")
    .toArray()
    .forEach((item) => {
      const name = $(item).find(".event-title").text().trim();
      const url = $(item).find(".event-title a").attr("href");
      const image = $(item).find("img").attr("src");
      // todo: save extra dates when value includes "-"
      const date = $(item).find(".event-date").text().split("-")[0].trim();
      const time = getTime($(item).find(".door-time").text());

      const dateTime = `${date} ${time}`;

      const startDate = moment(dateTime, "ddd MMM DD h:mm a");
      if (!startDate.isValid()) {
        logger.info("INVALID_DATE", { name, startDate });
        return;
      }

      const description = $(item).find(".doortime-showtime").text().trim();
      const buyUrl = $(item).find("a.seetickets-buy-btn").attr("href");

      const { artists } = transformDetails($(item));

      events.push({
        name,
        image,
        url,
        start_date: startDate,
        description,
        buyUrl,
        artists,
      });
    });

  return events;
}

async function main() {
  const venue = {
    venue: "Subterranean",
    provider: "SUBTERRANEAN",
    city: "Chicago",
    url: "https://subt.net/",
  };

  const html = await extract(venue.url);

  const preEvents = transform(html);

  await processEventsWithArtist(venue, preEvents);
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
