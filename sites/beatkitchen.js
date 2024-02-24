const cheerio = require('cheerio');
const moment = require('moment');

const { extract } = require('../support/extract');
const { processEventsWithArtist } = require('../support/preEvents');

function getArtists(value) {
  if (!value || value.includes(':')) {
    return [];
  }

  return value
    .replace('with ', '')
    .split(',')
    .map((name) => ({ name: name.trim() }));
}

function transformDetails($) {
  const mainArtist = getArtists($.find('.headliners').text().trim());

  const artist = getArtists($.find('.supporting-talent').text().trim());

  return {
    artists: [...mainArtist, ...artist],
  };
}

function transform(html) {
  const $ = cheerio.load(html);
  const regexTime = /(1[0-2]|0?[1-9]):([0-5][0-9])\s?([AaPp][Mm])/;

  const events = [];
  $('.seetickets-list-event-container')
    .toArray()
    .map((item) => {
      // todo: this is almost the same ETL as `subt` except for this check
      if (
        !$(item).find('.venue').text().trim()
          .toLowerCase()
          .includes('beat')
      ) {
        return;
      }
      const name = $(item).find('.event-title').text().trim();
      const url = $(item).find('.event-title a').attr('href');
      const image = $(item).find('img').attr('src');
      const date = $(item).find('.event-date').text().trim();
      const time = $(item)
        .find('.see-doortime ')
        .text()
        .trim()
        .match(regexTime)?.[0]
        .replace(' ', '');

      const dateTime = `${date} ${time}`;

      const start_date = moment(dateTime, 'ddd MMM D h:mma');
      const description = $(item).find('.doortime-showtime').text().trim();
      const buyUrl = $(item).find('a.seetickets-buy-btn').attr('href');

      const { artists } = transformDetails($(item));

      events.push({
        name,
        image,
        url,
        start_date,
        description,
        buyUrl,
        artists,
      });
    });

  return events;
}

async function main() {
  const venue = {
    venue: 'Beat Kitchen',
    provider: 'BEAT_KITCHEN',
    city: 'Chicago',
    url: 'https://beatkitchen.com/',
  };

  const html = await extract(venue.url);

  const preEvents = transform(html);

  await processEventsWithArtist(venue, preEvents);
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
