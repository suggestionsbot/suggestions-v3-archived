import { oneLine, stripIndents } from 'common-tags';
import { EmbedField, Guild, Message, User } from 'eris';

import MessageEmbed from './MessageEmbed';
import MessageUtils from './MessageUtils';
import Util from './Util';
import { IMAGE_URL_REGEX } from './Constants';
import SuggestionChannel from '../structures/suggestions/SuggestionChannel';

interface FullEmbedData {
  id: string;
  suggestion: string;
  message: Message;
  author: User;
  nickname: boolean;
  guild: Guild;
  channel: SuggestionChannel;
}

interface CompactEmbedData {
  suggestion: string;
  message: Message;
  author: User;
  nickname: boolean;
}

interface CreateDMData {
  id: string;
  link: string;
  suggestion: string;
  guild: Guild;
  author: User;
  channel: SuggestionChannel;
}

interface EditDMData {
  id: string;
  link: string;
  suggestion: { before: string; after: string; };
  guild: Guild;
  author: User;
  executor: User;
  reason?: string;
}

interface DeleteDMData {
  id: string;
  suggestion: string;
  guild: Guild;
  author: User
  executor: User;
  reason?: string;
}

export default class SuggestionEmbeds {
  static fullSuggestion(data: FullEmbedData): MessageEmbed {
    const imageCheck = IMAGE_URL_REGEX.exec(data.suggestion);
    const displayName = data.nickname
      ? oneLine`${data.message?.member?.displayName ?? data.author.username}#
        ${data.message?.member?.discriminator ?? data.author.discriminator}`
      : data.author.tag;

    const embed = MessageUtils.defaultEmbed()
      .setDescription(stripIndents`
        **Submitter**
        ${Util.escapeMarkdown(displayName)}
        
        **Suggestion**
        ${data.suggestion}
      `)
      .setThumbnail(data.author.avatarURL)
      .setFooter(`Author ID: ${data.author.id} | sID: ${data.id}`);

    if (imageCheck) embed.setImage(imageCheck[0]);
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

  static suggestionCreatedMessage(data: { author: User, channel: SuggestionChannel, id: string, link: string }): string {
    return stripIndents`Hey, ${data.author.mention}. Your suggestion has been sent to ${data.channel.channel.mention} to be voted on!
      
      Please wait until a staff member handles your suggestion.
      
      *Jump to Suggestion* → [${Util.boldCode(data.id)}](${data.link})
    `;
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
