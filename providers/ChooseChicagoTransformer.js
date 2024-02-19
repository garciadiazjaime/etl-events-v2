const cheerio = require('cheerio');
const moment = require('moment');

function ChooseChicagoTransformer(html, link) {
  const $ = cheerio.load(html);

  const events = $('.type-tribe_events')
    .toArray()
    .map((item) => {
      const name = $(item).find('.card-title').text();
      const description = $(item).find('.card-body p').text();
      const image = encodeURI($(item).find('.img-cover').data('src'));
      const url = $(item).find('.card-img-link').attr('href');

      const date = $(item).find('.tribe-event-date-start').text();
      const startTime = $(item).find('.tribe-event-time').first().text();
      const endTime = $(item).find('.tribe-event-time').last().text();
      const start_date = moment(`${date} ${startTime}`, 'dddd, MMMM Do LT').format()
        !== 'Invalid date'
        ? moment(`${date} ${startTime}`, 'dddd, MMMM Do LT')
        : moment(`${date} ${startTime}`, 'dddd MMMM Do, YYYY LT');
      const end_date = moment(`${date} ${endTime}`, 'dddd, MMMM Do LT').format()
        !== 'Invalid date'
        ? moment(`${date} ${endTime}`, 'dddd, MMMM Do LT')
        : moment(`${date} ${endTime}`, 'dddd MMMM Do, YYYY LT');
      if (end_date < start_date) {
        end_date.add(1, 'days');
      }
      const venue = $(item)
        .find('.tribe-events-venue-details b')
        .text()
        .split(',')[0];
      const address = $(item).find('.tribe-events-venue-details');
      address.find('b').remove();

      return {
        name,
        description,
        image,
        url,
        start_date: start_date.format(),
        end_date: end_date.format(),
        venue,
        address: address.text(),
        city: link.city,
        provider: link.provider,
      };
    });

  return events;
}

module.exports = { ChooseChicagoTransformer };
