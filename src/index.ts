import { Master } from 'eris-sharder';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import SuggestionsClient from './structures/client';
import Logger from './utils/Logger';

export const main = async (): Promise<boolean> => {
  try {
    const client = new SuggestionsClient(process.env.DISCORD_TOKEN);
    client.start();
    // const sharder = new Master(process.env.DISCORD_TOKEN, '/dist/lib/src/structures/client.js', {
    //   stats: false,
    //   debug: true,
    //   clusters: 1,
    //   name: 'Suggestions',
    //   clientOptions: {
    //     messageLimit: 150,
    //     defaultImageFormat: 'png'
    //   }
    // });
    //
    // sharder.on('stats', stats => {
    //   Logger.debug('SHARDS', stats);
    // });

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
