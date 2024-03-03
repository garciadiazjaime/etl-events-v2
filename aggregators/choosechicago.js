const moment = require("moment");
const cheerio = require("cheerio");

const { extract } = require("../support/extract");
const {
  processEventsWithoutArtistAndLocation,
} = require("../support/preEvents");

function transform(html) {
  const $ = cheerio.load(html);

  const events = $(".type-tribe_events")
    .toArray()
    .map((item) => {
      const name = $(item).find(".card-title").text().trim();
      const description = $(item).find(".card-body p").text().trim();
      const image = encodeURI($(item).find(".img-cover").data("src"));
      const url = $(item).find(".card-img-link").attr("href");

      const date = $(item).find(".tribe-event-date-start").text();
      const startTime = $(item).find(".tribe-event-time").first().text();
      const endTime = $(item).find(".tribe-event-time").last().text();
      const startDate =
        moment(`${date} ${startTime}`, "dddd, MMMM Do LT").format() !==
        "Invalid date"
          ? moment(`${date} ${startTime}`, "dddd, MMMM Do LT")
          : moment(`${date} ${startTime}`, "dddd MMMM Do, YYYY LT");
      const endDate =
        moment(`${date} ${endTime}`, "dddd, MMMM Do LT").format() !==
        "Invalid date"
          ? moment(`${date} ${endTime}`, "dddd, MMMM Do LT")
          : moment(`${date} ${endTime}`, "dddd MMMM Do, YYYY LT");
      if (endDate < startDate) {
        endDate.add(1, "days");
      }
      const venue = $(item)
        .find(".tribe-events-venue-details b")
        .text()
        .split(",")[0];
      const address = $(item).find(".tribe-events-venue-details");
      address.find("b").remove();

      return {
        name,
        description,
        image,
        url,
        start_date: startDate.format(),
        end_date: endDate.format(),
        venue,
        address: address.text(),
      };
    });

  return events;
}

async function etl(url, site) {
  if (!url) {
    return;
  }

  const html = await extract(url);

  const preEvents = transform(html, site);

  await processEventsWithoutArtistAndLocation(preEvents, site);
}

async function main() {
  // todo: site has pagination but first page is enough for current events
  const today = moment();
  const site = {
    city: "CHICAGO",
    provider: "CHOOSECHICAGO",
    url: `https://www.choosechicago.com/events/?tribe-bar-date=${today.format(
      "YYYY-M-D"
    )}&tribe_eventcategory[0]=1242`,
  };

  etl(site.url, site);
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
