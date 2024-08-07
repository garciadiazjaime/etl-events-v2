const cheerio = require("cheerio");
const async = require("async");
const moment = require("moment");
const path = require("path");

const { getGMapsLocation } = require("../support/gps");
const { saveEvent } = require("../support/mint");
const { getSocialNetworkFrom, getInstagram } = require("../support/misc");
const { getArtistSingle, mergeArtist } = require("../support/artist");
const { extract } = require("../support/extract");

const logger = require("../support/logger")(path.basename(__filename));

function transform(html, venue) {
  const $ = cheerio.load(html);
  const regexTime = /(1[0-2]|0?[1-9]):([0-5][0-9])\s?([AaPp][Mm])/;

  const events = $(".tessera-card-deck .card")
    .toArray()
    .map((item) => {
      const venueName = $(item).find(".tessera-venue").text().trim();

      if (venueName?.toLocaleLowerCase().includes(venue.exclude)) {
        return null;
      }

      const name = $(item).find(".card-title").text().trim();
      const url = $(item).find(".card-body a").attr("href");
      const image = $(item).find(".card-header img").attr("src");
      const date = $(item).find(".date").text().trim();
      const time = $(item)
        .find(".tessera-doorsTime")
        .text()
        .trim()
        .match(regexTime)?.[0]
        .replace(" ", "");

      const dateTime = `${date} ${time}`;

      const startDate = moment(dateTime, "MMM DD h:mma");
      const description = $(item)
        .find(".show-details")
        .text()
        .trim()
        .replace(/(\r\n|\n|\r)+/gm, "")
        .replace(/(\s)+/g, " ");

      const event = {
        name,
        image,
        url,
        start_date: startDate,
        description,
      };

      return event;
    })
    .filter((item) => item);

  return events;
}

function transformDetails(html) {
  const $ = cheerio.load(html);

  const artists = $(".tessera-artists h2 a")
    .toArray()
    .map((item) => {
      const name = $(item).text().trim();
      const link = $(item).attr("href");
      const socialNetwork = getSocialNetworkFrom(link);
      if (socialNetwork.instagram) {
        socialNetwork.instagram = getInstagram(socialNetwork.instagram);
      }

      const artist = {
        name,
        metadata: {
          ...socialNetwork,
        },
      };

      return artist;
    });

  const extraLinks = $(".about-show iframe")
    .toArray()
    .map((item) => $(item).attr("src"));

  if (artists.length === extraLinks.length) {
    artists.forEach((artist, index) => {
      const socialNetwork = getSocialNetworkFrom(extraLinks[index]);
      if (!socialNetwork) {
        return;
      }

      const [prop, network] = Object.entries(socialNetwork)[0];
      artist.metadata[prop] = network; // eslint-disable-line
    });
  } else {
    // todo: when number does not match, maybe at least one value can be use
    logger.info("NO_EXTRA_LINKS", { artists, extraLinks });
  }

  const details = {
    artists,
  };

  return details;
}

async function getDetails(url) {
  if (!url) {
    return {};
  }

  const html = await extract(url);

  const details = transformDetails(html);

  const response = {
    artists: [],
  };

  await async.eachSeries(details.artists, async (preArtist) => {
    const artistSingle = await getArtistSingle(preArtist.name).catch(() => {});

    if (!artistSingle) {
      logger.info("ARTIST_UNKNOWN", preArtist);

      return;
    }

    const artistMerged = mergeArtist(artistSingle, preArtist);

    response.artists.push(artistMerged);
  });

  return response;
}

async function main() {
  // todo: headless browser might be able to pull price
  const venues = [
    {
      venue: "Schubas Tavern",
      provider: "SCHUBAS_TAVERN",
      city: "Chicago",
      url: "https://lh-st.com/",
      exclude: "lincoln",
    },
    {
      venue: "Lincoln Hall",
      provider: "LINCOLN_HALL",
      city: "Chicago",
      url: "https://lh-st.com/",
      exclude: "schubas",
    },
  ];
  await async.eachSeries(venues, async (venue) => {
    const location = await getGMapsLocation(venue);

    if (!location) {
      return;
    }

    const html = await extract(venue.url);

    const preEvents = transform(html, venue);

    await async.eachSeries(preEvents, async (preEvent) => {
      const { artists } = await getDetails(preEvent.url);

      const event = {
        ...preEvent,
        artists,
        location,
        provider: venue.provider,
        venue: venue.venue,
        city: venue.city,
      };

      await saveEvent(event);
    });

    logger.info("processed", {
      total: preEvents.length,
      provider: venue.provider,
    });
  });
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
