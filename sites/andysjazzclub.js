const cheerio = require("cheerio");
const async = require("async");
const moment = require("moment");
const path = require("path");

const { getGMapsLocation } = require("../support/gps");
const { saveEvent } = require("../support/mint");
const { getArtistSingle } = require("../support/artist");
const { extract } = require("../support/extract");
const { regexTime } = require("../support/misc");

const logger = require("../support/logger")(path.basename(__filename));

function transform(html, preEvent) {
  const $ = cheerio.load(html);

  const events = $('.mec-month-side [type="application/ld+json"]')
    .toArray()
    .map((item) => {
      const data = JSON.parse(
        $(item)
          .text()
          .replace(/(<([^>]+)>)/gi, "")
          .replace(/(\r\n|\n|\r)/gm, "")
      );

      const descriptionContent = data.description
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
      const $$ = cheerio.load(descriptionContent);
      const artistName = $$("em strong").first().text().trim().split("(")[0];
      const description = $$("strong").first().text().trim();

      const time = description.match(regexTime)?.[0];
      const dateTime = `${data.startDate} ${time}`;
      const start_date = moment(dateTime, "YYYY-MM-DD h:mma");

      const event = {
        name: data.name,
        image: data.image,
        url: data.url,
        start_date,
        description,
        price: data.offers?.price,
        provider: preEvent.provider,
        venue: preEvent.venue,
        city: preEvent.city,
        artists: [{ name: artistName }],
      };

      return event;
    });

  return events;
}

async function getDetails(event) {
  const response = { artists: [] };

  await async.eachSeries(event.artists, async (preArtist) => {
    const artist = await getArtistSingle(preArtist.name);

    if (artist) {
      response.artists.push(artist);
    }
  });

  return response;
}

async function etl() {
  const venue = {
    venue: "Andy's Jazz Club & Restaurant",
    provider: "ANDYSJAZZCLUB",
    city: "Chicago",
    url: "https://andysjazzclub.com/music-calendar/",
  };
  const location = await getGMapsLocation(venue);

  if (!location) {
    return;
  }

  const html = await extract(venue.url);

  const preEvents = transform(html, venue);

  await async.eachSeries(preEvents, async (preEvent) => {
    const { artists } = await getDetails(preEvent);

    const event = { ...preEvent, artists, location };
    console.log(JSON.stringify(event, null, 2));

    await saveEvent(event);
  });
}

async function main() {
  logger.info("start");

  await etl();

  logger.info("end");
}

if (require.main === module) {
  main().then(() => {});
}
