const slugify = require("slugify");

const { getDataFromWebsite, getImageFromURL } = require("./misc");
const { getMusicbrainz } = require("./musicbrainz");
const { getArtists } = require("./mint");
const { getSpotify } = require("./spotify");
const { metadataProps } = require("./metadata");

const logger = require("./logger")("artist");

const getSlug = (value) => {
  const name = value
    .trim()
    .replace(/\$/g, "")
    .replace(/(\W)+/g, "+")
    .replace("and+", "")
    .replace(/\+/g, " ");
  const slug = slugify(name, {
    lower: true,
    strict: true,
  });

  return slug;
};

async function getArtistSingle(value) {
  const name = value
    .trim()
    .replace(/\$/g, "")
    .replace(/(\W)+/g, "+")
    .replace("and+", "")
    .replace(/\+/g, " ");
  const slug = getSlug(value);

  const query = `slug=${slug}`;
  const [artistFound] = await getArtists(query);

  logger.info("internal search", {
    slug,
    found: !!artistFound,
  });

  if (artistFound) {
    logger.info("found", {
      slug,
    });

    return artistFound;
  }

  const musicbrainz = await getMusicbrainz(value);
  if (!musicbrainz) {
    logger.info("ERROR_NO_PROFILE", {
      artist: value,
    });
    return null;
  }

  const website = await getDataFromWebsite(musicbrainz.metadata.website);

  const artist = {
    name,
    profile: musicbrainz.profile,
    genres: musicbrainz.genres,
    slug,
    metadata: mergeMetadata(musicbrainz, website),
  };

  if (!artist.metadata.image && artist.metadata.soundcloud) {
    artist.metadata.image = await getImageFromURL(
      artist.metadata.soundcloud,
      "soundcloud"
    );
  }

  if (!artist.metadata.image) {
    logger.info("no image", { slug });
  }

  const spotify = await getSpotify(artist);
  if (spotify) {
    artist.spotify = spotify;
  }

  return artist;
}

function mergeMetadata(metadataA, metadataB) {
  const metadata = {};

  if (!metadataA && !metadataB) {
    return metadata;
  }

  if (!metadataA) {
    return metadataB;
  }

  if (!metadataB) {
    return metadataA;
  }

  metadataProps.forEach((prop) => {
    metadata[prop] = metadataA[prop] || metadataB[prop];
  });

  return metadata;
}

function mergeArtist(artistA, artistB) {
  if (!artistA && !artistB) {
    return null;
  }

  if (!artistA) {
    return artistB;
  }

  if (!artistB) {
    return artistA;
  }

  const artist = {
    pk: artistA.pk || artistB.pk,
    name: artistA.name || artistB.name,
    slug: artistA.slug || artistB.slug,
    profile: artistA.profile || artistB.profile,
    genres: artistA.genres || artistB.genres,
    spotify: artistA.spotify || artistB.spotify,
    metadata: {},
  };

  metadataProps.forEach((prop) => {
    artist.metadata[prop] =
      artistA.metadata?.[prop] || artistB.metadata?.[prop];
  });

  return artist;
}

module.exports = {
  getArtistSingle,
  mergeArtist,
};
