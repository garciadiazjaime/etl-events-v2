const cheerio = require("cheerio");
const async = require("async");
const moment = require("moment");

const { getMetadata } = require("../metadata.js");
const { getGMapsLocation } = require("../gps.js");
const { getSpotify } = require("../spotify.js");
const { saveEvent } = require("../mint.js");
const logger = require("../support/logger.js")("HIDEOUTCHICAGO");

async function extract(url) {
  logger.info("scrapping", { url });
  const response = await fetch(url);
  const html = await response.text();

  return html;
}

function transformDetails(html) {
  const $ = cheerio.load(html);
  const price = $(".eventCost").text().trim().match(/\d+/)?.[0];
  const buyUrl = $(".on-sale a").attr("href");
  const artists = $(".singleEventDescription a")
    .toArray()
    .map((item) => ({
      name: $(item).text().trim(),
      metadata: {
        website: $(item).attr("href"),
      },
    }));

  const details = {
    price,
    buyUrl,
    artists,
  };

  return details;
}

async function getDetails(url) {
  if (!url) {
    return;
  }

  const html = await extract(url);

  const details = transformDetails(html);

  await async.eachSeries(details.artists, async (artist) => {
    const metadata = await getMetadata(artist.metadata.website);
    console.log(metadata);
    artist.metadata = {
      website: artist.metadata.website,
      ...metadata,
    };

    const spotify = await getSpotify(artist);
    if (spotify) {
      artist.spotify = spotify;
    }
  });

  return details;
}

function transform(html, preEvent) {
  const $ = cheerio.load(html);
  const regexTime = /(1[0-2]|0?[1-9]):([0-5][0-9])([AaPp][Mm])/;

  const events = $(".rhpSingleEvent")
    .toArray()
    .map((item) => {
      const name = $(item).find("h2").text().trim();
      const image = $(item).find(".eventListImage").attr("src");
      const url = $(item).find(".url").attr("href");
      const date = $(item).find("#eventDate").text().trim();
      const timeText = $(item).find(".eventDoorStartDate span").text().trim();

      const time = timeText.match(regexTime)[0];
      const dateTime = `${date} ${time}`;

      const start_date = moment(dateTime, "ddd, MMM DD, YYYY h:mma");
      const description = $(item).find(".eventDoorStartDate").text().trim();

      const event = {
        name,
        image,
        url,
        start_date,
        description,
        provider: preEvent.provider,
        venue: preEvent.venue,
        city: preEvent.city,
      };

      return event;
    });

  return events;
}

async function main() {
  const preEvent = {
    venue: "Hideout Chicago",
    provider: "HIDEOUTCHICAGO",
    city: "Chicago",
  };
  const location = await getGMapsLocation(preEvent);
  const url = "https://hideoutchicago.com/";

  if (!location.website?.includes("hideoutchicago.com")) {
    logger.error("ERROR_WEBSITE", { url, maps: location.website });
  }

  if (!location.metadata) {
    const locationMetadata = await getMetadata(url);
    location.metadata = locationMetadata;
  }

  const html = await extract(url);

  const preEvents = transform(html, preEvent);

  await async.eachSeries(preEvents, async (preEvent) => {
    const details = await getDetails(preEvent.url);
    const event = { ...preEvent, ...details, location };
    console.log(JSON.stringify(event, null, 2));
    await saveEvent(event);
  });
}

main().then(() => {
  console.log("end");
});
