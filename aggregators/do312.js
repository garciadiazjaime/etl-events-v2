const moment = require("moment");
const cheerio = require("cheerio");

const { extract } = require("../support/extract");
const { getOriginFromUrl, removeEmptySpaces } = require("../support/misc");
const {
  processEventsWithoutArtistAndLocation,
} = require("../support/preEvents");

function transform(html, site) {
  const $ = cheerio.load(html);

  const events = $(".event-card")
    .toArray()
    .map((item) => {
      const name = removeEmptySpaces(
        $(item).find(".ds-listing-event-title").text().trim()
      );
      const image = $(item).find(".ds-cover-image").attr("style").split("'")[1];
      const url = `${getOriginFromUrl(site.url)}${$(item)
        .find(".ds-listing-event-title.url")
        .attr("href")}`;
      const venue = $(item).find(".ds-venue-name").text().trim();
      const timestamp = $(item)
        .find(".ds-listing-details > meta")
        .attr("datetime");
      const startDate = moment(timestamp).format();

      return {
        name,
        image,
        url,
        start_date: startDate,
        venue,
      };
    });

  return events;
}

async function etl(url, site, index = 0) {
  if (!url || index > 2) {
    return;
  }

  const html = await extract(url);

  const preEvents = transform(html, site);

  await processEventsWithoutArtistAndLocation(preEvents, site);

  const $ = cheerio.load(html);
  const nextPage = $(".ds-next-page").attr("href");

  if (nextPage) {
    await etl(`${getOriginFromUrl(url)}${nextPage}`, site, index + 1);
  }
}

async function main() {
  const today = moment();
  const site = {
    city: "CHICAGO",
    provider: "DO312",
    url: `https://do312.com/events/live-music/${today.format("YYYY/MM/DD")}`,
  };

  etl(site.url, site);
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
