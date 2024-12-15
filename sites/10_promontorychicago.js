const moment = require("moment");

const { processEventsWithoutArtist } = require("../support/preEvents");
const { extract } = require("../support/extract");

function transform(data) {
  const events = JSON.parse(data.replace("window.apiEvents = ", ""));
  return events.map((item) => {
    const name = item.name.text;
    const description = item.summary;
    const image = item.logo.original.url;
    const {url} = item;
    const buyUrl = item.url;
    const price = undefined;

    const startDate = moment(item.start.utc);

    const artists = undefined;

    return {
      name,
      description,
      image,
      url,
      buyUrl,
      price,
      start_date: startDate,
      artists,
    };
  });
}

async function main() {
  const venue = {
    venue: "The Promontory",
    provider: "PROMONTORY",
    city: "Chicago",
    url: "https://www.promontorychicago.com/",
    source:
      "https://static2.16oncenterchicago.com/eventbrite/v2/json/promontory.js",
  };

  const data = await extract(venue.source);

  const preEvents = transform(data);

  await processEventsWithoutArtist(venue, preEvents);
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
