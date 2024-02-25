const cheerio = require('cheerio');
const moment = require('moment');

const { extract } = require('../support/extract');
const { processEventsWithoutArtist } = require('../support/preEvents');
const { getTime } = require('../support/misc');

function transform(html, venue) {
  const $ = cheerio.load(html);

  const events = $('.upcoming-event')
    .toArray()
    .map((item) => {
      const name = $(item).find('h3').text().trim();
      const description = $(item).find('.secondary-item p').text().trim();
      const _url = new URL(venue.url);
      const image = `${_url.origin}${$(item).find('img').attr('src')}`;
      const url = `${_url.origin}${$(item).find('a').first().attr('href')}`;
      const buyUrl = undefined;
      const price = undefined;

      const date = $(item).find('.concertInfo').text().trim();
      const time = getTime(description);
      const dateTime = `${date} ${time}`;

      const start_date = moment(dateTime, 'MMMDD h:mma');

      const artists = undefined;

      return {
        name,
        description,
        image,
        url,
        buyUrl,
        price,
        start_date,
        artists,
      };
    });

  return events;
}

async function main() {
  // todo: this sites provides little information, not sure worth the scrapper
  const venue = {
    venue: 'Old Town School of Folk Music - Lincoln Square',
    provider: 'OLD_TOWN_SCHOOL_FOLK_MUSIC_LINCOLN_SQUARE',
    city: 'Chicago',
    url: 'https://www.oldtownschool.org/concerts/',
  };

  const html = await extract(venue.url);

  const preEvents = transform(html, venue);

  await processEventsWithoutArtist(venue, preEvents);
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
