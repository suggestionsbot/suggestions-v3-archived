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
}
