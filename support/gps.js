const path = require("path");
const { Client } = require("@googlemaps/google-maps-services-js");
const slugify = require("slugify");
require("dotenv").config();

const { getLocations } = require("./mint");
const { sleep } = require("./misc");
const { getMetadata } = require("./metadata");

const logger = require("./logger")(path.basename(__filename));

async function getLocationFromDB(slugVenue) {
  const query = `slug_venue=${slugVenue}`;
  const [location] = await getLocations(query);

  logger.info("internal location search", {
    slugVenue,
    location: !!location,
  });

  return location;
}

async function getLocationFromGMaps(event, slugVenue) {
  const params = {
    input: event.venue,
    inputtype: "textquery",
    key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    fields: ["place_id", "name", "formatted_address", "geometry"],
    locationbias: "circle:30000@41.8336152,-87.8967663",
  };

  await sleep();

  const client = new Client({});

  const gmapsResponse = await client
    .findPlaceFromText({ params })
    .catch((error) => logger.error(error));

  if (
    !Array.isArray(gmapsResponse.data?.candidates) ||
    !gmapsResponse.data.candidates.length
  ) {
    logger.info("gps not found", {
      venue: event.venue,
    });

    return null;
  }

  const {
    formatted_address: address,
    geometry,
    name,
    place_id: placeId,
  } = gmapsResponse.data.candidates[0];

  const paramsDetails = {
    place_id: placeId,
    key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    fields: ["website", "url"],
  };
  const detailsResponse = await client.placeDetails({
    params: paramsDetails,
  });

  const { website, url } = detailsResponse.data.result;
  logger.info("website found", { website });

  const payload = {
    name,
    address,
    lat: geometry.location.lat.toFixed(6),
    lng: geometry.location.lng.toFixed(6),
    place_id: placeId,
    slug_venue: [{ name: slugVenue }],
    website,
    url,
  };

  return payload;
}

async function getGMapsLocation(venue, checkWebsite = true) {
  logger.info("processing", {
    venue: venue.venue,
  });

  const slugVenue = slugify(venue.venue, { lower: true, strict: true });
  const locationFromDB = await getLocationFromDB(slugVenue);

  if (locationFromDB) {
    logger.info("location found", {
      slugVenue,
      website: locationFromDB.website,
    });

    return locationFromDB;
  }

  const location = await getLocationFromGMaps(venue, slugVenue);

  if (!location) {
    logger.error("NO_LOCATION", venue);
    return null;
  }

  if (!location.metadata) {
    const locationMetadata = await getMetadata(location.url);
    location.metadata = locationMetadata;
  }

  if (checkWebsite && venue.url) {
    const website = new URL(venue.url);
    if (!location.website?.includes(website.host))
      logger.error("FAIL_WEBSITE", {
        provider: venue.provider,
        url: venue.url,
        maps: location.website,
      });
  }

  return location;
}

module.exports = {
  getGMapsLocation,
};
