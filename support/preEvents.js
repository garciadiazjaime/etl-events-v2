const async = require("async");
const path = require("path");

const { getGMapsLocation } = require("./gps");
const { saveEvent } = require("./mint");
const { getArtistSingle, mergeArtist } = require("./artist");

const logger = require("./logger")(path.basename(__filename));

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

    console.log(JSON.stringify(event, null, 2));

    await saveEvent(event);
  });

  logger.info("processed", { total: preEvents.length });
}

async function processEventsWithArtistDetails(venue, preEvents) {
  const location = await getGMapsLocation(venue);

  if (!location) {
    return;
  }

  await async.eachSeries(preEvents, async (preEvent) => {
    const artists = [];
    await async.eachSeries(preEvent.artists, async (preArtist) => {
      const artistSingle = await getArtistSingle(preArtist.name);

      const artistMerged = mergeArtist(artistSingle, preArtist);
      if (artistMerged) {
        artists.push(artistMerged);
      }
    });

    const event = {
      ...preEvent,
      artists,
      location,
      provider: venue.provider,
      venue: venue.venue,
      city: venue.city,
    };

    console.log(JSON.stringify(event, null, 2));

    await saveEvent(event);
  });

  logger.info("processed", { total: preEvents.length });
}

async function processEventWithArtistDetails(venue, location, preEvent) {
  const artists = [];

  await async.eachSeries(preEvent.artists, async (preArtist) => {
    const artistSingle = await getArtistSingle(preArtist.name);
    if (!artistSingle) {
      if (Object.keys(preArtist.metadata || {}).length) {
        artists.push(preArtist);
      }
      return;
    }

    const artistMerged = mergeArtist(artistSingle, preArtist);
    artists.push(artistMerged);
  });

  const event = {
    ...preEvent,
    artists,
    location,
    provider: venue.provider,
    venue: venue.venue,
    city: venue.city,
  };

  console.log(JSON.stringify(event, null, 2));

  await saveEvent(event);
}

async function processEventWithArtist(venue, location, preEvent) {
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
}

async function processEventsWithoutArtist(venue, preEvents) {
  const location = await getGMapsLocation(venue);

  if (!location) {
    return;
  }

  await async.eachSeries(preEvents, async (preEvent) => {
    const event = {
      ...preEvent,
      location,
      provider: venue.provider,
      venue: venue.venue,
      city: venue.city,
    };

    console.log(JSON.stringify(event, null, 2));

    await saveEvent(event);
  });

  logger.info("processed", { total: preEvents.length });
}

module.exports = {
  processEventsWithArtist,
  processEventWithArtistDetails,
  getArtistsDetails,
  processEventsWithArtistDetails,
  processEventWithArtist,
  processEventsWithoutArtist,
};
