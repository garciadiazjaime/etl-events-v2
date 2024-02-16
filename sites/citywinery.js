const async = require("async");

const { getMetadata } = require("../metadata.js");
const { getGMapsLocation } = require("../gps.js");
const { getSpotify } = require("../spotify.js");
const { saveEvent } = require("../mint.js");
const { getArtistSingle } = require("../artist.js");
const logger = require("../support/logger.js")("COBRALOUNGE");

async function extract(url) {
  logger.info("scrapping", { url });

  const response = await fetch(url);

  const data = await response.json();

  return data;
}

function transform(data, preEvent, domain) {
  const url = `${domain}/${preEvent.city.toLowerCase()}/events`;
  const events = data
    .filter((event) => event.category === "music")
    .map((event) => {
      return {
        name: event.name,
        image: event.image,
        url: `${url}/${event.url}?${url}`,
        start_date: event.start,
        end_date: event.end,
        buyUrl: `${domain}/${preEvent.city.toLowerCase()}/ticket-selection?eventId=${
          event.url
        }`,
        price: event.startingPrice,
        provider: preEvent.provider,
        venue: preEvent.venue,
        city: preEvent.city,
      };
    });

  return events;
}

async function getArtists(event) {
  const artistName = event.name.split("-")[0]?.split("(")[0]?.trim();

  if (artistName.toLowerCase().includes("brunch")) {
    return;
  }

  const artist = await getArtistSingle(artistName);

  if (!artist) {
    return;
  }

  const spotify = await getSpotify(artist);
  if (spotify) {
    artist.spotify = spotify;
  }

  return [artist];
}

async function main() {
  const url = "https://citywinery.com";
  const preEvent = {
    venue: "City Winery",
    provider: "CITY_WINERY",
    city: "Chicago",
  };
  const location = await getGMapsLocation(preEvent);

  if (!location.website?.includes("citywinery.com")) {
    logger.error("ERROR_WEBSITE", { url, maps: location.website });
  }

  if (!location.metadata) {
    const locationMetadata = await getMetadata(url);
    location.metadata = locationMetadata;
  }
  // todo: vivenu.com seems like a good reference for live music events
  const data = await extract(
    "https://vivenu.com/api/events/public/listings?sellerId=64d2a7b3db682dbe2baf69d8&top=1000&visibleInListing=true&endMin=2024-02-11T04%3A00%3A00.000Z"
  );

  const preEvents = transform(data, preEvent, url);

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
