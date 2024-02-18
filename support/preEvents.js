const async = require("async");
const path = require("path");

const { getGMapsLocation } = require("../support/gps.js");
const { saveEvent } = require("../support/mint.js");
const { getArtistSingle } = require("../support/artist.js");

const logger = require("../support/logger")(path.basename(__filename));

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

async function processEventsWithArtist(venue, preEvents) {
  const location = await getGMapsLocation(venue);

  if (!location) {
    return;
  }

  await async.eachSeries(preEvents, async (preEvent) => {
    const { artists } = await getDetails(preEvent);

    const event = { ...preEvent, artists, location };

    await saveEvent(event);
  });

  logger.info("processed", { total: preEvents.length });
}

module.exports = {
  processEventsWithArtist,
};
