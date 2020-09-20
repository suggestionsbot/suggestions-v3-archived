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
