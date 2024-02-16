require("dotenv").config();

const logger = require("./support/logger")("metadata");

const { getSocial, getImageFromURL } = require("./misc");

async function getMetadata(url) {
  logger.info(`scrapping`, { url });

  if (!url || url.includes("youtube.com")) {
    return {};
  }

  const response = await fetch(url).catch(() => false);
  if (!response) {
    logger.info(`error`, { url });
    return {};
  }

  const html = await response.text();

  const social = getSocial(html, url);

  if (!social.image && social.soundcloud) {
    social.image = await getImageFromURL(social.soundcloud, "soundcloud");
  }

  if (!social || !Object.keys(social).find((key) => !!social[key])) {
    logger.info(`no social media`, {
      url,
    });
  }

  if (!social.image) {
    logger.info(`no image`, { url });
  }

  return social;
}

module.exports = {
  getMetadata,
};
