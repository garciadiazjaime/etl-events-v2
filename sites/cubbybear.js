const cheerio = require("cheerio");
const moment = require("moment");

const { extract } = require("../support/extract");
const { processEventsWithoutArtist } = require("../support/preEvents");

function transform(html, venue) {
  const $ = cheerio.load(html);

  const events = $(".eventlist-event--upcoming")
    .toArray()
    .map((item) => {
      const name = $(item).find(".eventlist-title").first().text().trim();
      const description = undefined;
      const image = $(item).find("img").data("src");
      const url = `${new URL(venue.url).origin}${$(item)
        .find(".eventlist-title a")
        .attr("href")}`;
      const buyUrl = undefined;
      const price = undefined;

      const date = $(item).find(".event-date").attr("datetime");
      const time = $(item).find(".event-time-12hr-start").text().trim();
      const dateTime = `${date} ${time}`;
      const startDate = moment(dateTime, "YYYY-MM-DD h:mma");

      const artists = undefined;

      return {
        name,
        description,
        image,
        url,
        buyUrl,
        price,
        start_date: startDate,
        artists,
      };
    });

  return events;
}

async function main() {
  // todo: this sites provides little information, not sure worth the scrapper
  const venue = {
    venue: "The Cubby Bear Chicago",
    provider: "CUBBY_BEAR_CHICAGO",
    city: "Chicago",
    url: "https://www.cubbybear.com/live-music",
  };

  const html = await extract(venue.url);

  const preEvents = transform(html, venue);

  await processEventsWithoutArtist(venue, preEvents);
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
