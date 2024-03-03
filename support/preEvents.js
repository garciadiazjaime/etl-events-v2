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

    await saveEvent(event);
  });

  logger.info("processed", {
    total: preEvents.length,
    provider: venue.provider,
  });
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

    await saveEvent(event);
  });

  logger.info("processed", {
    total: preEvents.length,
    provider: venue.provider,
  });
}

async function processEventWithArtistDetails(venue, location, preEvent) {
  logger.info("processing", { name: preEvent.name });
  const artists = [];

  await async.eachSeries(preEvent.artists, async (preArtist) => {
    const artistSingle = await getArtistSingle(preArtist.name);
    if (!artistSingle) {
      logger.info("ERROR_ARTIST_UNKNOWN", preArtist);
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

    await saveEvent(event);
  });

  logger.info("processed", {
    total: preEvents.length,
    provider: venue.provider,
  });
}

async function processEventsWithoutArtistAndLocation(preEvents, site) {
  await async.eachSeries(preEvents, async (preEvent) => {
    const venue = {
      venue: preEvent.venue,
      provider: site.provider,
      city: site.city,
    };
    const location = await getGMapsLocation(venue, false);

    if (!location) {
      return;
    }

    const event = {
      ...preEvent,
      location,
      provider: venue.provider,
      venue: venue.venue,
      city: venue.city,
    };

    await saveEvent(event);
  });

  logger.info("processed", {
    total: preEvents.length,
    provider: site.provider,
  });
}

async function processEventsWithArtistWithoutLocation(preEvents, site) {
  await async.eachSeries(preEvents, async (preEvent) => {
    const venue = {
      venue: preEvent.venue,
      provider: site.provider,
      city: site.city,
    };
    const location = await getGMapsLocation(venue, false);

    if (!location) {
      return;
    }

    const { artists } = await getArtistsDetails(preEvent);

    const event = {
      ...preEvent,
      artists,
      location,
      provider: venue.provider,
      venue: venue.venue,
      city: venue.city,
    };

    await saveEvent(event);
  });

  logger.info("processed", {
    total: preEvents.length,
    provider: site.provider,
  });
}

module.exports = {
  getArtistsDetails,
  processEventsWithArtist,
  processEventsWithArtistDetails,
  processEventsWithoutArtist,
  processEventsWithoutArtistAndLocation,
  processEventsWithArtistWithoutLocation,
  processEventWithArtistDetails,
  processEventWithArtist,
};
