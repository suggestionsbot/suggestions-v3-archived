import { Master, ErisSharderStats } from 'eris-sharder';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Logger from './utils/Logger';

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
      stats: true,
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
        messageLimit: 0,
        defaultImageFormat: 'jpg',
        disableEvents: {
          GUILD_BAN_ADD: true,
          GUILD_BAN_REMOVE: true,
          MESSAGE_DELETE_BULK: true,
          TYPING_START: true,
          VOICE_STATE_UPDATE: true,
          PRESENCE_UPDATE: true
        },
        intents: [
          'guilds',
          'guildMessages',
          'guildMessageReactions',
          'directMessages',
          'directMessageReactions'
        ],
        guildSubscriptions: false,
        restMode: true
      }
    });

    if (sharder.isMaster()) {
      sharder.on('stats', stats => {
        sharder.broadcast(0, { name: 'shardStats', data: stats });
      });
    }

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
