const async = require("async");
const path = require("path");

const { getGMapsLocation } = require("../support/gps");
const { saveEvent } = require("../support/mint");
const { getArtistSingle, mergeArtist } = require("../support/artist");
const { extractJSON } = require("../support/extract");

const logger = require("../support/logger")(path.basename(__filename));

function transform(data, location) {
  const { _embedded: embedded } = data;

  const events = embedded?.events.map((event) => {
    const {
      _embedded: { attractions },
    } = event;

    return {
      name: event.name,
      image: event.images[0]?.url,
      url: event.url,
      start_date: event.dates.start?.dateTime,
      description: event.info,
      buyUrl: event.url,
      price: event.priceRanges?.[0].min,
      artists: attractions?.map((artist) => {
        const metadata = artist.externalLinks
          ? {
              youtube: artist.externalLinks.youtube?.[0].url,
              twitter: artist.externalLinks.twitter?.[0].url,
              appleMusic: artist.externalLinks.itunes?.[0].url,
              facebook: artist.externalLinks.facebook?.[0].url,
              spotify: artist.externalLinks.spotify?.[0].url,
              instagram: artist.externalLinks.instagram?.[0].url,
              website: artist.externalLinks.homepage?.[0].url,
              wiki: artist.externalLinks.wiki?.[0].url,
              musicbrainz: artist.externalLinks.musicbrainz?.[0].url,
              lastfm: artist.externalLinks.lastfm?.[0].url,
            }
          : {};

        if (artist.images?.[0]) {
          metadata.image = artist.images?.[0].url;
        }

        const genres = Array.isArray(artist.classifications)
          ? artist.classifications.reduce((accumulator, classification) => {
              if (classification.genre?.name) {
                accumulator.push({
                  name: classification.genre.name,
                });
              }
              if (classification.subGenre?.name) {
                accumulator.push({
                  name: classification.subGenre.name,
                });
              }

              return accumulator;
            }, [])
          : [];

        // todo: save ticketmaster in BE
        return {
          name: artist.name,
          ticketmaster: {
            id: artist.id,
            url: artist.url,
          },
          genres,
          metadata,
        };
      }),
      provider: location.provider,
      venue: location.venue,
      city: location.city,
    };
  });

  return events;
}

async function getDetails(event) {
  const response = { artists: [] };

  await async.eachSeries(event.artists, async (preArtist) => {
    const artist = await getArtistSingle(preArtist.name);

    if (!artist) {
      logger.info("ARTIST_UNKNOWN", preArtist);
      return;
    }

    const artistMerged = mergeArtist(artist, preArtist);

    response.artists.push(artistMerged);
  });

  return response;
}

async function main() {
  const venue = {
    venue: "Evanston SPACE",
    provider: "EVANSTON_SPACE",
    city: "Chicago",
    website: "https://www.evanstonspace.com/",
  };
  const location = await getGMapsLocation(venue);

  if (!location) {
    return;
  }

  // todo: this api-key might expire
  // todo: this is the same as thaliahallchicago
  const html = await extractJSON(
    "https://app.ticketmaster.com/discovery/v2/events.json?size=50&apikey=8GdH3nQcFnnZkzWGuPSGkh9oIKUGjffQ&venueId=KovZpakJQe&venueId=rZ7HnEZ173FQ4&venueId=rZ7HnEZ17fSA4&source=ticketmaster,ticketweb",
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const preEvents = transform(html, venue);

  await async.eachSeries(preEvents, async (preEvent) => {
    const { artists } = await getDetails(preEvent);

    const event = { ...preEvent, artists, location };

    await saveEvent(event);
  });

  logger.info("processed", {
    total: preEvents.length,
    provider: venue.provider,
  });
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
