const CHOOSECHICAGO = require("./choosechicago");
const DO312 = require("./do312");
const SONGKICK = require("./songkick");

const AGGREGATORS_ETL = {
  CHOOSECHICAGO,
  DO312,
  SONGKICK,
};

const AGGREGATORS = ["CHOOSECHICAGO", "DO312", "SONGKICK"];

module.exports = {
  AGGREGATORS_ETL,
  AGGREGATORS: AGGREGATORS.filter((name) => name),
};
