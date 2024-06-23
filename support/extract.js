const path = require("path");

const logger = require("./logger")(path.basename(__filename));

async function extract(url, headers) {
  logger.info("scrapping", { url });

  const response = await fetch(url, headers).catch((error) => {
    logger.error("FETCH_FAILED", { error, url });
    return false;
  });

  if (!response) {
    logger.info("fetch_failed");

    return "";
  }

  const html = await response.text();

  return html;
}

async function extractJSON(url, headers) {
  logger.info("scrapping", { url });

  const response = await fetch(url, headers);

  const data = await response.json();

  return data;
}

async function extractPost(url, headers, body) {
  logger.info("scrapping", { url });

  const response = await fetch(url, { method: "POST", body, headers });

  if (response.status >= 400) {
    const error = await response.text();
    logger.error("SOURCE_FAILED", { error, url });
    return false;
  }

  const data = await response.json();

  return data;
}

module.exports = {
  extract,
  extractJSON,
  extractPost,
};
