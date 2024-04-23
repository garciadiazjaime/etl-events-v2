const CHOOSE_CHICAGO = require("./choosechicago");
const DO312 = require("./do312");
const SONG_KICK = require("./songkick");
const LIVE_NATION = require("./4_livenation");

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
