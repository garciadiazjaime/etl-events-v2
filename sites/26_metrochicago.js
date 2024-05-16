const cheerio = require("cheerio");
const moment = require("moment");
const { extract } = require("../support/extract");
const { processEventsWithArtist } = require("../support/preEvents");

const getStartDateFromDateText = (dateText) => {
  const today = moment();
  let startDate = moment(dateText).year(today.year());

  // Assuming event is next year if today isAfter startDate
  if (today.isAfter(startDate)) {
    startDate.add(1, "year");
  }

  return startDate;
};

function transform(html) {
  const $ = cheerio.load(html);
  const events = [];

  $(".rhpSingleEvent")
    .toArray()
    .forEach((item) => {
      const name = $(item).find(".eventTitleDiv").text().trim();
      const image = $(item).find(".rhp-events-event-image img").attr("src");
      const url = $(item).find(".eventMoreInfo a").attr("href");
      const buyUrl = $(item).find(".rhp-event-cta a").attr("href");
      const description = $(item).find(".eventSubHeader").text().trim();
      const startDateText = $(item)
        .find(".eventDateListTop .singleEventDate")
        .text()
        .trim();
      const startDate = getStartDateFromDateText(startDateText).toJSON();

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
