const { processEventsWithArtistDetails } = require("../support/preEvents");
const { extractJSON } = require("../support/extract");

const emojisRegex =
  /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}]/gu;

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
      description: event.info.replace(emojisRegex, ""),
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

async function main() {
  const venue = {
    venue: "The Empty Bottle",
    provider: "EMPTY_BOTTLE",
    city: "Chicago",
    url: "https://www.emptybottle.com/",
  };

  // todo: this api-key might expire
  // todo: this is the same as thaliahallchicago
  const html = await extractJSON(
    "https://app.ticketmaster.com/discovery/v2/events.json?size=50&apikey=GmC9AB6l4pDhA5yhg4dgD3G0AEDK8wmL&venueId=KovZpZAId16A&venueId=rZ7HnEZ178O8A&venueId=rZ7HnEZ17a4Af&source=ticketmaster,ticketweb",
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const preEvents = transform(html);

  await processEventsWithArtistDetails(venue, preEvents);
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
