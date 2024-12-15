const CHOOSE_CHICAGO = require("./01_choosechicago");
const DO312 = require("./02_do312");
const SONG_KICK = require("./03_songkick");
const LIVE_NATION = require("./04_livenation");

module.exports.AGGREGATORS_ETL = {
  CHOOSE_CHICAGO,
  DO312,
  SONG_KICK,
  LIVE_NATION,
};

module.exports.AGGREGATORS = [
  "CHOOSE_CHICAGO",
  "DO312",
  "SONG_KICK",
  "LIVE_NATION",
];
