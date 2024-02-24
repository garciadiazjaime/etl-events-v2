const cheerio = require('cheerio');
const moment = require('moment');

const { extract } = require('../support/extract');
const { getPrice } = require('../support/misc');
const { processEventsWithArtist } = require('../support/preEvents');

function getArtist(name) {
  const artist = { name };
  if (name.includes('with')) {
    artist.name = name.split('with')?.[1]?.trim();
  }

  return artist;
}

function transform(html, venue) {
  const $ = cheerio.load(html);

  const events = $('.featured-box')
    .toArray()
    .map((item) => {
      const name = $(item)
        .find('.featured-box-title span')
        .first()
        .text()
        .trim();
      const description = $(item).find('.featured-box-details').text().trim();
      const image = `${venue.url}/${$(item).find('img').attr('src')}`;
      const url = $(item).find('.featured-box-link').attr('href');
      const buyUrl = url;
      const price = getPrice($(item).find('.show-details-p').text().trim());

      const dateTime = $(item).find('.featured-box-details').text().trim();
      const start_date = moment(dateTime, 'MMMM DD | h:mma');

      const mainArtist = getArtist(name);

      const event = {
        name,
        description,
        image,
        url,
        start_date,
        buyUrl,
        price,
        artists: [mainArtist],
      };

      return event;
    });

  return events;
}

async function main() {
  // todo: this site returns different HTML than on the browser, with header less browser social links and price can be scrapped
  const venue = {
    venue: "Joe's on Weed St.",
    provider: 'JOESBAR',
    city: 'Chicago',
    url: 'https://www.joesbar.com/',
  };

  const html = await extract(venue.url);

  const preEvents = transform(html, venue);

  await processEventsWithArtist(venue, preEvents);
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
