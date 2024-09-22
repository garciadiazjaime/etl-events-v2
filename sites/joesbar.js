const cheerio = require("cheerio");
const moment = require("moment");
const path = require("path");

const { extract } = require("../support/extract");
const { getPrice, getTime } = require("../support/misc");
const { processEventsWithArtist } = require("../support/preEvents");
const logger = require("../support/logger")(path.basename(__filename));

function getArtist(name) {
  const artist = { name };
  if (name.includes("with")) {
    artist.name = name.split("with")?.[1]?.trim();
  }

  return artist;
}

function transform(html, venue) {
  const $ = cheerio.load(html);

  const events = [];

  $(".concert-listing")
    .toArray()
    .forEach((item) => {
      const date = $(item).find(".date").text().trim().slice(3);
      const time =
        getTime($(item).find(".doors").text().trim()) ||
        getTime($(item).find(".time").text().trim());
      const startDate = moment(`${date} ${time}`, "MMM D h:mma");

      if (moment().startOf("day") > startDate) {
        return;
      }

      const name = $(item).find(".info-top .artist").text().trim();
      const description = $(item).find(".event-title-extras").text().trim();
      const imagePath =
        $(item)
          .find(".concert-listing-image img")
          .attr("src")
          ?.replace("../", "") ||
        $(item)
          .find(".concert-listing-image-wide img")
          .attr("src")
          ?.replace("../", "");
      const image = imagePath ? `${venue.url}${imagePath}` : undefined;
      const eventUrl = $(item).find(".ticket-button a").attr("href");
      const urlValid = eventUrl !== "#" && !eventUrl.includes("mailto");
      const url = urlValid ? eventUrl : venue.sourceUrl;
      const buyUrl = urlValid ? url : undefined;
      const price = getPrice($(item).find(".about-the-show").text().trim());

      const mainArtist = getArtist(name);

      const event = {
        name,
        description,
        image,
        url,
        start_date: startDate,
        buyUrl,
        price,
        artists: [mainArtist],
      };

      if (!event.url) {
        logger.info("EMPTY_URL", event);
        return;
      }

      events.push(event);
    });

  return events;
}

async function main() {
  // todo: some events include social media links
  const venue = {
    venue: "Joe's on Weed St.",
    provider: "JOESBAR",
    city: "Chicago",
    url: "https://www.joesbar.com/",
    sourceUrl: "https://www.joesbar.com/weedst/events.html",
  };

  const html = await extract(venue.sourceUrl);

  const preEvents = transform(html, venue);

  await processEventsWithArtist(venue, preEvents);
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
