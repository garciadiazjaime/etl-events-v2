const { Queue } = require('bullmq');

const { getLinks, getProviders } = require('./links.js');

require('dotenv').config();

async function main() {
  const myQueue = new Queue('livemusic', {
    connection: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
    },
  });

  // const links = getLinks();

  // const promises = links.map(async (link) => {
  //   await myQueue.add("link", link);
  // });

  // await Promise.all(promises);

  const providers = getProviders();

  const promises = providers.map(async (provider) => {
    await myQueue.add('provider', provider);
  });

  await Promise.all(promises);
}

main().then(() => {
  console.log('end');
  process.exit(1);
});
