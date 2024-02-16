const cheerio = require("cheerio");
const moment = require("moment");

function getOriginFromUrl(url) {
  const providerUrl = new URL(url);
  return providerUrl.origin;
}

function SongkickPages(html, originalLink) {
  const $ = cheerio.load(html);
  const paginatorLinks = $(".pagination a")
    .toArray()
    .filter((pageLink) => pageLink.attribs["aria-label"]?.includes("Page"))
    .map((pageLink) => {
      const url = `${getOriginFromUrl(originalLink.url)}${
        pageLink.attribs.href
      }`;

      return {
        url: url,
        city: originalLink.city,
        provider: originalLink.provider,
      };
    });

  return paginatorLinks;
}

function SongkickTransformer(html, link) {
  const $ = cheerio.load(html);

  const events = $(".event-listings-element")
    .toArray()
    .map((item) => {
      const name = $(item).find(".artists strong").text();
      const image = `https:${$(item)
        .find(".artist-profile-image")
        .data("src")}`;
      const url = `${getOriginFromUrl(link.url)}${$(item)
        .find(".event-link")
        .attr("href")}`;
      const venue = $(item).find(".venue-link").text();
      const timestamp = $(item).find("time").attr("datetime");
      const start_date = moment(timestamp).format();

      return {
        name,
        image,
        url,
        start_date,
        venue,
        city: link.city,
        provider: link.provider,
      };
    });

  return events;
}

module.exports = { SongkickTransformer, SongkickPages };
