const CHOOSECHICAGO = require("./choosechicago");
const DO312 = require("./do312");
const SONGKICK = require("./songkick");

module.exports.AGGREGATORS_ETL = {
  CHOOSECHICAGO,
  DO312,
  SONGKICK,
};

module.exports.AGGREGATORS = ["CHOOSECHICAGO", "DO312", "SONGKICK"];
