import { Client } from 'eris';
import * as dotenv from 'dotenv-flow';
dotenv.config();

const client = new Client(process.env.DISCORD_TOKEN);

client.on('ready', () => {
  console.log('Ready!');
});

client.on('messageCreate', async (message) => {
  if (message.content === ';;ping') {
    try {
      await client.createMessage(message.channel.id, 'Pong!');
    } catch (error) {
      console.error(error);
    }
  }
});

export const main = async (): Promise<boolean> => {
  try {
    await client.connect();
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

main();
