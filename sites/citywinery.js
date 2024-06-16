const { extractJSON } = require("../support/extract");
const { processEventsWithArtist } = require("../support/preEvents");

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

async function main() {
  // todo: vivenu.com seems like a good reference for live music events

  const venue = {
    venue: "City Winery",
    provider: "CITY_WINERY",
    city: "Chicago",
    url: "https://citywinery.com",
    source: `https://vivenu.com/api/events/public/listings?sellerId=64d2a7b3db682dbe2baf69d8&top=20&skip=0&visibleInListing=true&endMin=${new Date().toJSON()}`,
  };

  const data = await extractJSON(venue.source);

  const preEvents = transform(data, venue);

  await processEventsWithArtist(venue, preEvents);
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
