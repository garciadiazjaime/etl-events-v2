const async = require("async");
const path = require("path");

const { getGMapsLocation } = require("../support/gps");
const { saveEvent } = require("../support/mint");
const { getArtistSingle } = require("../support/artist");
const { extractJSON } = require("../support/extract");
const { mergeArtist } = require("../support/artist");
const { getSpotify } = require("../support/spotify");
const { getMetadata } = require("../support/metadata");

const logger = require("../support/logger")(path.basename(__filename));

function transform(data) {
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
    };
  });

  return events;
}

async function getDetails(event) {
  const response = { artists: [] };

  await async.eachSeries(event.artists, async (preArtist) => {
    const artistSingle = await getArtistSingle(preArtist.name);

    const metadata = await getMetadata(preArtist.metadata.website);
    const spotify = await getSpotify(preArtist);

    const newArtist = mergeArtist(
      {
        metadata,
        spotify,
      },
      preArtist
    );

    if (!Object.keys(newArtist.metadata).length && artistSingle) {
      response.artists.push(artistSingle);
      return;
    }

    const artistMerged = mergeArtist(newArtist, artistSingle);

    if (artistMerged) {
      response.artists.push(artistMerged);
    }
  });

  return response;
}

async function main() {
  const venue = {
    venue: "Thalia Hall",
    provider: "THALIA_HALL",
    city: "Chicago",
    url: "https://www.thaliahallchicago.com/",
  };
  const location = await getGMapsLocation(venue);

  if (!location) {
    return;
  }

  // todo: this api-key might expire
  const html = await extractJSON(
    "https://app.ticketmaster.com/discovery/v2/eventson?size=50&apikey=Mj9g4ZY7tXTmixNb7zMOAP85WPGAfFL8&venueId=rZ7HnEZ17aJq7&venueId=KovZpZAktlaA",
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const preEvents = transform(html);

  await async.eachSeries(preEvents, async (preEvent) => {
    const { artists } = await getDetails(preEvent);

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

  logger.info("processed", { total: preEvents.length });
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
