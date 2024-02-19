const cheerio = require("cheerio");
const async = require("async");
const moment = require("moment");
const path = require("path");

const { getMetadata } = require("../support/metadata.js");
const { getGMapsLocation } = require("../support/gps.js");
const { getSpotify } = require("../support/spotify.js");
const { saveEvent } = require("../support/mint.js");
const { getSocial } = require("../support/misc.js");
const { extract } = require("../support/extract.js");
const { regexTime, regexMoney } = require("../support/misc.js");
const { getArtistSingle, mergeArtist } = require("../support/artist.js");

const logger = require("../support/logger")(path.basename(__filename));

function transform(html, preEvent) {
  const $ = cheerio.load(html);

  const events = $("#middle article.type-show")
    .toArray()
    .map((item) => {
      const name = $(item).find("h2").text().trim();
      const image = `${preEvent.url}${$(item)
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

      const event = {
        name,
        image,
        url,
        start_date,
        description,
        buyUrl,
        price,
      };

      return event;
    });

  return events;
}

function transformDetails(html) {
  const $ = cheerio.load(html);
  const artists = [];

  $(".entry-content .band")
    .toArray()
    .map((item) => {
      const social = getSocial($(item).html());

      const website = $(item)
        .find(".details li")
        .filter((_index, _item) => $(_item).text() === "Band Website")
        .find("a")
        .attr("href");

      if (!Object.keys(social).length) {
        return;
      }

      artists.push({
        name: $(item).find(".show-title").text().trim(),
        metadata: {
          ...social,
          website,
        },
      });
    });

  return {
    artists,
  };
}

async function getDetails(url) {
  if (!url) {
    return;
  }

  const response = { artists: [] };

  const html = await extract(url);

  const details = transformDetails(html);

  await async.eachSeries(details.artists, async (preArtist) => {
    const artistSingle = await getArtistSingle(preArtist.name);

    const metadata = await getMetadata(preArtist.metadata.website);
    const spotify = await getSpotify(preArtist);

    const newArtist = mergeArtist(
      {
        metadata,
        spotify,
      },
      preArtist
    );

    if (!Object.keys(newArtist.metadata).length && artistSingle) {
      response.artists.push(artistSingle);
      return;
    }

    const artistMerged = mergeArtist(newArtist, artistSingle);

    if (artistMerged) {
      response.artists.push(artistMerged);
    }
  });

  return response;
}

async function main() {
  const venue = {
    venue: "Reggies Chicago",
    provider: "REGGIESLIVE",
    city: "Chicago",
    url: "https://www.reggieslive.com/",
  };
  const location = await getGMapsLocation(venue);

  if (!location) {
    return;
  }

  const html = await extract(venue.url);

  const preEvents = transform(html, venue);

  await async.eachSeries(preEvents, async (preEvent) => {
    const { name, image, url, start_date, description, buyUrl, price } =
      preEvent;
    const { artists } = await getDetails(preEvent.url);

    const event = {
      name,
      image,
      url,
      start_date,
      description,
      buyUrl,
      price,
      artists,
      location,
      provider: venue.provider,
      venue: venue.venue,
      city: venue.city,
    };

    await saveEvent(event);
  });

  logger.info("processed", { total: preEvents.length });
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
