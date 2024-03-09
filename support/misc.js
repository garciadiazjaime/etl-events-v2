const cheerio = require("cheerio");
const path = require("path");

const { extract } = require("./extract");

const logger = require("./logger")(path.basename(__filename));

const sleep = async (ms = 1_000) => {
  logger.info("sleeping", {
    seconds: ms / 1000,
  });

  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

const regexTime =
  /((1[0-2]|0?[1-9]):([0-5][0-9])\s?([AaPp][Mm]))|(1[0-2]|0?[1-9])([AaPp][Mm])/;
const regexMoney = /\$(\d+)/;
const regexEmptySpaces = /(\r\n|\n|\r|\t)/g;

const snakeCase = (value) => value.trim().replace(/ /g, "_");

const urlValidRegex =
  /https?:\/\/(([a-z\d]([a-z\d-]*[a-z\d])?\.)+[a-z]{2,})(\/[-a-z\d%_.~+]*)*(\?[;&a-z\d%_.~+=-]*)?(#[-a-z\d_]*)?/gi;
const twitterRegex = /http(?:s)?:\/\/(?:www\.)?twitter\.com\/([a-zA-Z0-9_]+)/gi;
const facebookRegex =
  /http(?:s)?:\/\/(?:www\.)?facebook\.com\/([a-zA-Z0-9_.]+)/gi;
const youtubeSimpleRegex =
  /http(?:s)?:\/\/(?:www\.)?youtube\.com\/([@a-zA-Z0-9_]+)/;
const youtubeRegex =
  /https?:\/\/(?:www\.)?youtube\.com\/(?:embed\/|channel\/|user\/|watch\?v=|[^/]+)([a-zA-Z0-9_-]+)/gi;
const instagramRegex =
  /http(?:s)?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/gi;
const tiktokRegex = /http(?:s)?:\/\/(?:www\.)?tiktok\.com\/([a-zA-Z0-9_]+)/gi;
const soundcloudRegex =
  /http(?:s)?:\/\/(?:www\.)?soundcloud\.com\/([a-zA-Z0-9_-]+)/gi;
const spotifyRegex =
  /https?:\/\/open\.spotify\.com\/(track|user|artist|album)\/[a-zA-Z0-9]+(\/playlist\/[a-zA-Z0-9]+|)|spotify:(track|user|artist|album):[a-zA-Z0-9]+(:playlist:[a-zA-Z0-9]+|)/gi;
const appleMusicRegex =
  /https?:\/\/music\.apple\.com\/([a-zA-Z]{2})\/(album|artist|playlist|station)\/([a-zA-Z0-9_-]+)\/(\d+)/gi;
const bandCampSimpleRegex = /https:\/\/([a-zA-Z0-9_-]+\.)bandcamp\.com/;
const bandCampRegex =
  /https:\/\/(?:\w+\.bandcamp\.com\/|bandcamp\.com\/EmbeddedPlayer\/v=2\/)(album|track)=\d+/;
const linkTreeRegex = /http(?:s)?:\/\/(?:www\.)?linktr\.ee\/([a-zA-Z0-9_]+)/i;

const validURL = (value) =>
  value && !value.includes(" ") && urlValidRegex.test(value);

const getURL = (value) => value.match(urlValidRegex)?.[0];

const removeHTML = (value) => value.replace(/(<([^>]+)>)/gi, "");
const removeEmptySpaces = (value) =>
  value?.trim().replace(regexEmptySpaces, "");
const getPrice = (value) => value?.trim().match(regexMoney)?.[1];
const getTime = (value) => value?.trim().match(regexTime)?.[0];

const getImage = (html, website) => {
  const $ = cheerio.load(html);
  let image =
    $('[property="og:image"]').attr("content") ||
    $('[property="twitter:image"]').attr("content");

  if (image?.[0] === "/") {
    image = `${website}${image}`;
  }

  return validURL(image) ? image : undefined;
};

const getTwitter = (value) => {
  const twitter = value
    .match(twitterRegex)
    ?.filter((item) => !item.includes("twitter.com/intent"))[0];

  if (["http://www.twitter.com/wix"].includes(twitter)) {
    return null;
  }

  return twitter;
};

const getFacebook = (value) => {
  const facebook = value
    .match(facebookRegex)
    ?.filter((item) => !item.includes("facebook.com/sharer"))[0];

  if (
    [
      "https://www.facebook.com/pages",
      "https://www.facebook.com/profile",
      "https://www.facebook.com/tr",
      "http://www.facebook.com/2008",
      "https://www.facebook.com/share.php",
    ].find((item) => item === facebook)
  ) {
    return "";
  }

  return facebook;
};

const isYoutubeValid = (value) =>
  ![
    "https://www.youtube.com/c",
    "https://www.youtube.com/watch",
    "https://www.youtube.com/channel",
    "https://www.youtube.com/embed",
    "https://www.youtube.com/user",
    "https://www.youtube.com/embed/watch",
  ].find((item) => item === value);

const getYoutube = (_value) => {
  const value = _value.replace(/&amp;/g, "&");
  let youtube = value.match(youtubeSimpleRegex)?.[0];

  if (!isYoutubeValid(youtube)) {
    youtube = value
      .match(youtubeRegex)
      ?.find((item) => validURL(item) && isYoutubeValid(item));
  }

  return youtube || "";
};

const getInstagram = (value) => {
  const instagram = value
    .match(instagramRegex)
    ?.filter((item) => item !== "https://www.instagram.com/explore")[0];

  return instagram;
};

const getBandCamp = (value) => {
  const bandCamp =
    value.match(bandCampRegex)?.[0] || value.match(bandCampSimpleRegex)?.[0];

  if (bandCamp?.includes("jeffscottcastle")) {
    return null;
  }

  return bandCamp;
};

const getLinkTree = (value) => {
  const linkTree = value.match(linkTreeRegex)?.[0];

  return linkTree;
};

const getTiktok = (value) => value.match(tiktokRegex)?.pop();
const getSoundcloud = (value) => value.match(soundcloudRegex)?.pop();
const getSpotify = (value) =>
  value.match(spotifyRegex)?.filter((item) => item.includes("artist"))[0];
const getAppleMusic = (value) => value.match(appleMusicRegex)?.pop();

const getSocial = (html, website) => {
  if (!html) {
    return {};
  }

  const image = getImage(html, website);
  const twitter = getTwitter(html);
  const facebook = getFacebook(html);
  const youtube = getYoutube(html);
  const instagram = getInstagram(html);
  const tiktok = getTiktok(html);
  const soundcloud = getSoundcloud(html);
  const spotify = getSpotify(html);
  const appleMusic = getAppleMusic(html);
  const bandCamp = getBandCamp(html);
  const linkTree = getLinkTree(html);

  if (
    !image &&
    !twitter &&
    !facebook &&
    !youtube &&
    !instagram &&
    !tiktok &&
    !soundcloud &&
    !spotify &&
    !appleMusic &&
    !bandCamp &&
    !linkTree
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
    band_camp: bandCamp,
    link_tree: linkTree,
  };
};

const getSocialPlusSite = (html) => {
  const social = getSocial(html);
  const networks = Object.keys(social).filter((item) => item);

  const website = html
    .match(urlValidRegex)
    .filter((link) => !networks.find((network) => link.includes(network)));

  return {
    ...social,
    website,
  };
};

async function getImageFromURL(url, social) {
  logger.info(`getting ${social} image`, { url });
  const response = await fetch(url).catch(() => false);

  if (!response) {
    logger.info(`${social} error`, { url });

    return null;
  }

  const html = await response.text();

  const image = getImage(html, url);

  return image;
}

async function getDataFromWebsite(url) {
  if (!url) {
    logger.info("no website");

    return null;
  }

  const html = await extract(url);

  const social = getSocial(html, url);

  return social;
}

const getGenres = (html) => {
  const $ = cheerio.load(html);
  const genres = $(".genre-list a")
    .toArray()
    .map((item) => ({ name: $(item).text() }));

  return genres;
};

const getSocialNetworkFrom = (url) => {
  if (!url) {
    return null;
  }

  const socialNetworks = [
    "twitter",
    "facebook",
    "youtube",
    "instagram",
    "tiktok",
    "soundcloud",
    "spotify",
    "apple",
    "bandcamp",
  ];

  const network =
    socialNetworks.find((prop) => url.includes(prop)) || "website";

  return {
    [network]: url,
  };
};

function getOriginFromUrl(url) {
  const providerUrl = new URL(url);
  return providerUrl.origin;
}

function getImageURL(value, baseURL) {
  if (!value) {
    return "";
  }

  if (value.includes("http")) {
    return value;
  }

  return `${baseURL}${value}`;
}

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
  regexEmptySpaces,
  removeHTML,
  getPrice,
  getSocialPlusSite,
  getTime,
  removeEmptySpaces,
  getOriginFromUrl,
  getImageURL,
};
