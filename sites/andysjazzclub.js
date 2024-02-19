const cheerio = require('cheerio');
const moment = require('moment');

const { extract } = require('../support/extract');
const { regexTime } = require('../support/misc');
const { processEventsWithArtist } = require('../support/preEvents');

function transform(html, preEvent) {
  const $ = cheerio.load(html);

  const events = $('.mec-month-side [type="application/ld+json"]')
    .toArray()
    .map((item) => {
      const data = JSON.parse(
        $(item)
          .text()
          .replace(/(<([^>]+)>)/gi, '')
          .replace(/(\r\n|\n|\r)/gm, ''),
      );

      const descriptionContent = data.description
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      const $$ = cheerio.load(descriptionContent);
      const artistName = $$('em strong').first().text().trim()
        .split('(')[0];
      const description = $$('strong').first().text().trim();

      const time = description.match(regexTime)?.[0];
      const dateTime = `${data.startDate} ${time}`;
      const start_date = moment(dateTime, 'YYYY-MM-DD h:mma');

      const event = {
        name: data.name,
        image: data.image,
        url: data.url,
        start_date,
        description,
        price: data.offers?.price,
        provider: preEvent.provider,
        venue: preEvent.venue,
        city: preEvent.city,
        artists: [{ name: artistName }],
      };

      return event;
    });

  return events;
}

async function main() {
  const venue = {
    venue: "Andy's Jazz Club & Restaurant",
    provider: 'ANDYSJAZZCLUB',
    city: 'Chicago',
    url: 'https://andysjazzclub.com/music-calendar/',
  };

  const html = await extract(venue.url);

  const preEvents = transform(html, venue);

  await processEventsWithArtist(venue, preEvents);
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
