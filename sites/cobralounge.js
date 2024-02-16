const async = require("async");

const { getMetadata } = require("../metadata.js");
const { getGMapsLocation } = require("../gps.js");
const { getSpotify } = require("../spotify.js");
const { saveEvent } = require("../mint.js");
const { getArtistSingle } = require("../artist.js");
const logger = require("../support/logger.js")("COBRALOUNGE");

async function extract(url) {
  logger.info("scrapping", { url });
  // todo: this api-key might expire
  const response = await fetch(url, {
    headers: {
      "X-Api-Key": "8JMzxF43og372h6gQI9Bg3SO8ehBJnDa3ACPE3Gp",
    },
  });
  const data = await response.json();
  return data;
}

function transform(data, preEvent) {
  const events = data.data.map((event) => {
    return {
      name: event.name,
      image: event.images[0],
      url: event.url,
      start_date: event.date,
      description: event.description,
      buyUrl: event.url,
      price: event.ticket_types?.[0].price.total / 100,
      artists: event.artists?.map((artistName) => ({
        name: artistName,
      })),
      provider: preEvent.provider,
      venue: preEvent.venue,
      city: preEvent.city,
    };
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
  const url = "https://cobralounge.com/events/";
  const preEvent = {
    venue: "Cobra Lounge",
    provider: "COBRALOUNGE",
    city: "Chicago",
  };
  const location = await getGMapsLocation(preEvent);

  if (!location.website?.includes("cobralounge.com")) {
    logger.error("ERROR_WEBSITE", { url, maps: location.website });
  }

  if (!location.metadata) {
    const locationMetadata = await getMetadata(url);
    location.metadata = locationMetadata;
  }
  // todo: dice seems like a good reference for live music events
  const data = await extract(
    "https://events-api.dice.fm/v1/events?page[size]=24&types=linkout,event&filter[venues][]=Cobra%20Lounge"
  );

  const preEvents = transform(data, preEvent);

  await async.eachSeries(preEvents, async (preEvent) => {
    const artists = await getArtists(preEvent);

    const event = { ...preEvent, artists, location };
    console.log(JSON.stringify(event, null, 2));
    await saveEvent(event);
  });
}

main().then(() => {
  console.log("end");
});
