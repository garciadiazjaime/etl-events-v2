const cheerio = require('cheerio');

const logger = require('./logger')('misc');

const sleep = async (ms = 1_000) => {
  logger.info('sleeping', {
    seconds: ms / 1000,
  });

  await new Promise((resolve) => setTimeout(resolve, ms));
};

const regexTime = /(1[0-2]|0?[1-9]):([0-5][0-9])\s?([AaPp][Mm])/;
const regexMoney = /\$(\d)+/;

const snakeCase = (value) => value.trim().replace(/ /g, '_');

const urlValidRegex = /https?:\/\/(([a-z\d]([a-z\d-]*[a-z\d])?\.)+[a-z]{2,})(\/[-a-z\d%_.~+]*)*(\?[;&a-z\d%_.~+=-]*)?(\#[-a-z\d_]*)?/i;
const twitterRegex = /http(?:s)?:\/\/(?:www\.)?twitter\.com\/([a-zA-Z0-9_]+)/gi;
const facebookRegex = /http(?:s)?:\/\/(?:www\.)?facebook\.com\/([a-zA-Z0-9_\.]+)/gi;
const youtubeSimpleRegex = /http(?:s)?:\/\/(?:www\.)?youtube\.com\/([@a-zA-Z0-9_]+)/;
const youtubeRegex = /https?:\/\/(?:www\.)?youtube\.com\/(?:embed\/|channel\/|user\/|watch\?v=|[^\/]+)([a-zA-Z0-9_-]+)/;
const instagramRegex = /http(?:s)?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9_\.]+)/gi;
const tiktokRegex = /http(?:s)?:\/\/(?:www\.)?tiktok\.com\/([a-zA-Z0-9_]+)/gi;
const soundcloudRegex = /http(?:s)?:\/\/(?:www\.)?soundcloud\.com\/([a-zA-Z0-9_-]+)/gi;
const spotifyRegex = /https?:\/\/open\.spotify\.com\/(track|user|artist|album)\/[a-zA-Z0-9]+(\/playlist\/[a-zA-Z0-9]+|)|spotify:(track|user|artist|album):[a-zA-Z0-9]+(:playlist:[a-zA-Z0-9]+|)/gi;
const appleMusicRegex = /https?:\/\/music\.apple\.com\/([a-zA-Z]{2})\/(album|artist|playlist|station)\/([a-zA-Z0-9_-]+)\/(\d+)/gi;
const bandCampSimpleRegex = /https:\/\/([a-zA-Z0-9_-]+\.)bandcamp\.com/;
const bandCampRegex = /https:\/\/(?:\w+\.bandcamp\.com\/|bandcamp\.com\/EmbeddedPlayer\/v=2\/)(album|track)=\d+/;
const linkTreeRegex = /http(?:s)?:\/\/(?:www\.)?linktr\.ee\/([a-zA-Z0-9_]+)/i;

const validURL = (value) => urlValidRegex.test(value);

const getURL = (value) => value.match(urlValidRegex)?.pop();

const getImage = (html, website) => {
  const $ = cheerio.load(html);
  let image = $('[property="og:image"]').attr('content')
    || $('[property="twitter:image"]').attr('content');

  if (image?.[0] === '/') {
    image = `${website}${image}`;
  }

  return validURL(image) ? image : undefined;
};

const getTwitter = (value) => {
  const twitter = value
    .match(twitterRegex)
    ?.filter((item) => !item.includes('twitter.com/intent'))[0];

  if (['http://www.twitter.com/wix'].includes(twitter)) {
    return;
  }

  return twitter;
};

const getFacebook = (value) => {
  const facebook = value
    .match(facebookRegex)
    ?.filter((item) => !item.includes('facebook.com/sharer'))[0];

  if (
    [
      'https://www.facebook.com/pages',
      'https://www.facebook.com/profile',
      'https://www.facebook.com/tr',
      'http://www.facebook.com/2008',
    ].find((item) => item === facebook)
  ) {
    return;
  }

  return facebook;
};

