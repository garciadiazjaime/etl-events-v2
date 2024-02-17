const logger = require("./logger.js")("EXTRACT");

async function extract(url) {
  logger.info("scrapping", { url });

  const response = await fetch(url);

  const html = await response.text();

  return html;
}

async function extractJSON(url) {
  logger.info("scrapping", { url });

  const response = await fetch(url);

  const data = await response.json();

  return data;
}

module.exports = {
  extract,
  extractJSON,
};
