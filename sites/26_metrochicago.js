const cheerio = require("cheerio");
const moment = require("moment");
const { extract } = require("../support/extract");
const { getTime, getPrice } = require("../support/misc");
const { processEventsWithArtist } = require("../support/preEvents");

function transform(html) {
  const $ = cheerio.load(html);
  const events = [];

  $(".rhpSingleEvent")
    .toArray()
    .forEach((item) => {
      const name = $(item).find(".eventTitleDiv").text().trim();
      const image = $(item).find(".rhp-events-event-image img").attr("src");
      const url = $(item).find(".eventMoreInfo a").attr("href");
      const buyUrl = $(item)
        .find(".rhp-event-cta a")
        .attr("href")
        .trim()
        .replace(/ /g, "");
      const description = $(item).find(".eventSubHeader").text().trim();
      const price = getPrice($(item).find(".eventCost").text().trim());
      const artist = name.split("-")[0].split("–")[0].trim();

      const date = $(item)
        .find(".eventDateListTop .singleEventDate")
        .text()
        .trim();
      const time = getTime($(item).find(".eventDoorStartDate").text().trim());
      const startDate = moment(`${date} ${time}`, "ddd, MMM DD ha");
      if (moment().isAfter(startDate)) {
        startDate.add(1, "year");
      }

      const event = {
        name,
        image,
        url,
        buyUrl,
        start_date: startDate,
        description,
        price,
        artists: [{ name: artist }],
      };

      events.push(event);
    });

  return events;
}

async function main() {
  const venue = {
    venue: "Metro Chicago",
    provider: "METRO_CHICAGO",
    city: "Chicago",
    url: "https://metrochicago.com/events/",
  };

  const html = await extract(venue.url);

  const preEvents = transform(html);

  await processEventsWithArtist(venue, preEvents);
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
