const cheerio = require('cheerio');
const moment = require('moment');

function getOriginFromUrl(url) {
  const providerUrl = new URL(url);
  return providerUrl.origin;
}

function Do312Pages(html, originalLink) {
  const $ = cheerio.load(html);
  const nextPageLink = `${getOriginFromUrl(originalLink.url)}${$(
    '.ds-next-page',
  ).attr('href')}`;

  return [
    {
      url: nextPageLink,
      city: originalLink.city,
      provider: originalLink.provider,
    },
  ];
}

function Do312Transformer(html, link) {
  const $ = cheerio.load(html);

  const events = $('.event-card')
    .toArray()
    .map((item) => {
      const name = $(item).find('.ds-listing-event-title').text().trim();
      const image = $(item).find('.ds-cover-image').attr('style').split("'")[1];
      const url = `${getOriginFromUrl(link.url)}${$(item)
        .find('.ds-listing-event-title.url')
        .attr('href')}`;
      const venue = $(item).find('.ds-venue-name').text().trim();
      const timestamp = $(item)
        .find('.ds-listing-details > meta')
        .attr('datetime');
      const start_date = moment(timestamp).format();

      return {
        name,
        image,
        url,
        start_date,
        venue,
        city: link.city,
        provider: link.provider,
      };
    });

  return events;
}

module.exports = { Do312Transformer, Do312Pages };
