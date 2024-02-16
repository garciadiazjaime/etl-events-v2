const cheerio = require("cheerio");
const async = require("async");
const moment = require("moment");

const { getMetadata } = require("../metadata.js");
const { getGMapsLocation } = require("../gps.js");
const { getSpotify } = require("../spotify.js");
const { saveEvent } = require("../mint.js");
const { getArtistSingle } = require("../artist.js");
const logger = require("../support/logger.js")("SCHUBAS_TAVERN");

async function extract(url) {
  logger.info("scrapping", { url });

  const response = await fetch(url);

  const html = await response.text();

  return html;
}

function transform(html, preEvent) {
  const $ = cheerio.load(html);
  const regexTime = /(1[0-2]|0?[1-9]):([0-5][0-9])\s?([AaPp][Mm])/;

  const events = $("#filtered-events-list .seetickets-list-event-container")
    .toArray()
    .map((item) => {
      const name = $(item).find(".event-title").text().trim();
      const url = $(item).find(".event-title a").attr("href");
      const image = $(item).find("img").attr("src");
      const date = $(item).find(".event-date").text().trim();
      const time = $(item)
        .find(".see-doortime ")
        .text()
        .trim()
        .match(regexTime)?.[0]
        .replace(" ", "");

      const dateTime = `${date} ${time}`;

      const start_date = moment(dateTime, "ddd MMM D h:mma");
      const description = $(item).find(".doortime-showtime").text().trim();
      const buyUrl = $(item).find("a.seetickets-buy-btn").attr("href");

      const provider = preEvent.provider;
      const venue = preEvent.venue;
      const city = preEvent.city;

      const details = transformDetails($(item));

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
        artists: details.artists,
      };

      return event;
    });

  return events;
}

function gerArtists(value) {
  if (!value || value.includes(":")) {
    return [];
  }

  return value
    .replace("with ", "")
    .split(",")
    .map((name) => ({ name: name.trim() }));
}

function transformDetails($) {
  const mainArtist = gerArtists($.find(".headliners").text().trim());

  const artist = gerArtists($.find(".supporting-talent").text().trim());

  return {
    artists: [...mainArtist, ...artist],
  };
}

async function getDetails(event) {
  const response = {
    artists: [],
  };
  await async.eachSeries(event.artists, async (preArtist) => {
    const artist = await getArtistSingle(preArtist.name);

    if (!artist) {
      return;
    }

    const spotify = await getSpotify(artist);
    if (spotify) {
      artist.spotify = spotify;
    }

    response.artists.push(artist);
  });

  return response;
}

async function main() {
  const url = "https://subt.net/";
  const preEvent = {
    venue: "Subterranean",
    provider: "SUBTERRANEAN",
    city: "Chicago",
  };
  const location = await getGMapsLocation(preEvent);

  if (!location.website?.includes("subt.net")) {
    logger.error("ERROR_WEBSITE", { url, maps: location.website });
  }

  if (!location.metadata) {
    const locationMetadata = await getMetadata(url);
    location.metadata = locationMetadata;
  }

  const html = await extract(url);

  const preEvents = transform(html, preEvent);

  await async.eachSeries(preEvents, async (preEvent) => {
    const details = await getDetails(preEvent);

    delete preEvent.artists;
    const event = { ...preEvent, ...details, location };
    console.log(JSON.stringify(event, null, 2));
    await saveEvent(event);
  });
}

main().then(() => {
  console.log("end");
});
