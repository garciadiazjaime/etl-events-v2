const async = require("async");
const path = require("path");

const { getGMapsLocation } = require("./gps");
const { saveEvent } = require("./mint");
const { getArtistSingle, mergeArtist } = require("./artist");

const logger = require("./logger")(path.basename(__filename));

async function getArtistsDetails(event) {
  const response = { artists: [] };

  await async.eachSeries(event.artists, async (preArtist) => {
    const artist = await getArtistSingle(preArtist.name).catch((error) => {
      logger.error("getArtistSingle", { error, preArtist, event });
    });

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

      if (!artistSingle) {
        logger.info("ARTIST_UNKNOWN", preArtist);
        return;
      }

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
  const artists = [];

  await async.eachSeries(preEvent.artists, async (preArtist) => {
    const artistSingle = await getArtistSingle(preArtist.name).catch(() => {});
    if (!artistSingle) {
      logger.info("ARTIST_UNKNOWN", preArtist);
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

  if (!location || !preEvents) {
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

// used only by aggregator
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

    if (location.provider) {
      logger.info("PROVIDER_FOUND", {
        venue: location.slug,
        location: location.provider,
        provider: site.provider,
      });

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

// used only by aggregator
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

    if (location.provider) {
      // todo: check if events are repeated
      logger.info("PROVIDER_FOUND", {
        event: preEvent.name,
        date: preEvent.start_date,
        venue: location.slug,
        location: location.provider,
        provider: site.provider,
      });

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
