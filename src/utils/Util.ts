import { Emoji, Guild, GuildChannel, Member, PartialEmoji, Permission, Role, TextChannel, User } from 'eris';
import GiphyAPI, { Giphy } from 'giphy-api';
import { execSync } from 'child_process';
import path from 'path';
import { lstatSync, readdirSync } from 'fs';

import Permissions from './Permissions';
import { SuggestionGuild, SuggestionUser } from '../types';
import CommandContext from '../structures/commands/Context';

export default class Util {
  public static formatPermission(permission: string): string {
    return Permissions[permission];
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

  public static getGiphy(): Giphy {
    return GiphyAPI({
      apiKey: process.env.GIPHY,
      https: true
    });
  }

  public static lastCommitHash(): string {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).slice(0, 7);
  }

  public static getMissingPermissions(permissions: Array<string|number>|Permission, channel: GuildChannel, member: Member): Array<string> {
    const missingPermissions: Array<string> = [];
    permissions = permissions instanceof Permission ? Object.keys(permissions.json) : permissions;

    for (const permission of permissions) {
      if (!channel.permissionsOf(member.id).has(<string>permission)) {
        missingPermissions.push(Util.formatPermission(<string>permission));
      }
    }

    return missingPermissions;
  }

  public static parseEmoji(text: string): PartialEmoji|null {
    if (text.includes('%')) text = decodeURIComponent(text);
    if (!text.includes(':')) return { animated: false, name: text, id: null };
    const m = text.match(/<?(?:(a):)?(\w{2,32}):(\d{17,19})?>?/);
    if (!m) return null;
    return { animated: Boolean(m[1]), name: m[2], id: m[3] || null };
  }

  public static getEmojiString(emoji: Emoji|PartialEmoji): string {
    if (emoji.animated) return `<a:${emoji.name}:${emoji.id}>`;
    else return `<:${emoji.name}:${emoji.id}>`;
  }

  public static getReactionString(emoji: Emoji|PartialEmoji): string {
    if (emoji.animated) return `a:${emoji.name}:${emoji.id}`;
    else return `:${emoji.name}:${emoji.id}`;
  }

  public static matchUnicodeEmoji(emoji: string): RegExpExecArray|null {
    return /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/i.exec(emoji);
  }

  public static getGuildMemberByID(guild: Guild, id: string): Promise<Member> {
    return guild.fetchMembers({ userIDs: [id] }).then(res => res[0]);
  }

  public static walk(directory: string, extensions: Array<string>): Array<string> {
    const read = (dir: string, files: Array<string> = []): Array<string> => {
      for (const file of readdirSync(dir)) {
        const filePath = path.join(dir, file), stats = lstatSync(filePath);
        if (stats.isFile() && extensions.some(ext => filePath.endsWith(ext))) files.push(filePath);
        else if (stats.isDirectory()) files = files.concat(read(filePath));
      }

      return files;
    };

    return read(directory);
  }
}
