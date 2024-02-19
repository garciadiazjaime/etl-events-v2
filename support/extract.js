const logger = require('./logger.js')('extract');

async function extract(url) {
  logger.info('scrapping', { url });

  const response = await fetch(url);

  const html = await response.text();

  return html;
}

async function extractJSON(url, headers) {
  logger.info('scrapping', { url });

  const response = await fetch(url, headers);

  const data = await response.json();

  return data;
}

module.exports = {
  extract,
  extractJSON,
};
