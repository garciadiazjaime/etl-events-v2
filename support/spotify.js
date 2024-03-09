const path = require("path");
const { createClient } = require("redis");

const logger = require("./logger")(path.basename(__filename));

require("dotenv").config();

const redis = {
  KEYS: {
    TOKEN: "spotify_token_v2",
  },
  connect: async () => {
    const client = await createClient()
      .on("error", (err) => logger.error("Redis Client Error", err))
      .connect();

    return client;
  },
  getToken: async (key) => {
    const client = await redis.connect();
    const token = await client.get(key);

    await client.disconnect();

    return token;
  },
  setToken: async (key, value) => {
    const client = await redis.connect();
    await client.set(key, value, { EX: 60 * 59 });

    await client.disconnect();
  },
};

// todo: improve how token is generated
const getToken = async () => {
  const token = await redis.getToken(redis.KEYS.TOKEN);

  if (token) {
    return token;
  }

  const url = "https://accounts.spotify.com/api/token";

  const details = {
    grant_type: "client_credentials",
    client_id: process.env.SPOTIFY_CLIENT,
    client_secret: process.env.SPOTIFY_SECRET,
  };

  let formBody = [];
  Object.keys(details).forEach((property) => {
    const encodedKey = encodeURIComponent(property);
    const encodedValue = encodeURIComponent(details[property]);
    formBody.push(`${encodedKey}=${encodedValue}`);
  });
  formBody = formBody.join("&");

  logger.info("request", { url });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formBody,
  });

  const data = await response.json();
  if (response.status > 200) {
    logger.info("token response", data);
    return null;
  }

  await redis.setToken(redis.KEYS.TOKEN, data.access_token);
  return data.access_token;
};

const getArtistDetails = async (token, id) => {
  const url = `https://api.spotify.com/v1/artists/${id}`;
  logger.info("request", { url });

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer  ${token}`,
    },
  });

  const data = await response.json();
  if (response.status > 200) {
    logger.info("INVALID_ARTIST:", {
      token,
      id,
      data,
    });
    return null;
  }

  return data;
};

async function getSpotify(artist) {
  if (!artist.metadata?.spotify) {
    logger.info("NO_SPOTIFY", {
      name: artist.name,
    });
    return null;
  }

  if (artist.metadata.spotify.includes("user/")) {
    logger.info("USER_NO_ARTISTS", {
      name: artist.name,
    });
    return null;
  }

  logger.info("artist", {
    name: artist.name,
    spotify: artist.metadata.spotify,
  });

  const token = await getToken();
  const id = artist.metadata.spotify.split("/").pop();
  const details = await getArtistDetails(token, id);

  if (!details) {
    logger.info("INVALID_ARTIST", { id });
    return null;
  }

  const payload = {
    id,
    name: details.name,
    followers: details.followers.total,
    image: details.images[0]?.url,
    popularity: details.popularity,
    genres: details.genres?.map((genre) => ({ name: genre })),
    url: details.external_urls.spotify,
  };

  return payload;
}

async function main() {
  const token = await getToken();
  logger.info("token", token);
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = {
  getSpotify,
};
