const ANDYSJAZZCLUB = require("./andysjazzclub");
const BEAT_KITCHEN = require("./beatkitchen");
const CITY_WINERY = require("./citywinery");
const COBRALOUNGE = require("./cobralounge");
const COLESBAR = require("./colesbarchicago");
const CONCORD_MUSIC_HALL = require("./concordmusichall");
const CHICAGO_SYMPHONY_ORCHESTRA = require("./cso");
const CUBBY_BEAR_CHICAGO = require("./cubbybear");
const EMPTY_BOTTLE = require("./emptybottle");
const EVANSTON_SPACE = require("./evanstonspace");
const FITZGERALDS = require("./fitzgeraldsnightclub");
const HIDEOUTCHICAGO = require("./hideoutchicago");
const JOESBAR = require("./joesbar");
const LINCOLN_HALL_SCHUBAS_TAVERN = require("./lh-st");
const OLD_TOWN_SCHOOL_FOLK_MUSIC_LINCOLN_SQUARE = require("./oldtownschool");
const PROMONTORY = require("./promontorychicago");
const PRYSM_CHICAGO = require("./prysmchicago");
const REGGIESLIVE = require("./reggieslive");
const SLEEPING_VILLAGE = require("./sleepingvillage");
const SUBTERRANEAN = require("./subt");
const THALIA_HALL = require("./thaliahallchicago");

const SITE_ETL = {
  ANDYSJAZZCLUB,
  BEAT_KITCHEN,
  CITY_WINERY,
  COBRALOUNGE,
  COLESBAR,
  CONCORD_MUSIC_HALL,
  CHICAGO_SYMPHONY_ORCHESTRA,
  CUBBY_BEAR_CHICAGO,
  EMPTY_BOTTLE,
  EVANSTON_SPACE,
  FITZGERALDS,
  HIDEOUTCHICAGO,
  JOESBAR,
  LINCOLN_HALL_SCHUBAS_TAVERN,
  OLD_TOWN_SCHOOL_FOLK_MUSIC_LINCOLN_SQUARE,
  PROMONTORY,
  PRYSM_CHICAGO,
  REGGIESLIVE,
  SLEEPING_VILLAGE,
  SUBTERRANEAN,
  THALIA_HALL,
};

const SITES = [
  "ANDYSJAZZCLUB",
  "BEAT_KITCHEN",
  "CITY_WINERY",
  "COBRALOUNGE",
  "COLESBAR",
  "CONCORD_MUSIC_HALL",
  "CHICAGO_SYMPHONY_ORCHESTRA",
  "CUBBY_BEAR_CHICAGO",
  "EMPTY_BOTTLE",
  "EVANSTON_SPACE",
  "FITZGERALDS",
  "HIDEOUTCHICAGO",
  "JOESBAR",
  "LINCOLN_HALL_SCHUBAS_TAVERN",
  "OLD_TOWN_SCHOOL_FOLK_MUSIC_LINCOLN_SQUARE",
  "PROMONTORY",
  "PRYSM_CHICAGO",
  "REGGIESLIVE",
  "SLEEPING_VILLAGE",
  "SUBTERRANEAN",
  "THALIA_HALL",
];

module.exports = {
  SITE_ETL,
  SITES: SITES.filter((name) => name === "SUBTERRANEAN"),
};
