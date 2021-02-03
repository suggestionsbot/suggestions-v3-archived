import { oneLine, stripIndents } from 'common-tags';
import { Guild, Message, User } from 'eris';

import MessageEmbed from './MessageEmbed';
import MessageUtils from './MessageUtils';
import Util from './Util';
import { IMAGE_URL_REGEX } from './Constants';
import SuggestionChannel from '../structures/suggestions/SuggestionChannel';

interface EmbedData {
  id?: string;
  suggestion: string;
  message: Message;
  author: User;
  nickname: boolean;
  guild?: Guild;
  link?: string;
  channel?: SuggestionChannel;
}

export default class SuggestionEmbeds {
  static fullSuggestion(data: EmbedData): MessageEmbed {
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

  static compactSuggestion(data: EmbedData): MessageEmbed {
    const displayName = data.nickname
      ? oneLine`${data.message?.member?.displayName ?? data.author.username}#
        ${data.message?.member?.discriminator ?? data.author.discriminator}`
      : data.author.tag;

    return MessageUtils.defaultEmbed()
      .setAuthor(displayName, data.author.avatarURL)
      .setDescription(stripIndents(data.suggestion));
  }

  static suggestionCreatedDM(data: EmbedData): MessageEmbed {
    return MessageUtils.defaultEmbed()
      .setAuthor(data.guild!.name, data.guild!.iconURL)
      .setDescription(stripIndents`Hey, ${data.author.mention}. Your suggestion has been sent to ${data.channel!.channel.mention} to be voted on!
        
        Please wait until a staff member handles your suggestion.
        
        *Jump to Suggestion* → [\`[${data.id}]\`](${data.link})
      `)
      .setFooter(`Guild ID: ${data.guild!.id} | sID: ${data.id}`)
      .setTimestamp();
  }
}
