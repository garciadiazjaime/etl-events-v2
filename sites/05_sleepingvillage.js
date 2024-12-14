const { extractJSON } = require("../support/extract");
const { processEventsWithArtist } = require("../support/preEvents");
const { removeHTML, getPrice, getStartDate } = require("../support/misc");

function transform(data) {
  const events = data.map((event) => {
    const startDate = getStartDate(
      removeHTML(event.dateTime),
      "ddd, MMM DD h:mma"
    );

    return {
      name: event.title,
      image: event.image,
      url: event.permalink,
      start_date: startDate,
      description: removeHTML(event.description),
      buyUrl: event.ticket?.link,
      price: getPrice(event.fromPrice),
      artists: event.lineup?.standard?.map(({ title }) => ({
        name: title,
      })),
    };
  });

  return events;
}

async function main() {
  const venue = {
    venue: "Sleeping Village",
    provider: "SLEEPING_VILLAGE",
    city: "Chicago",
    url: "https://sleeping-village.com/events/",
  };

  // todo: dice seems like a good reference for live music events
  const data = await extractJSON(
    "https://sleeping-village.com/api/plot/v1/listings?currentpage=1&notLoaded=false&listingsPerPage=48&_locale=user"
  );

  const preEvents = transform(data, venue);

  await processEventsWithArtist(venue, preEvents);
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
