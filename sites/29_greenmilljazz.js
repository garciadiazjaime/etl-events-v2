const cheerio = require("cheerio");
const moment = require("moment");

const { extract } = require("../support/extract");
const { processEventsWithArtist } = require("../support/preEvents");
const { getTime } = require("../support/misc");

const timeRegex = /\(.*?\)/g;

function transform(html) {
  const $ = cheerio.load(html);
  const events = [];

  $("h2").each((_, element) => {
    const date = $(element).text().trim();

    if (
      $(element).attr("style") &&
      $(element).attr("style").includes("display: none")
    ) {
      return;
    }

    const eventGroup = $(element).next(".eventssinglegrouplist");

    eventGroup.find("a").each((_, eventElement) => {
      const name = $(eventElement).text().trim();
      const nameCleaned = name.replace(timeRegex, "").trim();
      const url = $(eventElement).attr("href");
      const time = getTime(name);
      const startDate = moment(`${date} ${time}`, "dddd, MMMM D ha");
      const nextYear = moment().add(1, "year").year();
      const startDateAdjusted = startDate.isValid()
        ? startDate
        : moment(`${nextYear} ${date} ${time}`, "YYYY dddd, MMMM D h:mma");
      const artists = [{ name: nameCleaned }];

      const event = {
        name: nameCleaned,
        image:
          "https://greenmilljazz.com/wp-content/themes/greenmill/images/header.png",
        url,
        start_date: startDateAdjusted,
        artists,
      };

      events.push(event);
    });
  });

  return events;
}

async function main() {
  const venue = {
    venue: "Green Mill",
    provider: "GREEN_MILL",
    city: "Chicago",
    url: "https://greenmilljazz.com/",
  };

  const html = await extract(venue.url);

  const preEvents = transform(html);
  console.log(preEvents);

  await processEventsWithArtist(venue, preEvents);
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
