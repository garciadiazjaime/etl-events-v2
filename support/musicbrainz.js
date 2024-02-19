const cheerio = require('cheerio');
const { compareTwoStrings } = require('string-similarity');

const { validURL, getGenres } = require('./misc');
const logger = require('./logger')('musicbrainz');

function isMatch(artistName, artistResult) {
  if (!artistName || !artistResult) {
    return false;
  }

  const result = compareTwoStrings(
    artistName.toLowerCase(),
    artistResult.toLowerCase(),
  );

  return result >= 0.5;
}

async function getProfileFromMusicbrainz(artistName) {
  const name = artistName.trim().replace(/ /g, '+').replace('and+', '');
  const domain = 'https://musicbrainz.org';
  const url = `${domain}/search?query=${name}&type=artist&method=indexed`;
  logger.info('searching brainz', { name });

  const response = await fetch(url);

  const html = await response.text();

  const $ = cheerio.load(html);

  const anchor = $('#content table tbody tr a').first();

  if (!anchor.length) {
    logger.info('no artist results', { name });
    return;
  }

  const artistResult = anchor.text();
  if (!isMatch(artistName, artistResult)) {
    logger.info('NO_MATCH', { artist: artistName, result: artistResult });
    return;
  }

  return `${domain}${anchor.attr('href')}`;
}

async function getSocialFromProfile(profile) {
  logger.info('scrapping brainz profile', { url: profile });

  const response = await fetch(profile);

  const html = await response.text();

  const genres = getGenres(html);

  const $ = cheerio.load(html);

  const links = [
    ['website', 'home-favicon'],
    ['instagram', 'instagram-favicon'],
    ['twitter', 'twitter-favicon'],
    ['facebook', 'facebook-favicon'],
    ['soundcloud', 'soundcloud-favicon'],
    ['spotify', 'spotify-favicon'],
    ['youtube', 'youtube-favicon'],
    ['bandcamp', 'bandcamp-favicon'],
  ];
  return links.reduce(
    (accumulator, [social, selector]) => {
      let href = $(`.external_links .${selector} a`).attr('href');
      if (!href) {
        return accumulator;
      }

      if (href.slice(0, 2) === '//') {
        href = `https:${href}`;
      }

      accumulator.metadata[social] = href;

      return accumulator;
    },
    { genres, metadata: {} },
  );
}

async function getMusicbrainz(name) {
  const profile = await getProfileFromMusicbrainz(name);

  if (!validURL(profile)) {
    logger.info('invalid profile', { name, profile });
    return;
  }

  const social = await getSocialFromProfile(profile);

  return {
    profile,
    ...social,
  };
}

module.exports = {
  getMusicbrainz,
};
