import { Master } from 'eris-sharder';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Logger from './utils/Logger';
import SuggestionsClient from './structures/client';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global {
      __rootdir__: string;
    }
  }
}

export const main = async (): Promise<boolean> => {
  try {
    const mainFile = process.env.NODE_ENV === 'production' ?
      '/dist/lib/src/structures/shard.js' :
      '/src/structures/shard.ts';

    const sharder = new Master(process.env.DISCORD_TOKEN, mainFile, {
      stats: false,
      debug: true,
      clusters: 1,
      guildsPerShard: 1500,
      name: 'Suggestions',
      webhooks: {
        shard: {
          id: process.env.SHARD_WEBHOOK_ID,
          token: process.env.SHARD_WEBHOOK_TOKEN,
        },
        cluster: {
          id: process.env.CLUSTER_WEBHOOK_ID,
          token: process.env.CLUSTER_WEBHOOK_TOKEN
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

global.__rootdir__ = __dirname || process.cwd();

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
