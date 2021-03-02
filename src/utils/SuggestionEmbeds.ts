import { stripIndents } from 'common-tags';
import { EmbedField, Guild, Member, Message, User } from 'eris';

import MessageEmbed from './MessageEmbed';
import MessageUtils from './MessageUtils';
import Util from './Util';
import SuggestionChannel from '../structures/suggestions/SuggestionChannel';
import { ResultEmoji } from '../types';
import config from '../config';

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

interface ApprovedEmbedData extends BaseEmbedData {
  results: Array<ResultEmoji>;
  executor: User;
  reason?: string;
}

type RejectedEmbedData = ApprovedEmbedData;

type ConsideredEmbedData = ApprovedEmbedData;

type ImplementedEmbedData = Omit<ApprovedEmbedData, 'results'>;

type CreateDMData = Omit<BaseDMEmbedData, 'executor' | 'reason' | 'nickname' | 'message'>;

type DeleteDMData = Omit<BaseDMEmbedData, 'link' | 'nickname' | 'channel' | 'message'>;

interface EditDMData extends Omit<BaseDMEmbedData, 'suggestion' | 'nickname' | 'channel' | 'message'> {
  suggestion: { before: string; after: string; };
}

export default class SuggestionEmbeds {
  private static getDisplayName(data: { nickname: boolean; user: Member | User; }): string {
    const displayName = 'user' in data.user ? data.user.displayName : data.user.username;
    const discriminator = data.user.discriminator;

    return data.nickname ? `${displayName}#${discriminator}` : 'user' in data.user ? data.user.user.tag : data.user.tag;
  }

  private static getVoteResults(results: Array<ResultEmoji>): string {
    return results.map(({ emoji, count }) => {
      const parsed = Util.parseEmoji(emoji);
      return `${parsed?.id ? Util.getEmojiString(parsed) : parsed?.name ?? emoji}**: ${count}**`;
    }).join('\n');
  }

  static fullSuggestion(data: FullEmbedData): MessageEmbed {
    const imageCheck = data.message.embeds.filter(e => !!e.thumbnail && (e.type !== 'rich'));
    const imageThumbnail = !imageCheck.isEmpty() ? imageCheck[0].thumbnail : undefined;
    const displayName = this.getDisplayName({
      nickname: data.nickname,
      user: data.message?.member ?? data.author
    });

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
    const displayName = this.getDisplayName({
      nickname: data.nickname,
      user: data.message?.member ?? data.author
    });

    return MessageUtils.defaultEmbed()
      .setAuthor(displayName, data.author.avatarURL)
      .setDescription(stripIndents(data.suggestion));
  }

  static approvedSuggestion(data: ApprovedEmbedData): MessageEmbed {
    const displayName = this.getDisplayName({
      nickname: data.nickname,
      user: data.message?.member ?? data.author
    });

    return new MessageEmbed()
      .setAuthor(data.guild.name, data.guild.iconURL)
      .setColor(config.colors.suggestion.approved)
      .setDescription(stripIndents`
        **Results**
        ${this.getVoteResults(data.results)}
        
        **Suggestion**
        ${data.suggestion}
        
        **Submitter**
        ${Util.escapeMarkdown(displayName)}
        
        **Approved By**
        ${data.executor.mention}
        ${data.reason ? `\n**Reason**\n${data.reason}` : ''}
      `)
      .setFooter(`sID: ${data.id}`)
      .setTimestamp();
  }

  static rejectedSuggestion(data: RejectedEmbedData): MessageEmbed {
    const displayName = SuggestionEmbeds.getDisplayName({
      nickname: data.nickname,
      user: data.message?.member ?? data.author
    });

    return new MessageEmbed()
      .setAuthor(data.guild.name, data.guild.iconURL)
      .setColor(config.colors.suggestion.rejected)
      .setDescription(stripIndents`
        **Results**
        ${this.getVoteResults(data.results)}
        
        **Suggestion**
        ${data.suggestion}
        
        **Submitter**
        ${Util.escapeMarkdown(displayName)}
        
        **Rejected By**
        ${data.executor.mention}
        ${data.reason ? `\n**Reason**\n${data.reason}` : ''}
      `)
      .setFooter(`sID: ${data.id}`)
      .setTimestamp();
  }

  static consideredSuggestion(data: ConsideredEmbedData): MessageEmbed {
    const displayName = SuggestionEmbeds.getDisplayName({
      nickname: data.nickname,
      user: data.message?.member ?? data.author
    });

    return new MessageEmbed()
      .setAuthor(data.guild.name, data.guild.iconURL)
      .setColor(config.colors.suggestion.considered)
      .setDescription(stripIndents`
        **Results**
        ${this.getVoteResults(data.results)}
        
        **Suggestion**
        ${data.suggestion}
        
        **Submitter**
        ${Util.escapeMarkdown(displayName)}
        
        **Considered By**
        ${data.executor.mention}
        ${data.reason ? `\n**Reason**\n${data.reason}` : ''}
      `)
      .setFooter(`sID: ${data.id}`)
      .setTimestamp();
  }

  static implementedSuggestion(data: ImplementedEmbedData): MessageEmbed {
    const displayName = SuggestionEmbeds.getDisplayName({
      nickname: data.nickname,
      user: data.message?.member ?? data.author
    });

    return new MessageEmbed()
      .setAuthor(data.guild.name, data.guild.iconURL)
      .setColor(config.colors.suggestion.implemented)
      .setDescription(stripIndents`
        **Suggestion**
        ${data.suggestion}
        
        **Submitter**
        ${Util.escapeMarkdown(displayName)}
        
        **Implemented By**
        ${data.executor.mention}
        ${data.reason ? `\n**Reason**\n${data.reason}` : ''}
      `)
      .setFooter(`sID: ${data.id}`)
      .setTimestamp();
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
        
        ${data.reason ? `**Reason:** ${data.reason}\n` : ''}
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

  static suggestionApprovedDM(data: BaseDMEmbedData): MessageEmbed {
    return new MessageEmbed()
      .setColor(config.colors.suggestion.approved)
      .setAuthor(data.guild.name, data.guild.iconURL)
      .setDescription(stripIndents`Hey, ${data.author.mention}. Your suggestion has been approved by ${data.executor.mention}!
        
        ${data.reason ? `**Reason:** ${data.reason}\n` : ''}
        *Jump to Suggestion* → [${Util.boldCode(data.id)}](${data.link})
      `)
      .setFooter(`Guild ID: ${data.guild.id} | sID: ${data.id}`)
      .setTimestamp();
  }
}
