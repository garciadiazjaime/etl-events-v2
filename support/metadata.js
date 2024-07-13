const path = require("path");

require("dotenv").config();

const logger = require("./logger")(path.basename(__filename));

const { getSocial, getImageFromURL } = require("./misc");

const metadataProps = [
  "website",
  "image",
  "twitter",
  "facebook",
  "youtube",
  "instagram",
  "tiktok",
  "soundcloud",
  "appleMusic",
  "spotify",
  "band_camp",
  "link_tree",
];

async function getMetadata(url, venue) {
  logger.info("scrapping", { url });

  if (
    !url ||
    ["youtube.com", "instagram.com", "maps.google.com"].find((item) =>
      url.includes(item)
    )
  ) {
    logger.info("skipping", { url });
    return {};
  }

  const response = await fetch(url).catch(() => false);
  if (!response) {
    logger.info("error", { url, venue });
    return {};
  }

  const html = await response.text();

  const social = getSocial(html, url);

  if (!social.image && social.soundcloud) {
    social.image = await getImageFromURL(social.soundcloud, "soundcloud");
  }

  if (!social || !Object.keys(social).find((key) => !!social[key])) {
    logger.info("no social media", {
      url,
    });
  }

  if (!social.image) {
    logger.info("no image", { url });
  }

  return social;
}

module.exports = {
  getMetadata,
  metadataProps,
};
