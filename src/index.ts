import { Master } from 'eris-sharder';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Logger from './utils/Logger';

export const main = async (): Promise<boolean> => {
  try {
    const mainFile = process.env.NODE_ENV === 'production' ?
      '/dist/lib/src/structures/shard.js' :
      '/src/structures/shard.ts';

    const sharder = new Master(process.env.DISCORD_TOKEN, mainFile, {
      stats: false,
      debug: true,
      clusters: 1,
      // TODO look into properly setting shards to 'auto': https://canary.discordapp.com/channels/364124474729037824/364132890788757514/759218710522232832
      shards: 1,
      guildsPerShard: 1500,
      name: 'Suggestions',
      webhooks: {
        shard: {
          id: '759222460234727465',
          token: 'jBafo5oVcoKyWYPlCM7lryPv1BYyYJClpJC6XT5zaa7bjFeRircACHTmrM4iaPcwLbF_',
        },
        cluster: {
          id: '759222703831515148',
          token: 'XRFEomcp7clM99BH-BQ4bLLFoPva0ezive-f1M88OO-N3_YtAzX4mOYYmKCKALAUoNI_'
        }
      },
      clientOptions: {
        messageLimit: 150,
        defaultImageFormat: 'png'
      }
    });

    sharder.on('stats', stats => Logger.log(stats));

    return true;
  } catch (error) {
    Logger.error('APPLICATION MAIN', error);
    return false;
  }
};

main();

process.on('unhandledRejection', err => {
  Logger.error('Unhandled Rejection', err);
});

mongoose.connection.on('connected', () => {
  Logger.ready('MONGOOSE', 'Connection successfully opened!');
});

mongoose.connection.on('err', (err: Error) => {
  Logger.error('MONGOOSE', 'Connection error', err);
});

mongoose.connection.on('disconnected', () => {
  Logger.event('MONGOOSE', 'Mongoose connection disconnected');
});
