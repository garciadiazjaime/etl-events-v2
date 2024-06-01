const { extractJSON } = require("../support/extract");
const { processEventsWithArtist } = require("../support/preEvents");

function transform(data, preEvent) {
  const events = data.data.map((event) => {
    return {
      name: event.name,
      image: event.images[0],
      url: event.url,
      start_date: event.date,
      description: event.description.replace(/\W/g, " "),
      buyUrl: event.url,
      price: (event.ticket_types[0]?.price.total || 0) / 100 || "",
      artists: event.artists?.map((artistName) => ({
        name: artistName,
      })),
      provider: preEvent.provider,
      venue: preEvent.venue,
      city: preEvent.city,
    };
  });

  return events;
}

async function main() {
  const venue = {
    venue: "Cobra Lounge",
    provider: "COBRALOUNGE",
    city: "Chicago",
    url: "https://cobralounge.com/events/",
  };

  // todo: dice seems like a good reference for live music events
  const data = await extractJSON(
    "https://events-api.dice.fm/v1/events?page[size]=24&types=linkout,event&filter[venues][]=Cobra%20Lounge",
    {
      headers: {
        "X-Api-Key": "8JMzxF43og372h6gQI9Bg3SO8ehBJnDa3ACPE3Gp",
      },
    }
  );

  const preEvents = transform(data, venue);

  await processEventsWithArtist(venue, preEvents);
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
