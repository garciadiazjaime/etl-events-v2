const cheerio = require("cheerio");
const { compareTwoStrings } = require("string-similarity");

const { validURL, getGenres, sleep } = require("./misc");
const logger = require("./logger")("musicbrainz");

const MATCH_THRESHOLD = 0.65;

function isMatch(preValue1, preValue2) {
  if (!preValue1 || !preValue2) {
    return false;
  }

  const value1 = preValue1.replace(/‐/g, "-").toLowerCase();
  const value2 = preValue2.replace(/‐/g, "-").toLowerCase();

  if (value1 === value2) {
    return true;
  }

  const result = compareTwoStrings(value1, value2);
  if (result <= MATCH_THRESHOLD) {
    logger.info("compareTwoStrings", { result, MATCH_THRESHOLD });
  }

  return result > MATCH_THRESHOLD;
}

async function getProfileFromMusicbrainz(artistName) {
  await sleep(100);

  const name = artistName
    .trim()
    .replace(/ /g, "+")
    .replace("&", encodeURIComponent("&"));
  const domain = "https://musicbrainz.org";
  const url = `${domain}/search?query=${name}&type=artist&method=indexed`;
  logger.info("searching brainz", { name });

  const response = await fetch(url);

  const html = await response.text();

  const $ = cheerio.load(html);

  const anchor = $("#content table tbody tr a").first();

  if (!anchor.length) {
    logger.info("NO_RESULTS", {
      name,
      status: response.status,
      html: $("#content table tbody").text()?.slice(0, 200),
    });
    return null;
  }

  // todo: check more rows, i.e. fails for B.o.B since it's on the 3rd position
  const artistResult = anchor.text();
  if (!isMatch(artistName, artistResult)) {
    // todo: debug these cases, there might be false positives
    logger.info("NO_MATCH", { artist: artistName, result: artistResult });
    return null;
  }

  return `${domain}${anchor.attr("href")}`;
}

async function getSocialFromProfile(profile) {
  logger.info("scrapping brainz profile", { url: profile });

  const response = await fetch(profile);

  const html = await response.text();

  const genres = getGenres(html);

  const $ = cheerio.load(html);

  const links = [
    ["website", "home-favicon"],
    ["instagram", "instagram-favicon"],
    ["twitter", "twitter-favicon"],
    ["facebook", "facebook-favicon"],
    ["soundcloud", "soundcloud-favicon"],
    ["spotify", "spotify-favicon"],
    ["youtube", "youtube-favicon"],
    ["band_camp", "bandcamp-favicon"],
    ["appleMusic", "applemusic-favicon"],
    ["tiktok", "tiktok-favicon"],
  ];
  return links.reduce(
    (accumulator, [social, selector]) => {
      let href = $(`.external_links .${selector} a`).attr("href");
      if (!href) {
        return accumulator;
      }

      if (href.slice(0, 2) === "//") {
        href = `https:${href}`;
      }

      if (!validURL(href)) {
        logger.info("INVALID_URL", { [social]: href, profile });
        return accumulator;
      }

      accumulator.metadata[social] = href;

      return accumulator;
    },
    { genres, metadata: {} }
  );
}

async function getMusicbrainz(name) {
  await sleep();

  const profile = await getProfileFromMusicbrainz(name);

  if (!validURL(profile)) {
    logger.info("INVALID_PROFILE", { name, profile });
    return null;
  }

  // todo: getSocialFromProfile returns { genres, metadata }, rename method
  const social = await getSocialFromProfile(profile);

  return {
    profile,
    ...social,
  };
}

module.exports = {
  getMusicbrainz,
};
