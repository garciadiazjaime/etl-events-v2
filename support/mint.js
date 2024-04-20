require("dotenv").config();

const EVENTS_API = `${process.env.NEXT_PUBLIC_EVENTS_API}/events`;
const ARTISTS_API = `${EVENTS_API}/artists`;

const logger = require("./logger")("mint");

async function getEvents(query) {
  const url = `${EVENTS_API}/?${query}`;
  logger.info("get events", { url });

  const response = await fetch(url);

  const data = await response.json();

  return data.results;
}

async function getEvent(id) {
  const response = await fetch(`${EVENTS_API}/${id}`);

  const data = await response.json();

  return data;
}

async function getLocations(query) {
  const response = await fetch(`${EVENTS_API}/locations/?${query}`);

  const data = await response.json();

  return data.results;
}

async function getArtists(query) {
  const response = await fetch(`${EVENTS_API}/artists/?${query}`);

  const data = await response.json();

  return data.results;
}

async function saveEvent(payload) {
  const response = await fetch(`${EVENTS_API}/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (response.status > 201) {
    logger.info("payload", JSON.stringify(payload, null, 2));

    if (response.status === 500) {
      logger.error("SERVER_ERROR", {
        message: response.statusText,
      });

      return null;
    }

    const data = await response.json();
    logger.error("ERROR_SAVING_EVENT", JSON.stringify(data, null, 2));

    return null;
  }

  logger.info("SAVED", {
    name: payload.name,
  });

  return response;
}

async function saveArtist(payload) {
  const response = await fetch(`${ARTISTS_API}/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (response.status > 201) {
    logger.info("payload", JSON.stringify(payload, null, 2));

    if (response.status === 500) {
      logger.error("SERVER_ERROR", {
        message: response.statusText,
      });

      return null;
    }

    const data = await response.json();
    logger.error("ERROR_SAVING_EVENT", JSON.stringify(data, null, 2));

    return null;
  }

  logger.info("SAVED", {
    name: payload.name,
  });

  return response;
}

module.exports = {
  saveEvent,
  getEvents,
  getEvent,
  getLocations,
  getArtists,
  saveArtist,
};
