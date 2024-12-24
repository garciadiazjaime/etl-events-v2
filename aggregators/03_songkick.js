const moment = require("moment");
const cheerio = require("cheerio");
const path = require("path");

const { extract } = require("../support/extract");
const { getOriginFromUrl } = require("../support/misc");
const {
  processEventsWithArtistWithoutLocation,
} = require("../support/preEvents");
const logger = require("../support/logger")(path.basename(__filename));

function transform(html, site) {
  const $ = cheerio.load(html);

  const events = [];
  $(".event-listings-element")
    .toArray()
    .forEach((item) => {
      const name = $(item).find(".artists strong").text();
      const image = `https:${$(item)
        .find(".artist-profile-image")
        .data("src")}`;
      const url = `${getOriginFromUrl(site.url)}${$(item)
        .find(".event-link")
        .attr("href")}`;
      const venue = $(item).find(".venue-link").text();
      const timestamp = $(item).find("time").attr("datetime");
      if (!timestamp.includes("T")) {
        return;
      }
      const startDate = moment(timestamp).format();

      const artists = (
        name.includes(",") ? name.split(",") : name.split(" and ")
      ).map((value) => ({
        name: value.trim(),
      }));

      const maxNameLength = 240;
      if (name.length > maxNameLength) {
        logger.info("LONG_EVENT_NAME", {
          name,
          venue,
          provider: site.provider,
        });
      }
      const event = {
        name: name.slice(0, maxNameLength),
        image,
        url,
        start_date: startDate,
        venue,
        artists,
      };

      if (!event.venue) {
        logger.info("EMPTY_VENUE", event);
        return;
      }

      events.push(event);
    });

  return events;
}

async function etl(url, site, index = 0) {
  if (!url || index > 2) {
    return;
  }

  const html = await extract(url);

  const preEvents = transform(html, site);

  await processEventsWithArtistWithoutLocation(preEvents, site);

  const $ = cheerio.load(html);
  const nextPage = $(".next_page").attr("href");

  if (nextPage) {
    await etl(`${getOriginFromUrl(url)}${nextPage}`, site, index + 1);
  }
}

async function main() {
  const today = moment();
  const endDate = moment().add(7, "days");
  const site = {
    city: "CHICAGO",
    provider: "SONGKICK",
    url: `https://www.songkick.com/metro-areas/9426-us-chicago?filters[minDate]=${today.format(
      "M/D/YYYY"
    )}&filters[maxDate]=${endDate.format("M/D/YYYY")}`,
  };

  await etl(site.url, site);
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
