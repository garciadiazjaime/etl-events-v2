const cheerio = require("cheerio");
const async = require("async");
const moment = require("moment");

const { getMetadata } = require("../metadata.js");
const { getGMapsLocation } = require("../gps.js");
const { getSpotify } = require("../spotify.js");
const { saveEvent } = require("../mint.js");
const { getArtistSingle } = require("../artist.js");
const logger = require("../support/logger.js")("FITZGERALDS");

async function extract(url) {
  logger.info("scrapping", { url });
  const response = await fetch(url);
  const html = await response.text();

  return html;
}

function transform(html, preEvent) {
  const $ = cheerio.load(html);
  const regexTime = /(1[0-2]|0?[1-9]):([0-5][0-9]) ([AaPp][Mm])/;
  const regexMoney = /\$(\d)+/;

  const events = $(".tw-plugin-upcoming-event-list .tw-section")
    .toArray()
    .map((item) => {
      const name = $(item).find(".tw-name").text().trim();
      const image = $(item).find(".tw-image img").attr("src");
      const url = $(item).find(".tw-name a").attr("href");
      const date = $(item).find(".tw-event-date").text().trim();
      const time = $(item)
        .find(".tw-event-time")
        .text()
        .trim()
        .match(regexTime)?.[0];

      const dateTime = `${date} ${time}`;

      const start_date = moment(dateTime, "ddd MMM D h:mm a");
      const description = $(item).find(".tw-price").text().trim();
      const buyUrl = $(item).find("a.tw-buy-tix-btn").attr("href");
      const price = $(item)
        .find(".tw-price")
        .text()
        .match(regexMoney)?.[0]
        ?.replace("$", "");
      const provider = preEvent.provider;
      const venue = preEvent.venue;
      const city = preEvent.city;

      const event = {
        name,
        image,
        url,
        start_date,
        description,
        provider,
        venue,
        city,
        buyUrl,
        price,
      };

      return event;
    });

  return events;
}

function transformDetails(html) {
  const $ = cheerio.load(html);
  const artists = $(".tw-artists-container .tw-artist")
    .toArray()
    .map((item) => {
      const name = $(item).find(".tw-name").text().trim();

      const artist = {
        name,
      };

      return artist;
    });

  const details = {
    artists,
  };

  return details;
}

async function getDetails(url) {
  if (!url) {
    return;
  }

  const html = await extract(url);

  const details = transformDetails(html);
  const response = {
    artists: [],
  };

  await async.eachSeries(details.artists, async (preArtist) => {
    const artistSingle = await getArtistSingle(preArtist.name);

    if (!artistSingle) {
      return;
    }

    const artist = {
      ...artistSingle,
    };

    const spotify = await getSpotify(artist);
    if (spotify) {
      artist.spotify = spotify;
    }

    response.artists.push(artist);
  });

  return response;
}

async function main() {
  // todo: Pagination
  const url = "https://www.fitzgeraldsnightclub.com/shows/list/";
  const preEvent = {
    venue: "FitzGerald's",
    provider: "FITZGERALDS",
    city: "Chicago",
  };
  const location = await getGMapsLocation(preEvent);

  if (!location.website?.includes("fitzgeraldsnightclub.com")) {
    logger.error("ERROR_WEBSITE", { url, maps: location.website });
  }

  if (!location.metadata) {
    const locationMetadata = await getMetadata(url);
    location.metadata = locationMetadata;
  }

  const html = await extract(url);

  const preEvents = transform(html, preEvent);

  await async.eachSeries(preEvents, async (preEvent) => {
    const details = await getDetails(preEvent.url);

    const event = { ...preEvent, ...details, location };
    console.log(JSON.stringify(event, null, 2));
    await saveEvent(event);
  });
}

main().then(() => {
  console.log("end");
});
