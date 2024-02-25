const { processEventsWithArtistDetails } = require("../support/preEvents");
const { extractJSON } = require("../support/extract");

function transform(data) {
  const events = data._embedded?.events.map((event) => ({
    name: event.name,
    image: event.images[0]?.url,
    url: event.url,
    start_date: event.dates.start?.dateTime,
    description: event.info,
    buyUrl: event.url,
    price: event.priceRanges?.[0].min,
    artists: event._embedded.attractions?.map((artist) => {
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
  }));

  return events;
}

async function main() {
  const venue = {
    venue: "The Promontory",
    provider: "PROMONTORY",
    city: "Chicago",
    url: "https://www.promontorychicago.com/",
  };

  // todo: artists empty
  // todo: this api-key might expire
  // todo: this is the same as thaliahallchicago, emptybottle
  const html = await extractJSON(
    "https://app.ticketmaster.com/discovery/v2/events.json?size=50&apikey=YCX1KG7F2G6qU8yzFevLpPfV8FXtiF3u&venueId=rZ7HnEZ178Zp4",
  );

  const preEvents = transform(html);

  await processEventsWithArtistDetails(venue, preEvents);
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
