require('dotenv').config();

const logger = require('./logger')('spotify');

const getToken = async () => {
  const url = 'https://accounts.spotify.com/api/token';

  const details = {
    grant_type: 'client_credentials',
    client_id: process.env.SPOTIFY_CLIENT,
    client_secret: process.env.SPOTIFY_SECRET,
  };

  let formBody = [];
  for (const property in details) {
    const encodedKey = encodeURIComponent(property);
    const encodedValue = encodeURIComponent(details[property]);
    formBody.push(`${encodedKey}=${encodedValue}`);
  }
  formBody = formBody.join('&');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody,
  });

  const data = await response.json();
  if (response.status > 200) {
    logger.info('token response', data);
    return;
  }
  // console.log('spotify-token', data.access_token);
  return data.access_token;
};

const getArtistDetails = async (token, id) => {
  const url = `https://api.spotify.com/v1/artists/${id}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer  ${token}`,
    },
  });

  const data = await response.json();
  if (response.status > 200) {
    logger.info('error artist detail:', {
      token,
      id,
      data,
    });
    return;
  }

  return data;
};

async function getSpotify(artist) {
  if (!artist.metadata?.spotify) {
    logger.info('NO_SPOTIFY', {
      name: artist.name,
    });
    return;
  }

  if (artist.metadata.spotify.includes('user/')) {
    logger.info('USER_NO_ARTISTS', {
      name: artist.name,
    });
    return;
  }

  logger.info('artist', {
    name: artist.name,
    spotify: artist.metadata.spotify,
  });

  const token = await getToken();
  const id = artist.metadata.spotify.split('/').pop();
  const details = await getArtistDetails(token, id);

  if (!details) {
    logger.info('INVALID_ARTIST', { id });
    return;
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

module.exports = {
  getSpotify,
};
