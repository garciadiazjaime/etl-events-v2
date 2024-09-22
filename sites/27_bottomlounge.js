const cheerio = require("cheerio");
const moment = require("moment");
const { extract } = require("../support/extract");
const { getTime } = require("../support/misc");
const { processEventsWithArtist } = require("../support/preEvents");

const getArtists = (value) => {
  if (!value) {
    return [];
  }

  if (value.includes(",")) {
    return value.split(",").map((item) => ({ name: item.trim() }));
  }

  if (value.includes("-")) {
    return [{ name: value.split("-")[0].trim() }];
  }

  return [{ name: value }];
};

function transform(html) {
  const $ = cheerio.load(html);
  const events = [];

  $(".tw-plugin-upcoming-event-list .tw-section")
    .toArray()
    .forEach((item) => {
      const name = $(item).find(".tw-name").text().trim();
      const image = $(item).find(".tw-image img").attr("src");
      const url = $(item).find(".tw-image a").attr("href");
      const buyUrl = $(item).find(".tw-info-price-buy-tix a").attr("href");
      const description = $(item).find(".tw-date-time").text().trim();

      const date = $(item).find(".tw-event-date").text().trim();
      const time = getTime($(item).find(".tw-event-time").text().trim());
      let startDate = moment(`${date} ${time}`, "MMM DD h:mm a");
      if (!startDate.isValid()) {
        const nextYear = moment().add(1, "year").year();
        startDate = moment(`${nextYear} ${date} ${time}`, "YYYY MMM DD h:mm a");
      }

      const artists = getArtists(name);

      const event = {
        name,
        image,
        url,
        buyUrl,
        start_date: startDate,
        description,
        artists,
      };

      events.push(event);
    });

  return events;
}

async function main() {
  const venue = {
    venue: "Bottom Lounge",
    provider: "BOTTOM_LOUNGE",
    city: "Chicago",
    url: "https://bottomlounge.com/events/",
  };

  const html = await extract(venue.url);

  const preEvents = transform(html);

  await processEventsWithArtist(venue, preEvents);
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
