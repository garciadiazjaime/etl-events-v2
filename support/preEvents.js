const async = require('async');
const path = require('path');

const { getGMapsLocation } = require('./gps.js');
const { saveEvent } = require('./mint.js');
const { getArtistSingle } = require('./artist.js');

const logger = require('./logger')(path.basename(__filename));

async function getArtistsDetails(event) {
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
    const { artists } = await getArtistsDetails(preEvent);

    const event = {
      ...preEvent,
      artists,
      location,
      provider: venue.provider,
      venue: venue.venue,
      city: venue.city,
    };

    // console.log(JSON.stringify(event, null, 2));

    await saveEvent(event);
  });

  logger.info('processed', { total: preEvents.length });
}

module.exports = {
  processEventsWithArtist,
  getArtistsDetails,
};
