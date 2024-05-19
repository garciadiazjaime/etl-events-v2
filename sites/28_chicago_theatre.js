const { extractJSON } = require("../support/extract");
const { processEventsWithArtist } = require("../support/preEvents");

function transform(data) {
  const events = [];

  data.results.forEach((item) => {
    events.push({
      name: item.name,
      image: item.default_image.url,
      url: item.msg_edp_url,
      start_date: new Date(item.show_times[0]?.iso_date_time),
      buyUrl: item.show_times[0]?.host_url,
      artists: [{ name: item.name }],
    });
  });

  return events;
}

async function main() {
  const venue = {
    venue: "Chicago Theatre",
    provider: "CHICAGO_THEATRE",
    city: "Chicago",
    url: "https://www.msg.com/calendar?category=music&venues=KovZpZA6AJ6A",
    source:
      "https://api.msg.com/v3.0/events?page=1&view=calendar&status=active,postponed&category=music&venue_id=KovZpZA6AJ6A",
  };

  // todo: token might expire
  const data = await extractJSON(venue.source, {
    headers: {
      Authorization: "Bearer e0554a52bf12b176ae14a9f85b60fcb2",
    },
  });
  const preEvents = transform(data);

  await processEventsWithArtist(venue, preEvents);
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
