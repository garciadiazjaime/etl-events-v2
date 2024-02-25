const moment = require("moment");

function getLinks() {
  const today = moment();
  const endDate = moment().add(7, "days");
  const providerLinks = [
    {
      url: `https://www.choosechicago.com/events/?tribe-bar-date=${today.format(
        "YYYY-M-D",
      )}&tribe_eventcategory[0]=1242`,
      city: "CHICAGO",
      provider: "CHOOSECHICAGO",
    },
    {
      url: `https://www.songkick.com/metro-areas/9426-us-chicago?filters[minDate]=${today.format(
        "M/D/YYYY",
      )}&filters[maxDate]=${endDate.format("M/D/YYYY")}`,
      city: "CHICAGO",
      provider: "SONGKICK",
    },
    {
      url: `https://do312.com/events/live-music/${today.format("YYYY/MM/DD")}`,
      city: "CHICAGO",
      provider: "DO312",
    },
  ];

  return providerLinks;
}

function getProviders() {
  const providers = [
    {
      provider: "ANDYSJAZZCLUB",
    },
  ];

  return providers;
}

module.exports = { getLinks, getProviders };
