// todo: does not work from server, running locally

const moment = require("moment");
const puppeteer = require("puppeteer");
const path = require("path");

const { processEventsWithoutArtist } = require("../support/preEvents");
const logger = require("../support/logger")(path.basename(__filename));

function secondsToHHMM(value) {
  const d = Number(value);
  const h = Math.floor(d / 3600);
  const m = Math.floor((d % 3600) / 60);

  const hDisplay = `${h}:`;
  const mDisplay = m > 0 ? m : "";
  return hDisplay + mDisplay;
}

function transform(data, venue) {
  const events = data?.data?.customPageSection?.upcomingCalendarEvents.map(
    (item) => {
      const { name } = item;
      const description = item.description || item.eventTimeDescription;
      const image = item.photoUrl;
      const url = `https://www.cubbybear.com/events/${item.slug}`;
      const buyUrl = item.externalLinkUrl
        ? item.externalLinkUrl.slice(0, 200)
        : undefined;
      const price = undefined;

      if (item.externalLinkUrl?.length > 200) {
        logger.info("LONG_BUY_URL", {
          buyUrl: item.externalLinkUrl,
          provider: venue.provider,
        });
      }

      const date = item.startAt;
      const time = secondsToHHMM(item.startTime);
      const dateTime = `${date} ${time}`;
      const startDate = moment(dateTime, "YYYY-MM-DD h:mm");

      const artists = undefined;

      return {
        name,
        description,
        image,
        url,
        buyUrl,
        price,
        start_date: startDate,
        artists,
      };
    }
  );

  return events;
}

const extract = async (venue) => {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: "new",
    defaultViewport: null,
    ignoreHTTPSErrors: true,
  });
  const page = await browser.newPage();

  const customUA =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

  // Set custom user agent
  await page.setUserAgent(customUA);

  let wasCalled = false;

  await page.setRequestInterception(true);

  const interceptRequestHandler = async (request) => {
    try {
      if (wasCalled) {
        return await request.continue();
      }
      wasCalled = true;

      const requestParams = {
        method: "POST",
        postData: JSON.stringify({
          variables: {
            rangeStartAt: new Date().toJSON(),
            limit: 60,
            sectionId: 2673661,
          },
          extensions: {
            operationId: "PopmenuClient/93cabb8b40d7337158b20b4383348530",
          },
        }),
        headers: {
          "content-type": "application/json",
          Referer: "https://www.cubbybear.com/live-music",
        },
      };

      await request.continue(requestParams);
    } catch (error) {
      logger.error(error);
    }
  };

  await page.on("request", interceptRequestHandler);

  await page.goto(venue.url, { waitUntil: "networkidle0" });

  const innerText = await page.evaluate(() => {
    return JSON.parse(document.querySelector("body").innerText);
  });

  await browser.close();

  return innerText;
};

async function main() {
  const venue = {
    venue: "The Cubby Bear Chicago",
    provider: "CUBBY_BEAR_CHICAGO",
    city: "Chicago",
    url: "https://www.cubbybear.com/graphql",
  };

  const data = await extract(venue);

  const preEvents = transform(data, venue);

  await processEventsWithoutArtist(venue, preEvents);
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
