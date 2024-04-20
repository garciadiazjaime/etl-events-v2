const cheerio = require("cheerio");
const moment = require("moment");
const path = require("path");

const { extract } = require("../support/extract");
const { processEventsWithArtist } = require("../support/preEvents");

const logger = require("../support/logger")(path.basename(__filename));

const getDates = ($) => {
  if ($.find(".m-date__singleDate").length) {
    const date = $.find(".date").text().trim();
    const startDate = moment(date, "MMMM DD, YYYY");
    return [startDate];
  }

  if ($.find(".m-date__rangeFirst").length) {
    let value = $.find(".m-date__rangeLast").text().trim();
    const lastDate = moment(value, "MMMM DD, YYYY");

    value = $.find(".m-date__rangeFirst").text().trim();
    const startDate = moment(`${value} ${lastDate.year()}`, "MMMM DD YYYY");

    const dates = [];
    while (startDate <= lastDate) {
      dates.push(startDate.toJSON());
      startDate.add(1, "days");
    }

    return dates;
  }

  return [];
};

function transform(html) {
  const htmlCleaned = html
    .replace(/(\\t)|(\\n)/g, "")
    .replace(/\\/g, "")
    .replace('"', "")
    .slice(0, -1);
  const $ = cheerio.load(htmlCleaned);

  const events = [];

  $(".eventItem")
    .toArray()
    .forEach((item) => {
      const name = $(item).find(".title").text().trim();
      const image = $(item).find(".thumb img").attr("src");
      const url = $(item).find(".thumb a").attr("href");
      const dates = getDates($(item));
      const buyUrl = $(item).find(".tickets").attr("href");

      if (!dates.length) {
        logger.info("NO_DATE");
      }

      dates.forEach((startDate) => {
        const event = {
          name,
          image,
          url,
          start_date: startDate,
          buyUrl,
          artists: [{ name: name.split(":")[0] }],
        };

        events.push(event);
      });
    });

  return events;
}

async function main() {
  const venue = {
    venue: "Soldier Field",
    provider: "SOLDIERFIELD",
    city: "Chicago",
    url: "https://www.soldierfield.com/",
    sourceURL:
      "https://www.soldierfield.com/events/events_ajax/0?category=1&venue=0&team=0&per_page=200&came_from_page=event-list-page",
  };

  const html = await extract(venue.sourceURL);

  const preEvents = transform(html, venue);

  await processEventsWithArtist(venue, preEvents);
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
