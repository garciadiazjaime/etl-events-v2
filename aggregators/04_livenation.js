const { extractPost } = require("../support/extract");
const {
  processEventsWithArtistWithoutLocation,
} = require("../support/preEvents");

require("dotenv").config();

const getArtists = (value) => {
  const separators = [" with ", " and ", ":", "&", "-"];
  const response = [];
  const artists = [];

  if (!value) {
    return [];
  }

  for (let i = 0; i < separators.length; i += 1) {
    const separator = separators[i];
    const cleanedValue = value.toLowerCase();

    if (cleanedValue.includes(separator)) {
      artists.push({ name: cleanedValue.split(separator)[0].trim() });
      break;
    }
  }

  if (!artists.length) {
    return [];
  }

  for (let i = 0; i < separators.length; i += 1) {
    const separator = separators[i];
    const artist = artists[0];

    if (artist.name.includes(separator)) {
      response.push({ name: artist.name.split(separator)[0].trim() });
      break;
    }
  }

  if (!response.length) {
    return artists;
  }

  return response;
};

function transform(data) {
  const events = [];
  data.data.getEvents.forEach((item) => {
    const { name } = item;
    const image = item.images?.[0].image_url;
    const { url } = item;
    const venue = item.venue?.name;
    const startDate = new Date(`${item.event_date}T${item.event_time}`);

    const artists = getArtists(item.name);

    events.push({
      name,
      image,
      url,
      start_date: startDate,
      venue,
      artists,
    });
  });

  return events;
}

async function etl(site) {
  // todo: this API could expired
  const headers = {
    "x-api-key": process.env.LIVE_NATION_API_KEY,
  };
  const body = JSON.stringify({
    query:
      'query ECP($end_date_time: String, $foryou: Boolean, $hmac_id: String, $include_genres: String, $market_id: Int!, $start_date_time: String, $top_selling: Boolean, $limit: Int!, $offset: Int!, $sort_by: String!) {  getEvents(    filter: {dedup: true, end_date_time: $end_date_time, event_types: [FESTIVAL, REGULAR], exclude_status_codes: ["cancelled", "postponed"], foryou: $foryou, hmac_id: $hmac_id, include_genres: $include_genres, market_id: $market_id, start_date_time: $start_date_time, top_selling: $top_selling}    limit: $limit    offset: $offset    order: "ascending"    sort_by: $sort_by  ) {    discovery_id    event_date    event_date_timestamp_utc    event_end_date    event_end_date_timestamp_utc    event_end_time    event_status_code    event_time    event_timezone    images {      fallback      image_url    }    links {      link      platform    }    name    sales_start_date_time    similar_event_count    slug    tm_id    type    upsell {      classification_id      name      type      url    }    url    venue {      is_livenation_owned      location {        country        city        state      }      name    }  }}',
    variables: {
      top_selling: true,
      market_id: 3,
      offset: 0,
      limit: 50,
      sort_by: "ursa_ranking",
    },
  });

  const data = await extractPost(site.sourceURL, headers, body);
  const preEvents = transform(data);

  await processEventsWithArtistWithoutLocation(preEvents, site);
}

async function main() {
  const site = {
    city: "CHICAGO",
    provider: "LIVENATION",
    url: `https://www.livenation.com/events`,
    sourceURL: "https://api.livenation.com/graphql",
  };

  await etl(site, site);
}

if (require.main === module) {
  main().then(() => {});
}

module.exports = main;
