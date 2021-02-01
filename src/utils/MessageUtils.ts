import { Message, Textable } from 'eris';
import { stripIndents } from 'common-tags';

import SuggestionsClient from '../structures/core/Client';
import MessageEmbed from './MessageEmbed';
import config from '../config';

export default class MessageUtils {
  static async error(client: SuggestionsClient, data: Message|string, error: string, prefix = false): Promise<Message> {
    const { colors: { suggestion: { rejected: color } } } = client.config;
    let channel: Textable;

    if (typeof data === 'object') channel = data.channel;
    else channel = client.getChannel(data) as Textable;

    const description = prefix ? `An error has occurred: **${error}**` : error;
    return channel.createMessage({
      embed: {
        color,
        description: stripIndents(description)
      }
    });
  }

  static async success(client: SuggestionsClient, data: Message|string, message: string): Promise<Message> {
    const { colors: { suggestion: { approved: color } } } = client.config;
    let channel: Textable;

    if (typeof data === 'object') channel = data.channel;
    else channel = client.getChannel(data) as Textable;

    return channel.createMessage({
      embed: {
        color,
        description: stripIndents(message)
      }
    });
  }

  static defaultEmbed(): MessageEmbed {
    return new MessageEmbed()
      .setColor(config.colors.main);
  }

  static delete(message: Message, options: { timeout?: number, reason?: string } = {}): Promise<void> {
    const { timeout = 0, reason } = options;
    if (timeout <= 0) {
      return message.delete(reason);
    } else {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(message.delete(reason));
        }, timeout);
      });
    }
  }
}
