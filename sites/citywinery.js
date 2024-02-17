const async = require("async");
const path = require("path");

const { getGMapsLocation } = require("../support/gps.js");
const { saveEvent } = require("../support/mint.js");
const { getArtistSingle } = require("../support/artist.js");
const { extractJSON } = require("../support/extract.js");

const logger = require("../support/logger")(path.basename(__filename));

function transform(data, preEvent) {
  const url = `${preEvent.url}/${preEvent.city.toLowerCase()}/events`;
  const events = data
    .filter((event) => event.category === "music")
    .map((event) => {
      const artists = event.name.toLowerCase().includes("brunch")
        ? []
        : [{ name: event.name.split("-")[0]?.split("(")[0]?.trim() }];

      return {
        name: event.name,
        image: event.image,
        url: `${url}/${event.url}?${url}`,
        start_date: event.start,
        end_date: event.end,
        buyUrl: `${
          preEvent.url
        }/${preEvent.city.toLowerCase()}/ticket-selection?eventId=${event.url}`,
        price: event.startingPrice,
        provider: preEvent.provider,
        venue: preEvent.venue,
        city: preEvent.city,
        artists,
      };
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
  // todo: vivenu.com seems like a good reference for live music events
  const venue = {
    venue: "City Winery",
    provider: "CITY_WINERY",
    city: "Chicago",
    url: "https://citywinery.com",
  };
  const location = await getGMapsLocation(venue);

  if (!location) {
    return;
  }

  const data = await extractJSON(
    "https://vivenu.com/api/events/public/listings?sellerId=64d2a7b3db682dbe2baf69d8&top=1000&visibleInListing=true&endMin=2024-02-11T04%3A00%3A00.000Z"
  );

  const preEvents = transform(data, venue);

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

module.exports = main;
