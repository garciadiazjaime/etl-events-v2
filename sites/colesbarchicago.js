const async = require('async');
const cheerio = require('cheerio');
const moment = require('moment');
const path = require('path');

const { extract } = require('../support/extract');
const { regexTime, regexMoney, regexEmptySpaces } = require('../support/misc');
const { processEventWithArtistDetails } = require('../support/preEvents');
const { getSocial, validURL } = require('../support/misc');
const { getGMapsLocation } = require('../support/gps');

const logger = require('../support/logger')(path.basename(__filename));

function transform(html) {
  const $ = cheerio.load(html);

  const events = $('.eventWrapper')
    .toArray()
    .map((item) => {
      const name = $(item).find('h2').text().trim();
      const description = $(item)
        .find('.rhpEventDetails')
        .text()
        .trim()
        .replace(regexEmptySpaces, '');
      const image = $(item).find('.rhp-events-event-image img').attr('src');
      const url = $(item).find('a.url').attr('href');
      const href = $(item).find('.rhp-event-cta a').attr('href');
      const buyUrl = validURL(href) ? validURL : '';
      const price = $(item)
        .find('.eventCost span')
        .text()
        .match(regexMoney)?.[0]
        ?.replace('$', '');

      const date = $(item).find('.eventDateListTop').text().trim();
      const time = $(item)
        .find('.eventDoorStartDate')
        .text()
        .trim()
        .match(regexTime)?.[0];

      const start_date = moment(`${date} ${time}`, 'ddd, MMM DD h:mma');

      const event = {
        name,
        description,
        image,
        url,
        buyUrl,
        price,
        start_date,
      };

      return event;
    });

  return events;
}

function transformDetails(html) {
  const $ = cheerio.load(html);
  const artists = [];
  $('.performerAccor')
    .toArray()
    .map((item) => {
      const social = getSocial($(item).find('.rhpSocialIconsWrapper').html());

      if (!Object.keys(social).length) {
        return;
      }

      const name = $(item).find('h5').text().trim();
      const website = $(item).find('.globe').parent().attr('href');

      artists.push({
        name,
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

  const html = await extract(url);

  const { artists } = transformDetails(html);

  return { artists };
}

async function main() {
  const venue = {
    venue: "Cole's Bar",
    provider: 'COLESBAR',
    city: 'Chicago',
    url: 'https://colesbarchicago.com/',
  };

  const location = await getGMapsLocation(venue);

  if (!location) {
    return;
  }

  const html = await extract(venue.url);

  const preEvents = transform(html, venue);

  await async.eachSeries(preEvents, async (preEvent) => {
    const {
      name, description, image, url, buyUrl, price, start_date,
    } = preEvent;
    const { artists } = await getDetails(url);

    const event = {
      name,
      description,
      image,
      url,
      buyUrl,
      price,
      start_date,
      artists,
    };

    await processEventWithArtistDetails(venue, location, event);
  });

  logger.info('processed', { total: preEvents.length });
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