const isYoutubeValid = (value) => ![
  'https://www.youtube.com/c',
  'https://www.youtube.com/watch',
  'https://www.youtube.com/channel',
  'https://www.youtube.com/embed',
  'https://www.youtube.com/user',
].find((item) => item === value);

const getYoutube = (value) => {
  let youtube = value.match(youtubeSimpleRegex)?.[0];

  if (!isYoutubeValid(youtube)) {
    youtube = value.match(youtubeRegex)?.[0];

    if (isYoutubeValid(youtube)) {
      return youtube;
    }

    return;
  }

  return youtube;
};

const getInstagram = (value) => {
  const instagram = value
    .match(instagramRegex)
    ?.filter((item) => item !== 'https://www.instagram.com/explore')[0];

  return instagram;
};

const getBandCamp = (value) => {
  const bandCamp = value.match(bandCampRegex)?.[0] || value.match(bandCampSimpleRegex)?.[0];

  if (bandCamp?.includes('jeffscottcastle')) {
    return;
  }

  return bandCamp;
};

const getLinkTree = (value) => {
  const linkTree = value.match(linkTreeRegex)?.[0];

  return linkTree;
};

const getTiktok = (value) => value.match(tiktokRegex)?.pop();
const getSoundcloud = (value) => value.match(soundcloudRegex)?.pop();
const getSpotify = (value) => value.match(spotifyRegex)?.filter((item) => item.includes('artist'))[0];
const getAppleMusic = (value) => value.match(appleMusicRegex)?.pop();

const getSocial = (html, website) => {
  const image = getImage(html, website);
  const twitter = getTwitter(html);
  const facebook = getFacebook(html);
  const youtube = getYoutube(html);
  const instagram = getInstagram(html);
  const tiktok = getTiktok(html);
  const soundcloud = getSoundcloud(html);
  const spotify = getSpotify(html);
  const appleMusic = getAppleMusic(html);
  const band_camp = getBandCamp(html);
  const link_tree = getLinkTree(html);

  if (
    !image
    && !twitter
    && !facebook
    && !youtube
    && !instagram
    && !tiktok
    && !soundcloud
    && !spotify
    && !appleMusic
    && !band_camp
    && !link_tree
  ) {
    return {};
  }

  return {
    website,
    image,
    twitter,
    facebook,
    youtube,
    instagram,
    tiktok,
    soundcloud,
    spotify,
    appleMusic,
    band_camp,
    link_tree,
  };
};

async function getImageFromURL(url, social) {
  logger.info(`getting ${social} image`, { url });
  const response = await fetch(url).catch(() => false);

  if (!response) {
    logger.info(`${social} error`, { url });

    return;
  }

  const html = await response.text();

  const image = getImage(html, url);

  return image;
}

async function getDataFromWebsite(url) {
  if (!url) {
    logger.info('no website');

    return;
  }

  const response = await fetch(url).catch(() => false);

  if (!response) {
    logger.info('website error', { url });

    return;
  }

  const html = await response.text();

  const social = getSocial(html, url);

  return social;
}

const getGenres = (html) => {
  const $ = cheerio.load(html);
  const genres = $('.genre-list a')
    .toArray()
    .map((item) => ({ name: $(item).text() }));

  return genres;
};

const getSocialNetworkFrom = (url) => {
  if (!url) {
    return;
  }

  const socialNetworks = [
    'twitter',
    'facebook',
    'youtube',
    'instagram',
    'tiktok',
    'soundcloud',
    'spotify',
    'apple',
    'bandcamp',
  ];

  const network = socialNetworks.find((prop) => url.includes(prop)) || 'website';

  return {
    [network]: url,
  };
};

module.exports = {
  sleep,
  snakeCase,
  urlValidRegex,
  validURL,
  getSocial,
  getImageFromURL,
  getDataFromWebsite,
  getGenres,
  getURL,
  getSocialNetworkFrom,
  getInstagram,
  regexTime,
  regexMoney,
};
