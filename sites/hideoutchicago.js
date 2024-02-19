const cheerio = require('cheerio');
const async = require('async');
const moment = require('moment');
const path = require('path');

const { getMetadata } = require('../support/metadata');
const { getGMapsLocation } = require('../support/gps');
const { getSpotify } = require('../support/spotify');
const { saveEvent } = require('../support/mint');
const { extract } = require('../support/extract');
const { getArtistSingle } = require('../support/artist');
const { regexTime } = require('../support/misc');

const logger = require('../support/logger')(path.basename(__filename));

function transformEventDetails(html) {
  const $ = cheerio.load(html);
  const price = $('.eventCost').text().trim().match(/\d+/)?.[0];
  const buyUrl = $('.on-sale a').attr('href');
  const artists = $('.singleEventDescription a')
    .toArray()
    .map((item) => ({
      name: $(item).text().trim(),
      metadata: {
        website: $(item).attr('href'),
      },
    }));

  const details = {
    price,
    buyUrl,
    artists,
  };

  return details;
}

async function getEventDetails(url) {
  if (!url) {
    return;
  }

  const html = await extract(url);

  const eventDetails = transformEventDetails(html);
  const artists = [];

  await async.eachSeries(eventDetails.artists, async (preArtist) => {
    const artist = await getArtistSingle(preArtist.name);

    if (!preArtist.metadata.website && artist) {
      artists.push(artist);
      return;
    }

    const metadata = await getMetadata(preArtist.metadata.website);
    const spotify = await getSpotify(preArtist);

    const newArtist = {
      name: preArtist.name,
      metadata,
      spotify,
    };

    if (!artist) {
      artists.push(newArtist);
      return;
    }

    const artistMerged = {
      ...artist,
      metadata: {
        website: artist.metadata?.website || newArtist.metadata?.website,
        image: artist.metadata?.image || newArtist.metadata?.image,
        twitter: artist.metadata?.twitter || newArtist.metadata?.twitter,
        facebook: artist.metadata?.facebook || newArtist.metadata?.facebook,
        youtube: artist.metadata?.youtube || newArtist.metadata?.youtube,
        instagram: artist.metadata?.instagram || newArtist.metadata?.instagram,
        tiktok: artist.metadata?.tiktok || newArtist.metadata?.tiktok,
        soundcloud:
          artist.metadata?.soundcloud || newArtist.metadata?.soundcloud,
        spotify: artist.metadata?.spotify || newArtist.metadata?.spotify,
        appleMusic:
          artist.metadata?.appleMusic || newArtist.metadata?.appleMusic,
        band_camp: artist.metadata?.band_camp || newArtist.metadata?.band_camp,
      },
      spotify,
    };

    artists.push(artistMerged);
  });

  return {
    price: eventDetails.price,
    buyUrl: eventDetails.buyUrl,
    artists,
  };
}

function transform(html) {
  const $ = cheerio.load(html);

  const events = $('.rhpSingleEvent')
    .toArray()
    .map((item) => {
      const name = $(item).find('h2').text().trim();
      const image = $(item).find('.eventListImage').attr('src');
      const url = $(item).find('.url').attr('href');
      const date = $(item).find('#eventDate').text().trim();
      const timeText = $(item).find('.eventDoorStartDate span').text().trim();

      const time = timeText.match(regexTime)[0];
      const dateTime = `${date} ${time}`;

      const start_date = moment(dateTime, 'ddd, MMM DD, YYYY h:mma');
      const description = $(item).find('.eventDoorStartDate').text().trim();

      const event = {
        name,
        image,
        url,
        start_date,
        description,
      };

      return event;
    });

  return events;
}

async function main() {
  const venue = {
    venue: 'Hideout Chicago',
    provider: 'HIDEOUTCHICAGO',
    city: 'Chicago',
    url: 'https://hideoutchicago.com/',
  };
  const location = await getGMapsLocation(venue);

  if (!location) {
    return location;
  }

  const html = await extract(venue.url);

  const preEvents = transform(html);

  await async.eachSeries(preEvents, async (preEvent) => {
    const {
      name, image, url, start_date, description,
    } = preEvent;
    const { price, buyUrl, artists } = await getEventDetails(preEvent.url);

    await saveEvent({
      name,
      image,
      url,
      start_date,
      description,
      price,
      buyUrl,
      artists,
      location,
      provider: venue.provider,
      venue: venue.venue,
      city: venue.city,
    });
  });

  logger.info('processed', { total: preEvents.length });
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
