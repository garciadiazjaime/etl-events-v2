// const { Logtail } = require("@logtail/node");

// require("dotenv").config();

// const logtail = new Logtail(process.env.LOGTAIL_TOKEN);

function logger(reference) {
  return {
    info: (msg, payload) => {
      console.log(`${reference}:`, msg, payload);
      // logtail.info(`${reference}:${msg}`, payload);
    },
    error: (msg, payload) => {
      console.log(`${reference}`, msg, payload);
      // logtail.error(reference, msg);
    },
    flush: () => {
      // logtail.flush();
    },
  };
}

module.exports = logger;
