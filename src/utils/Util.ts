import dotenv from 'dotenv';
import GiphyAPI, { Giphy } from 'giphy-api';
dotenv.config();

import Permissions from './Permissions';
import { Guild, Member, Role, TextChannel, User } from 'eris';
import { SuggestionGuild, SuggestionUser } from '../types';
import CommandContext from '../structures/Context';
import { execSync } from 'child_process';

export default class Util {
  public static formatPermission(permission: string): string {
    return Permissions[permission];
  }

  public static formatUserTag(user: User): string {
    return `${user.username}#${user.discriminator}`;
  }

  public static getGuildID(guild: SuggestionGuild): string {
    return guild instanceof Guild ? guild.id : guild;
  }

  public static getUserID(user: SuggestionUser): string {
    let data: string;
    if (user instanceof User) data = user.id;
    if (user instanceof Member) data = user.id;
    if (typeof user === 'string') data = user;

    return data!;
  }

  public static escapeMarkdown(
    text: string,
    {
      codeBlock = true,
      inlineCode = true,
      bold = true,
      italic = true,
      underline = true,
      strikethrough = true,
      spoiler = true,
      codeBlockContent = true,
      inlineCodeContent = true,
    } = {}
  ): string {
    if (!codeBlockContent) {
      return text
        .split('```')
        .map((subString, index, array) => {
          if (index % 2 && index !== array.length - 1) return subString;
          return Util.escapeMarkdown(subString, {
            inlineCode,
            bold,
            italic,
            underline,
            strikethrough,
            spoiler,
            inlineCodeContent,
          });
        })
        .join(codeBlock ? '\\`\\`\\`' : '```');
    }
    if (!inlineCodeContent) {
      return text
        .split(/(?<=^|[^`])`(?=[^`]|$)/g)
        .map((subString, index, array) => {
          if (index % 2 && index !== array.length - 1) return subString;
          return Util.escapeMarkdown(subString, {
            codeBlock,
            bold,
            italic,
            underline,
            strikethrough,
            spoiler,
          });
        })
        .join(inlineCode ? '\\`' : '`');
    }
    if (inlineCode) text = Util.escapeInlineCode(text);
    if (codeBlock) text = Util.escapeCodeBlock(text);
    if (italic) text = Util.escapeItalic(text);
    if (bold) text = Util.escapeBold(text);
    if (underline) text = Util.escapeUnderline(text);
    if (strikethrough) text = Util.escapeStrikethrough(text);
    if (spoiler) text = Util.escapeSpoiler(text);
    return text;
  }

  public static escapeCodeBlock(text: string): string {
    return text.replace(/```/g, '\\`\\`\\`');
  }

  public static escapeInlineCode(text: string): string {
    return text.replace(/(?<=^|[^`])`(?=[^`]|$)/g, '\\`');
  }

  public static escapeItalic(text: string): string {
    let i = 0;
    text = text.replace(/(?<=^|[^*])\*([^*]|\*\*|$)/g, (_, match) => {
      if (match === '**') return ++i % 2 ? `\\*${match}` : `${match}\\*`;
      return `\\*${match}`;
    });
    i = 0;
    return text.replace(/(?<=^|[^_])_([^_]|__|$)/g, (_, match) => {
      if (match === '__') return ++i % 2 ? `\\_${match}` : `${match}\\_`;
      return `\\_${match}`;
    });
  }

  public static escapeBold(text: string): string {
    let i = 0;
    return text.replace(/\*\*(\*)?/g, (_, match) => {
      if (match) return ++i % 2 ? `${match}\\*\\*` : `\\*\\*${match}`;
      return '\\*\\*';
    });
  }

  public static escapeUnderline(text: string): string {
    let i = 0;
    return text.replace(/__(_)?/g, (_, match) => {
      if (match) return ++i % 2 ? `${match}\\_\\_` : `\\_\\_${match}`;
      return '\\_\\_';
    });
  }

  public static escapeStrikethrough(text: string): string {
    return text.replace(/~~/g, '\\~\\~');
  }

  public static escapeSpoiler(text: string): string {
    return text.replace(/\|\|/g, '\\|\\|');
  }

  public static getChannel(s: string, guild: Guild): TextChannel|undefined {
    if (/^[0-9]+$/.test(s)) {
      const channel = guild.channels.get(s);
      if (!channel || [1, 2, 3, 4].includes(channel.type)) return;
      return (channel as TextChannel);
    } else if (/^<#[0-9]+>$/.test(s)) {
      const id = s.substring(2, s.length - 1);
      const channel = guild.channels.get(id);
      if (!channel || [1, 2, 3, 4].includes(channel.type)) return;
      return (channel as TextChannel);
    }

    return guild.channels.find(x => x.type === 0 && x.name.toLowerCase() === s) as TextChannel | undefined;
  }

  public static getRole(s: string, ctx: CommandContext): Role|undefined {
    if (/^[0-9]+$/.test(s)) return ctx.guild!.roles.get(s);
    else if (/^<@&[0-9]+>$/.test(s)) {
      const id = s.substring(3, s.length - 1);
      return ctx.guild!.roles.get(id);
    }

    return ctx.guild!.roles.find(x => x.name.toLowerCase() === s);
  }

  public static toProperCase(s: string): string {
    return s.replace(/([^\W_]+[^\s-]*) */g, function(txt) {return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
  }

  public static getGiphy(): Giphy {
    return GiphyAPI({
      apiKey: process.env.GIPHY,
      https: true
    });
  }

  public static lastCommitHash(): string {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).slice(0, 7);
  }
}
