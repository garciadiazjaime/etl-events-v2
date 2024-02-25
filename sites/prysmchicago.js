const cheerio = require("cheerio");
const moment = require("moment");

const { extract } = require("../support/extract");
const { getTime, removeEmptySpaces } = require("../support/misc");
const { processEventsWithArtist } = require("../support/preEvents");

function getArtist($) {
  const mainArtist = $.find("h3").text().split("|");

  const _extraArtist = $.find("h4").text() || "";
  const extraArtist = _extraArtist.includes("-")
    ? _extraArtist.split("-")
    : _extraArtist.split(",");

  const invalidNames = ["SUNDOWN SUNDAZE", "INDUSTRY MONDAYS"];

  const artistsNames = [...mainArtist, ...extraArtist]
    .filter((name) => name)
    .map((name) => removeEmptySpaces(name.trim()))
    .filter((name) => !invalidNames.includes(name.toUpperCase()));

  return artistsNames
    .map((name) => {
      if (name.includes("w/")) {
        return name.split("w/")[1];
      }

      if (name.includes(":")) {
        return name.split(":")[1];
      }

      return name;
    })
    .map((name) => ({
      name: removeEmptySpaces(name.trim()),
    }));
}

function transform(html, venue) {
  const $ = cheerio.load(html);

  const events = $("#eventsList .entry")
    .toArray()
    .map((item) => {
      const name = $(item).find("h3").text().trim();
      const description = removeEmptySpaces(
        $(item).find(".time").text().trim(),
      );
      const image = $(item).find(".thumb img").attr("src");
      const url = $(item).find(".thumb a").attr("href");
      const buyUrl = $(item).find(".btn-tickets").attr("href");
      const price = undefined;

      const date = $(item).find(".date").text().trim();
      const time = getTime($(item).find(".time").text());
      const dateTime = `${date} ${time}`;
      const start_date = moment(dateTime, "ddd, MMM DD, YYYY h:mma");

      const artists = getArtist($(item));

      return {
        name,
        description,
        image,
        url,
        buyUrl,
        price,
        start_date,
        artists,
      };
    });

  return events;
}

async function main() {
  const venue = {
    venue: "PRYSM Chicago",
    provider: "PRYSM_CHICAGO",
    city: "Chicago",
    url: "https://www.prysmchicago.com/events",
  };

  const html = await extract(venue.url);

  const preEvents = transform(html, venue);

  await processEventsWithArtist(venue, preEvents);
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
