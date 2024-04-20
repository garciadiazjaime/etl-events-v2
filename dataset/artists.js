const async = require("async");
const fs = require("fs");
const { parse } = require("csv-parse");
const path = require("path");

const { getArtistSingle } = require("../support/artist");
const { saveArtist } = require("../support/mint");
const { validURL } = require("../support/misc");
const logger = require("../support/logger")(path.basename(__filename));

// csv from
// https://marianaossilva.github.io/DSW2019/#tables
const dataFolder = "./data";
const csvName = `${dataFolder}/musicoset_artists.csv`;

async function savingCSVLocal() {
  if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder);
  }

  const response = await fetch(
    "https://d2r5kaieomhckh.cloudfront.net/data/musicoset_artists.csv"
  );

  const data = await response.text();
  fs.writeFileSync(csvName, data);

  logger.info("csv saved");
}

async function getMusicOs() {
  await savingCSVLocal();

  return new Promise((resolve, reject) => {
    const artists = [];

    fs.createReadStream(csvName)
      .pipe(parse({ delimiter: "\t", from_line: 2, relax_quotes: true }))
      .on("data", (row) => {
        artists.push({
          artistId: row[0],
          name: row[1],
          followers: row[2],
          popularity: row[3],
          artistType: row[4],
          mainGenre: row[5],
          genres: JSON.parse(
            row[6]
              .replace(/'/g, '"')
              .replace(/(\w)"(\w)/g, "$1'$2")
              .replace(/"n"/g, "&")
          ),
          image: row[7],
        });
      })
      .on("error", (err) => {
        reject(err.message);
      })
      .on("end", () => {
        resolve(artists);
      });
  });
}

async function main() {
  logger.info("starting...");
  const musicOs = await getMusicOs();
  logger.info("musicOs", { total: musicOs.length });

  await async.eachSeries(musicOs.slice(4000, 5000), async (musicO) => {
    const preArtist = await getArtistSingle(musicO.name);

    if (!preArtist) {
      logger.info("ARTISTS_UNKNOWN");
      return;
    }

    const artist = {
      ...preArtist,
      musicO: {
        followers: musicO.followers,
        popularity: musicO.popularity,
        image: validURL(musicO.image) ? musicO.image : "",
        genres: musicO.genres.map((name) => ({
          name,
        })),
      },
    };

    await saveArtist(artist);
  });
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
