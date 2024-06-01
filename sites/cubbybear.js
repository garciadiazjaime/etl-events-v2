const moment = require("moment");

const { extractPost } = require("../support/extract");
const { processEventsWithoutArtist } = require("../support/preEvents");

function secondsToHHMM(value) {
  const d = Number(value);
  const h = Math.floor(d / 3600);
  const m = Math.floor((d % 3600) / 60);

  const hDisplay = `${h}:`;
  const mDisplay = m > 0 ? m : "";
  return hDisplay + mDisplay;
}

function transform(data) {
  const events = data?.data?.customPageSection?.upcomingCalendarEvents.map(
    (item) => {
      const { name } = item;
      const description = item.description || item.eventTimeDescription;
      const image = item.photoUrl;
      const url = `https://www.cubbybear.com/events/${item.slug}`;
      const buyUrl = item.externalLinkUrl ? item.externalLinkUrl : undefined;
      const price = undefined;

      const date = item.startAt;
      const time = secondsToHHMM(item.startTime);
      const dateTime = `${date} ${time}`;
      const startDate = moment(dateTime, "YYYY-MM-DD h:mm");

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
    }
  );

  return events;
}

async function main() {
  const venue = {
    venue: "The Cubby Bear Chicago",
    provider: "CUBBY_BEAR_CHICAGO",
    city: "Chicago",
    url: "https://www.cubbybear.com/graphql",
  };

  // todo: request might by blocked
  const headers = {
    "content-type": "application/json",
    Referer: "https://www.cubbybear.com/live-music",
  };
  const payload = JSON.stringify({
    variables: {
      rangeStartAt: new Date().toJSON(),
      limit: 60,
      sectionId: 2673661,
    },
    extensions: {
      operationId: "PopmenuClient/93cabb8b40d7337158b20b4383348530",
    },
  });

  const html = await extractPost(venue.url, headers, payload);

  const preEvents = transform(html);

  await processEventsWithoutArtist(venue, preEvents);
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
