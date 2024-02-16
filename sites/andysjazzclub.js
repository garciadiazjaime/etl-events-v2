const cheerio = require("cheerio");
const async = require("async");
const moment = require("moment");

const { getMetadata } = require("../metadata");
const { getGMapsLocation } = require("../gps");
const { getSpotify } = require("../spotify");
const { saveEvent } = require("../mint");
const { getArtistSingle } = require("../artist");
const { extract } = require("../support/extract");

const logger = require("../support/logger")("ANDYSJAZZCLUB");

function transform(html, preEvent) {
  const $ = cheerio.load(html);
  const regexTime = /(1[0-2]|0?[1-9]):([0-5][0-9])\s?([AaPp][Mm])/;

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
        price: data.offers?.price || undefined,
        provider: preEvent.provider,
        venue: preEvent.venue,
        city: preEvent.city,
        artists: [{ name: artistName }],
      };

      return event;
    });

  return events;
}

async function getArtists(event) {
  const artists = [];
  await async.eachSeries(event.artists, async (preArtist) => {
    const artist = await getArtistSingle(preArtist.name);

    if (!artist) {
      return;
    }

    const spotify = await getSpotify(artist);
    if (spotify) {
      artist.spotify = spotify;
    }

    artists.push(artist);
  });

  return artists;
}

async function main() {
  const url = "https://andysjazzclub.com/music-calendar/";
  const preEvent = {
    venue: "Andy's Jazz Club & Restaurant",
    provider: "ANDYSJAZZCLUB",
    city: "Chicago",
  };
  const location = await getGMapsLocation(preEvent);

  if (!location.website?.includes("andysjazzclub.com")) {
    logger.error("ERROR_WEBSITE", { url, maps: location.website });
  }

  if (!location.metadata) {
    const locationMetadata = await getMetadata(url);
    location.metadata = locationMetadata;
  }

  const html = await extract(url);

  const preEvents = transform(html, preEvent);

  await async.eachSeries(preEvents, async (preEvent) => {
    const artists = await getArtists(preEvent);

    const event = { ...preEvent, artists, location };
    console.log(JSON.stringify(event, null, 2));
    await saveEvent(event);
  });
}

if (require.main === module) {
  main().then(() => {
    console.log("end");
  });
}

module.exports = main;
