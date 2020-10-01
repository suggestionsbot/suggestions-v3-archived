import { Textable } from 'eris';
import { stripIndents } from 'common-tags';

import { SuggestionsMessage } from '../types';
import SuggestionsClient from '../structures/client';
import MessageEmbed from './MessageEmbed';
import config from '../config';

export default class MessageUtils {
  public static async error(client: SuggestionsClient, data: SuggestionsMessage|string, error: string, prefix = false): Promise<SuggestionsMessage> {
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

  public static async success(client: SuggestionsClient, data: SuggestionsMessage|string, message: string): Promise<SuggestionsMessage> {
    const { colors: { suggestion: { rejected: color } } } = client.config;
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

  public static defaultEmbed(): MessageEmbed {
    return new MessageEmbed()
      .setColor(config.colors.main);
  }

  public static delete(message: SuggestionsMessage, options: { timeout?: number, reason?: string } = {}): Promise<void> {
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

  public static commandUsage(): Promise<void> {
    return null;
  }
}
