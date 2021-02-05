import { oneLine, stripIndents } from 'common-tags';
import { EmbedField, EmbedImage, Guild, Message, User } from 'eris';

import MessageEmbed from './MessageEmbed';
import MessageUtils from './MessageUtils';
import Util from './Util';
import { IMAGE_URL_REGEX } from './Constants';
import SuggestionChannel from '../structures/suggestions/SuggestionChannel';
import Logger from './Logger';
import { EmbedThumbnail } from '../types';

interface BaseEmbedData {
  channel: SuggestionChannel;
  id: string;
  suggestion: string;
  author: User;
  guild: Guild;
  message: Message;
  nickname: boolean;
}

interface BaseDMEmbedData extends BaseEmbedData {
  executor: User;
  link: string;
  reason?: string;
}

type FullEmbedData = BaseEmbedData;

type CompactEmbedData = Omit<FullEmbedData, 'id' | 'guild' | 'channel'>;

type CreateDMData = Omit<BaseDMEmbedData, 'executor' | 'reason' | 'nickname' | 'message'>;

type DeleteDMData = Omit<BaseDMEmbedData, 'link' | 'nickname' | 'channel' | 'message'>;

interface EditDMData extends Omit<BaseDMEmbedData, 'suggestion' | 'nickname' | 'channel' | 'message'> {
  suggestion: { before: string; after: string; };
}

export default class SuggestionEmbeds {
  static fullSuggestion(data: FullEmbedData): MessageEmbed {
    const imageCheck = data.message.embeds.filter(e => !!e.thumbnail);
    const imageThumbnail = !imageCheck.isEmpty() ? imageCheck[0].thumbnail : undefined;

    const displayName = data.nickname
      ? oneLine`${data.message?.member?.displayName ?? data.author.username}#
        ${data.message?.member?.discriminator ?? data.author.discriminator}`
      : data.author.tag;

    const embed = MessageUtils.defaultEmbed()
      .setDescription(stripIndents`
        **Submitter**
        ${Util.escapeMarkdown(displayName)}
        
        **Suggestion**
        ${data.suggestion.replace(imageThumbnail?.url ?? '', '')}
      `)
      .setThumbnail(data.author.avatarURL)
      .setFooter(`Author ID: ${data.author.id} | sID: ${data.id}`);

    if (imageThumbnail) embed.setImage(imageThumbnail.proxy_url!);
    return embed;
  }

  static compactSuggestion(data: CompactEmbedData): MessageEmbed {
    const displayName = data.nickname
      ? oneLine`${data.message?.member?.displayName ?? data.author.username}#
        ${data.message?.member?.discriminator ?? data.author.discriminator}`
      : data.author.tag;

    return MessageUtils.defaultEmbed()
      .setAuthor(displayName, data.author.avatarURL)
      .setDescription(stripIndents(data.suggestion));
  }

  static suggestionCreatedDM(data: CreateDMData): MessageEmbed {
    return MessageUtils.defaultEmbed()
      .setAuthor(data.guild.name, data.guild.iconURL)
      .setDescription(stripIndents`Hey, ${data.author.mention}. Your suggestion has been sent to ${data.channel.channel.mention} to be voted on!
        
        Please wait until a staff member handles your suggestion.
        
        *Jump to Suggestion* → [${Util.boldCode(data.id)}](${data.link})
      `)
      .setFooter(`Guild ID: ${data.guild.id} | sID: ${data.id}`)
      .setTimestamp();
  }

  static suggestionEditedDM(data: EditDMData): MessageEmbed {
    const fields: Array<EmbedField> = [
      { name: 'Before', value: Util.escapeMarkdown(data.suggestion.before), inline: true },
      { name: 'After', value: Util.escapeMarkdown(data.suggestion.after), inline: true },
    ];

    if (data.reason) fields.push({ name: 'Reason', value: data.reason });

    return MessageUtils.defaultEmbed()
      .setAuthor(data.guild.name, data.guild.iconURL)
      .setDescription(stripIndents`Hey, ${data.author.mention}. Your suggestion has been edited by ${data.executor.mention}.
        
        *Jump to Suggestion* → [${Util.boldCode(data.id)}](${data.link})
      `)
      .addFields(...fields)
      .setFooter(`Guild ID: ${data.guild.id} | sID: ${data.id}`)
      .setTimestamp();
  }

  static suggestionDeletedDM(data: DeleteDMData): MessageEmbed {
    return MessageUtils.defaultEmbed()
      .setAuthor(data.guild.name, data.guild.iconURL)
      .setDescription(stripIndents`Hey, ${data.author.mention}. Your suggestion has been deleted by ${data.executor.mention}.

        ${data.reason && `**Reason:** ${data.reason}\`\n`}**Reference ID:** ${Util.boldCode(data.id)}
      `)
      .setFooter(`Guild ID: ${data.guild.id} | sID: ${data.id}`)
      .setTimestamp();
  }
}
