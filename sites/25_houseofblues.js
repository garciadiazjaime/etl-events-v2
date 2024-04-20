const { extractJSON } = require("../support/extract");
const { processEventsWithArtist } = require("../support/preEvents");

function transform(data) {
  const events = [];

  data.result.forEach((item) => {
    if (!item.artists.length) {
      return;
    }

    events.push({
      name: item.title,
      image: item.eventImageLocation,
      url: `https://www.houseofblues.com/chicago/EventDetail?tmeventid=${item.eventID}&offerid=0`,
      start_date: new Date(item.eventTime),
      price: item.priceLevels?.[0],
      buyUrl: item.ticketUrl,
      artists: item.artists.map(({ name }) => ({ name })),
    });
  });

  return events;
}

async function main() {
  const venue = {
    venue: "House of Blues Chicago",
    provider: "HOUSE_OF_BLUES",
    city: "Chicago",
    url: "https://www.houseofblues.com/chicago/api/EventCalendar/GetEvents?startDate=4/19/2024&endDate=5/1/2024&venueIds=32905&limit=200&offset=1&genre=&artist=&priceLevel=&offerType=Foundation%20Room%20Event,Foundation%20Room%20Event%20-%20Priority,Crossroads%20Music,Crossroads%20Music%20-%20Priority,STANDARD,STANDARD%20-%20Priority",
  };

  const data = await extractJSON(venue.url);

  const preEvents = transform(JSON.parse(data));

  await processEventsWithArtist(venue, preEvents.slice(0, 1));
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
