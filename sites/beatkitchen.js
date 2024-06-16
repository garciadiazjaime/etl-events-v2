const cheerio = require("cheerio");
const moment = require("moment");

const { extract } = require("../support/extract");
const { processEventsWithArtist } = require("../support/preEvents");
const { getTime } = require("../support/misc");

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

function transform(html, venue) {
  const $ = cheerio.load(html);

  const events = [];
  $(".seetickets-list-event-container")
    .toArray()
    .forEach((item) => {
      // todo: this is almost the same ETL as `subt` except for this check
      if (
        !$(item).find(".venue").text().trim().toLowerCase().includes("beat")
      ) {
        return;
      }

      const name = $(item).find(".event-title").text().trim();
      const url = $(item).find(".event-title a").attr("href");
      const description = $(item).find(".doortime-showtime").text().trim();
      const buyUrl = $(item).find("a.seetickets-buy-btn").attr("href");

      const image = $(item).find("img").data("src")
        ? `${venue.url}${$(item).find("img").data("src")}`
        : $(item).find("img").attr("src");

      const { artists } = transformDetails($(item));

      const startDates = [];
      const date = $(item).find(".event-date").text().trim();
      const time = getTime($(item).find(".door-time").text().trim());

      if (date.includes("-")) {
        date.split("-").forEach((value) => {
          const dateTime = `${value} ${time}`;
          const startDate = moment(dateTime, "MMM D h:mma");
          startDates.push(startDate);
        });
      } else {
        const dateTime = `${date} ${time}`;
        const startDate = moment(dateTime, "ddd MMM D h:mma");
        startDates.push(startDate);
      }

      startDates.forEach((startDate) => {
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
    });

  return events;
}

async function main() {
  const venue = {
    venue: "Beat Kitchen",
    provider: "BEAT_KITCHEN",
    city: "Chicago",
    url: "https://beatkitchen.com",
  };

  const html = await extract(venue.url);

  const preEvents = transform(html, venue);

  await processEventsWithArtist(venue, preEvents);
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
