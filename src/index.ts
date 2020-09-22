import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import SuggestionsClient from './structures/client';

export const main = async (): Promise<boolean> => {
  try {
    const client = new SuggestionsClient(process.env.DISCORD_TOKEN);
    client.start();
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

main();

process.on('unhandledRejection', err => {
  console.error('Unhandled Rejection', err);
});

mongoose.connection.on('connected', () => {
  console.log('Mongoose connection successfully opened!');
});

mongoose.connection.on('err', (err: Error) => {
  console.error(`Mongoose connection error: \n ${err.stack}`);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose connection disconnected');
});
