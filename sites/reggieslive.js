const cheerio = require("cheerio");
const async = require("async");
const moment = require("moment");

const { getMetadata } = require("../metadata.js");
const { getGMapsLocation } = require("../gps.js");
const { getSpotify } = require("../spotify.js");
const { saveEvent } = require("../mint.js");
const { getSocial } = require("../misc.js");
const logger = require("../support/logger.js")("REGGIESLIVE");

async function extract(url) {
  logger.info("scrapping", { url });
  const response = await fetch(url);
  const html = response.text();

  return html;
}

function transform(html, preEvent) {
  const $ = cheerio.load(html);
  const regexTime = /(1[0-2]|0?[1-9]):([0-5][0-9]) ([AaPp][Mm])/;
  const regexMoney = /\$(\d)+/;

  const events = $("#middle article.type-show")
    .toArray()
    .map((item) => {
      const name = $(item).find("h2").text().trim();
      const image = `${preEvent.domain}${$(item)
        .find(".thumbnail img")
        .attr("src")}`;
      const url = $(item).find(".entry-footer a.expandshow").attr("href");
      const date = $(item).find(".entry-header time").attr("datetime");
      const timeText = $(item).find(".entry-footer .details li").text().trim();
      const time = timeText.match(regexTime)?.[0];

      const dateTime = `${date} ${time}`;

      const start_date = moment(dateTime, "YYYY-MM-DD h:mma");
      const description = $(item).find(".details").text().trim();
      const buyUrl = $(item).find("a.ticketfly").attr("href");
      const price = $(item)
        .find(".details")
        .text()
        .match(regexMoney)?.[0]
        ?.replace("$", "");
      const provider = preEvent.provider;
      const venue = preEvent.venue;
      const city = preEvent.city;

      const event = {
        name,
        image,
        url,
        start_date,
        description,
        provider,
        venue,
        city,
        buyUrl,
        price,
      };

      return event;
    });

  return events;
}

function transformDetails(html) {
  const $ = cheerio.load(html);
  const artists = $(".entry-content .band")
    .toArray()
    .map((item) => {
      const social = getSocial($(item).html());

      const website = $(item)
        .find(".details li")
        .filter((_index, _item) => $(_item).text() === "Band Website")
        .find("a")
        .attr("href");

      const artist = {
        name: $(item).find(".show-title").text().trim(),
        metadata: {
          ...social,
          website,
        },
      };
      return artist;
    });

  const details = {
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

    artist.metadata = {
      website: artist.metadata.website,
      image: metadata.image,
      twitter: metadata.twitter || artist.metadata.twitter,
      facebook: metadata.facebook || artist.metadata.facebook,
      youtube: metadata.youtube || artist.metadata.youtube,
      instagram: metadata.instagram || artist.metadata.instagram,
      tiktok: metadata.tiktok || artist.metadata.tiktok,
      soundcloud: metadata.soundcloud || artist.metadata.soundcloud,
      spotify: metadata.spotify || artist.metadata.spotify,
      appleMusic: metadata.appleMusic || artist.metadata.appleMusic,
      band_camp: artist.metadata.band_camp,
    };

    const spotify = await getSpotify(artist);
    if (spotify) {
      artist.spotify = spotify;
    }
  });

  return details;
}

async function main() {
  const url = "https://www.reggieslive.com/";
  const preEvent = {
    venue: "Reggies Chicago",
    provider: "REGGIESLIVE",
    city: "Chicago",
    domain: url,
  };
  const location = await getGMapsLocation(preEvent);

  if (!location.website?.includes("reggieslive.com")) {
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
