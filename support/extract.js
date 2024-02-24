const logger = require('./logger')('extract');

async function extract(url, headers) {
  logger.info('scrapping', { url });

  const response = await fetch(url, headers);

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
