const { Client } = require("@googlemaps/google-maps-services-js");
const slugify = require("slugify");

const { getLocations } = require("./mint");
const { sleep } = require("./misc");
const logger = require("./support/logger")("gps");

async function getLocationFromDB(slug_venue) {
  const query = `slug_venue=${slug_venue}`;
  const [location] = await getLocations(query);

  logger.info(`internal location search`, {
    slug_venue,
    location: !!location,
  });

  return location;
}

async function getLocationFromGMaps(event, slug_venue) {
  const chalk = (await import("chalk").then((mod) => mod)).default;

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
    logger.info(chalk.red(`gps not found`), {
      venue: event.venue,
    });

    return;
  }

  const { formatted_address, geometry, name, place_id } =
    gmapsResponse.data.candidates[0];

  const paramsDetails = {
    place_id,
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
    address: formatted_address,
    lat: geometry.location.lat.toFixed(6),
    lng: geometry.location.lng.toFixed(6),
    place_id,
    slug_venue: [{ name: slug_venue }],
    website,
    url,
  };

  return payload;
}

async function getGMapsLocation(event) {
  const chalk = (await import("chalk").then((mod) => mod)).default;

  logger.info(`processing`, {
    venue: event.venue,
  });

  const slug_venue = slugify(event.venue, { lower: true, strict: true });
  const location = await getLocationFromDB(slug_venue);

  if (location) {
    logger.info(chalk.green("location found"), {
      slug_venue,
      website: location.website,
    });

    return location;
  }

  const payload = await getLocationFromGMaps(event, slug_venue);

  return payload;
}

module.exports = {
  getGMapsLocation,
};
