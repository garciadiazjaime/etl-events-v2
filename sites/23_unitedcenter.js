const cheerio = require("cheerio");
const moment = require("moment");
const path = require("path");

const { extract } = require("../support/extract");
const { processEventsWithArtist } = require("../support/preEvents");
const { getTime } = require("../support/misc");

const logger = require("../support/logger")(path.basename(__filename));

const getDates = ($, currentMonth) => {
  const time = getTime($.find(".duration").text().trim());

  if ($.find(".dateIcon").length === 1) {
    const date = $.find(".dateIcon")
      .text()
      .trim()
      .replace(/(\t)|(\n)/g, "");

    const startDate = moment(`${date} ${time}`, "MMMD h:mm a");

    if (startDate.month() < currentMonth) {
      startDate.add(1, "years");
    }

    return [startDate.toJSON()];
  }

  if ($.find(".dateIcon").length === 2) {
    let date = $.find(".dateIcon")
      .first()
      .text()
      .trim()
      .replace(/(\t)|(\n)/g, "");
    const startDate = moment(`${date} ${time}`, "MMMD h:mm a");

    date = $.find(".dateIcon")
      .last()
      .text()
      .trim()
      .replace(/(\t)|(\n)/g, "");
    const lastDate = moment(`${date} ${time}`, "MMMD h:mm a");

    const dates = [];
    while (startDate <= lastDate) {
      if (startDate.month() < currentMonth) {
        startDate.add(1, "years");
      }

      dates.push(startDate.toJSON());
      startDate.add(1, "days");
    }

    return dates;
  }

  return [];
};

function transform(html, venue) {
  const $ = cheerio.load(html);
  const domain = new URL(venue.url).origin;
  const events = [];
  const currentMonth = new Date().getMonth();
  // todo: event page has "buy url"
  $(".eventsTheme > ul.itemList")
    .first()
    .find("> li")
    .toArray()
    .forEach((item) => {
      const name = $(item).find(".title").text().trim();
      const image = `${domain}${$(item).find(".itemImage img").attr("src")}`;
      const url = `${domain}${$(item).find(".eventLink").attr("href")}`;
      const buyUrl = `https://www.ticketmaster.com/search?q=${encodeURIComponent(name)}%20united%20center`;
      const dates = getDates($(item), currentMonth);
      const description = $(item).find(".description").text().trim();

      if (!dates.length) {
        logger.info("NO_DATE");
      }

      dates.forEach((startDate) => {
        const event = {
          name,
          image,
          url,
          buyUrl,
          start_date: startDate,
          description,
          artists: [{ name }],
        };

        events.push(event);
      });
    });

  return events;
}

async function main() {
  const venue = {
    venue: "United Center",
    provider: "UNITEDCENTER",
    city: "Chicago",
    url: "https://www.unitedcenter.com",
    sourceURL: "https://www.unitedcenter.com/events/?F_c=1",
  };

  const html = await extract(venue.sourceURL);

  const preEvents = transform(html, venue);

  await processEventsWithArtist(venue, preEvents);
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
