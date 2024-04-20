const cheerio = require("cheerio");
const moment = require("moment");

const { extractPost } = require("../support/extract");
const { processEventsWithArtist } = require("../support/preEvents");

function transform(data) {
  const { html } = data.cals.evcal_calendar_679;
  const $ = cheerio.load(html);
  const events = [];

  $(".eventon_list_event")
    .toArray()
    .forEach((item) => {
      const name = $(item).find(".evcal_event_title").text().trim();
      const description = $(item).find(".evcal_event_subtitle").text().trim();

      if (name.includes("UIC") || description.includes("UIC")) {
        return;
      }

      const image = $(item).find("[itemprop='image']").attr("content");
      const url = $(item).find("[itemprop='url']").attr("href");
      const value = $(item).find("[itemprop='startDate']").attr("content");

      const startDate = `${value.split("T")[0]} ${value.split("T")[1].split("-")[0]}`;

      events.push({
        name,
        image,
        url,
        start_date: moment(startDate, "YYYY-M-D H:mm"),
        description,
        artists: [{ name }],
      });
    });

  return events;
}

async function main() {
  const venue = {
    venue: "Credit Union 1 Arena",
    provider: "CREDIT_UNION_1_ARENA",
    city: "Chicago",
    url: "https://www.creditunion1arena.com/wp-admin/admin-ajax.php",
  };

  const headers = {
    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
  };
  const body =
    "action=eventon_init_load&cals[evcal_calendar_679][sc][focus_end_date_range]=1775001599";
  const data = await extractPost(venue.url, headers, body);

  const preEvents = transform(data);

  await processEventsWithArtist(venue, preEvents);
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
