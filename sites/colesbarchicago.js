const cheerio = require("cheerio");
const moment = require("moment");

const { processEventsWithArtist } = require("../support/preEvents");
const { extract } = require("../support/extract");
const {
  regexTime,
  regexMoney,
  regexEmptySpaces,
  defaultImage,
} = require("../support/misc");
const { validURL } = require("../support/misc");
const { getGMapsLocation } = require("../support/gps");

function transform(html) {
  const $ = cheerio.load(html);

  const events = $(".eventWrapper")
    .toArray()
    .map((item) => {
      const name = $(item).find("h2").text().trim();
      const description = $(item)
        .find(".rhpEventDetails")
        .text()
        .trim()
        .replace(regexEmptySpaces, "");
      const image = $(item).find(".rhp-events-event-image img").attr("src");
      const url = $(item).find("a.url").attr("href");
      const href = $(item).find(".rhp-event-cta a").attr("href");
      const buyUrl = validURL(href) ? href : "";
      const price = $(item)
        .find(".eventCost span")
        .text()
        .match(regexMoney)?.[0]
        ?.replace("$", "");

      const date = $(item).find(".eventDateListTop").text().trim();
      const time = $(item)
        .find(".eventDoorStartDate")
        .text()
        .trim()
        .match(regexTime)?.[0];

      const startDate = moment(`${date} ${time}`, "ddd, MMM DD h:mma");

      const artists = name.split(",").map((name) => ({ name }));

      const event = {
        name,
        description,
        image: image.startsWith("https") ? image : defaultImage,
        url,
        buyUrl,
        price,
        start_date: startDate,
        artists,
      };

      return event;
    });

  return events;
}

async function main() {
  const venue = {
    venue: "Cole's Bar",
    provider: "COLESBAR",
    city: "Chicago",
    url: "https://colesbarchicago.com/",
  };

  const location = await getGMapsLocation(venue);

  if (!location) {
    return;
  }

  const html = await extract(venue.url);

  const preEvents = transform(html, venue);

  await processEventsWithArtist(venue, preEvents);
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
