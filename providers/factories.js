const { ChooseChicagoTransformer } = require("./ChooseChicagoTransformer");
const { Do312Transformer, Do312Pages } = require("./Do312Transformer");
const { SongkickTransformer, SongkickPages } = require("./SongkickTransformer");

const providersMap = {
  CHOOSECHICAGO: {
    transformer: ChooseChicagoTransformer,
    paginator: () => [],
  },
  SONGKICK: {
    transformer: SongkickTransformer,
    paginator: SongkickPages,
  },
  DO312: {
    transformer: Do312Transformer,
    paginator: Do312Pages,
  },
};

function getTransformer(provider) {
  return providersMap[provider].transformer;
}

function getPaginator(provider) {
  return providersMap[provider].paginator;
}

module.exports = { getTransformer, getPaginator };
