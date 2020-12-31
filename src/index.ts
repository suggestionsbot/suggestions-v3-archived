import { ClientOptions } from 'eris';
import { Master } from 'eris-sharder';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import './types/global.extensions';
import './types/eris.extensions';
import Logger from './utils/Logger';

export const CLIENT_OPTIONS: ClientOptions = {
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
};

export const main = async (): Promise<boolean> => {
  try {
    const mainFile = process.env.NODE_ENV === 'production' ?
      '/dist/lib/src/structures/core/Bot.js' :
      '/src/structures/core/Bot.ts';

    const sharder = new Master(process.env.DISCORD_TOKEN!, mainFile, {
      stats: true,
      debug: true,
      clusters: 1,
      guildsPerShard: 1500,
      name: 'Suggestions',
      webhooks: {
        shard: {
          id: process.env.SHARD_WEBHOOK_ID!,
          token: process.env.SHARD_WEBHOOK_TOKEN!,
        },
        cluster: {
          id: process.env.CLUSTER_WEBHOOK_ID!,
          token: process.env.CLUSTER_WEBHOOK_TOKEN!
        }
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

/**
 * We need to look into a better method for this...
 * Source: https://stackoverflow.com/a/42304473/10804092 (Updated Answer)
 */
(<any>global).__rootdir__ = __dirname || process.cwd();

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
