import { stripIndents } from 'common-tags';

import MessageEmbed from './MessageEmbed';
import MessageUtils from './MessageUtils';
import Suggestion from '../structures/suggestions/Suggestion';
import Util from './Util';
import { IMAGE_URL_REGEX } from './Constants';

export default class SuggestionEmbeds {
  static fullSuggestion(suggestion: Suggestion): MessageEmbed {
    const imageCheck = IMAGE_URL_REGEX.exec(suggestion.suggestion!);

    const embed = MessageUtils.defaultEmbed()
      .setDescription(stripIndents`
          **Submitter**
          ${Util.escapeMarkdown(suggestion.author.tag)}
          
          **Suggestion**
          ${suggestion.suggestion!}
        `)
      .setThumbnail(suggestion.author.avatarURL)
      .setFooter(`Author ID: ${suggestion.author.id} | sID: ${suggestion.id(true)}`);

    if (imageCheck) embed.setImage(imageCheck[0]);
    return embed;
  }

  static compactSuggestion(suggestion: Suggestion): MessageEmbed {
    return MessageUtils.defaultEmbed()
      .setAuthor(suggestion.author.tag, suggestion.author.avatarURL)
      .setDescription(stripIndents(suggestion.suggestion!));
  }

  static suggestionCreatedDM(suggestion: Suggestion): MessageEmbed {
    return MessageUtils.defaultEmbed()
      .setAuthor(suggestion.guild.name, suggestion.guild.iconURL)
      .setDescription(stripIndents`Hey, ${suggestion.author.mention}. Your suggestion has been sent to ${suggestion.channel.channel.mention} to be voted on!
        
        Please wait until a staff member handles your suggestion.
        
        *Jump to Suggestion* → [\`[${suggestion.id(true)}]\`](${suggestion.link})
      `)
      .setFooter(`Guild ID: ${suggestion.guild.id} | sID: ${suggestion.id(true)}`)
      .setTimestamp();
  }
}
