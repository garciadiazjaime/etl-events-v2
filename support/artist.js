const async = require("async");

const slugify = require("slugify");

const { getDataFromWebsite, getImageFromURL } = require("./misc");
const { getMusicbrainz } = require("./musicbrainz");
const { getArtists } = require("./mint");
const { getSpotify } = require("./spotify");

const logger = require("./logger")("artist");

async function getArtistSingle(value) {
  const name = value
    .trim()
    .replace(/ /g, "+")
    .replace("and+", "")
    .replace(/\+/g, " ");
  const slug = slugify(name, {
    lower: true,
    strict: true,
  });

  const query = `slug=${slug}`;
  const [artistFound] = await getArtists(query);

  logger.info(`internal search`, {
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
    logger.info(`NO_PROFILE`, {
      artist: value,
    });
    return;
  }

  const website = await getDataFromWebsite(musicbrainz.metadata.website);

  const artist = {
    name,
    profile: musicbrainz.profile,
    genres: musicbrainz.genres,
  };

  artist.metadata = {
    website: website ? musicbrainz.metadata.website : undefined,
    image: website?.image,
    twitter: musicbrainz.metadata.twitter || website?.twitter,
    facebook: musicbrainz.metadata.facebook || website?.facebook,
    youtube: musicbrainz.metadata.youtube || website?.youtube,
    instagram: musicbrainz.metadata.instagram || website?.instagram,
    tiktok: musicbrainz.metadata.tiktok || website?.tiktok,
    soundcloud: musicbrainz.metadata.soundcloud || website?.soundcloud,
    spotify: musicbrainz.metadata.spotify || website?.spotify,
    appleMusic: musicbrainz.metadata.appleMusic || website?.appleMusic,
    band_camp: musicbrainz.metadata.bandcamp,
  };

  if (!artist.metadata.image && artist.metadata.soundcloud) {
    artist.metadata.image = await getImageFromURL(
      artist.metadata.soundcloud,
      "soundcloud"
    );
  }

  if (!artist.metadata.image) {
    logger.info(`no image`, { slug });
  }

  const spotify = await getSpotify(artist);
  if (spotify) {
    artist.spotify = spotify;
  }

  return artist;
}

async function getArtist(event) {
  const response = [];
  const artists = event.name.includes(",")
    ? event.name.split(",")
    : event.name.split(" and ");

  await async.eachSeries(artists, async (value) => {
    const artist = await getArtistSingle(value);
    if (!artist) {
      return;
    }

    response.push(artist);
  });

  return response;
}

module.exports = {
  getArtist,
  getArtistSingle,
};
