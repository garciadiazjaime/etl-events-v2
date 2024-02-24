const { Worker } = require('bullmq');
const async = require('async');

const { processLink } = require('./events');
const { getGMapsLocation } = require('./gps');
const { getMetadata } = require('./metadata');
const { getArtist } = require('./artist');
const { getSpotify } = require('./spotify');
const { saveEvent } = require('./mint');
const etl = require('../sites/andysjazzclub');
const logger = require('./logger')('queue');

require('dotenv').config();

async function main() {
  const chalk = (await import('chalk').then((mod) => mod)).default;

  const worker = new Worker(
    'livemusic',
    async (job) => {
      console.log('__job__', job.name, job.data);
      if (job.name === 'link') {
        await processLink([job.data]);
        return;
      }

      if (job.name === 'event') {
        const location = await getGMapsLocation(job.data, false);

        if (!location) {
          logger.info('no-location', job.data);
          return;
        }

        if (location.provider) {
          logger.info(chalk.green('LOCATION_FROM_PROVIDER'), {
            provider: location.provider,
          });
          return;
        }

        if (!location.metadata) {
          const locationMetadata = await getMetadata(location.website);
          location.metadata = locationMetadata;
        }

        const event = {
          ...job.data,
          location,
        };

        if (['SONGKICK'].includes(job.data.provider)) {
          const artists = await getArtist(job.data);

          event.artists = artists;
        }

        console.log(JSON.stringify(event, null, 2));
        await saveEvent(event);
      }

      if (job.name === 'provider') {
        await etl();
      }
    },
    {
      connection: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
      },
    },
  );

  worker.on('completed', ({ name, data }) => {
    logger.info('done', { name: data.name || name });
  });

  worker.on('failed', (job, err) => {
    logger.error(`${job.id} has failed`, err);
  });
}

main().then(() => {
  console.log('queue started');
});
