import {
  Client,
  ClientOptions,
  Embed,
  Emoji,
  Guild,
  GuildChannel,
  GuildTextableChannel,
  Member,
  Message,
  TextableChannel,
  User
} from 'eris';
import { inspect, promisify } from 'util';
import { Base } from 'eris-sharder';
import Collection from '@discordjs/collection';
import { stripIndents } from 'common-tags';
import dotenv from 'dotenv';
dotenv.config();

import {
  Command,
  Event,
  BotConfig,
  SubCommand,
  CollectorFilter,
  AwaitMessagesOptions,
  AwaitReply,
  AwaitReactionsOptions, GuildSchema, SuggestionsMessage
} from '../types';
import CoreLoaders from '../utils/core';
import config from '../config';
import CommandHandler from '../handlers/CommandHandler';
import MongoDB from '../provider/mongodb';
import MessageCollector from '../utils/MessageCollector';
import ReactionCollector from '../utils/ReactionCollector';
import Redis from '../provider/redis';
import Logger from '../utils/Logger';
import MessageUtils from '../utils/MessageUtils';

/**
 * Rewrite all emoji search methods to support sharding/clustering
 */
export default class SuggestionsClient extends Client {
  private _core: CoreLoaders;
  public readonly production: boolean;
  public base: Base;
  public sentry: any;
  public commands: Collection<string, Command>;
  public aliases: Collection<string, string>;
  public subCommands: Collection<string, SubCommand>;
  public subCommandAliases: Collection<string, string>;
  public events: Collection<string, Event>;
  public config: BotConfig;
  public commandHandler: CommandHandler;
  public wait: any;
  public database: MongoDB;
  public redis: Redis;
  public messageCollectors: Array<MessageCollector>;

  constructor(public token: string, options?: ClientOptions) {
    super(token, options);

    this.commands = new Collection();
    this.subCommands = new Collection();
    this.aliases = new Collection();
    this.subCommandAliases = new Collection();
    this.events = new Collection();

    this._core = new CoreLoaders(this);
    this.database = new MongoDB(this);
    this.redis = new Redis(this);
    this.production = (/true/i).test(process.env.NODE_ENV);
    this.config = config;
    this.commandHandler = new CommandHandler(this);
    this.wait = promisify(setTimeout);
    this.messageCollectors = [];
  }

  public start(): void {
    this._core.loadCommands();
    this._core.loadListeners();
    this._addEventListeners();
    super.connect();
  }

  public getPrefixes(regex = false, settings?: GuildSchema): ReadonlyArray<string> {
    const prefixes: Array<string> = settings ?
      [
        ...settings.prefixes,
        this.user.mention
      ] :
      [
        ...this.config.prefixes,
        this.user.mention
      ];

    const modified: Array<string> = prefixes.map((p, i) => {
      if (regex) {
        if (i === (prefixes.length - 1)) return `^<@!?${this.user.id}> `;
        else return `\\${p}`;
      } else {
        return p;
      }
    });

    return Object.freeze(modified);
  }

  public updateBotPresence(): void {
    const prefix = this.getPrefixes()[0];
    const help = this.commands.get('help') || { name: 'help' };

    if (this.production) {
      this.base.ipc.broadcast('changeStatus', {
        status: 'online',
        name: `your suggestions | ${prefix + help.name}`,
        type: 2,
        url: null
      });
    } else {
      this.base.ipc.broadcast('changeStatus', {
        status: 'dnd',
        name: 'in code land...',
        type: 0,
        url: null
      });
    }
  }

  public findEmojiByName(name: string, guild: Guild): Emoji {
    return guild.emojis.find((r: Emoji) => r.name === name);
  }

  public findEmojiByID(id: string, guild: Guild): Emoji {
    return guild.emojis[id];
  }

  public findEmojiByString(str: string, guild: Guild): Emoji {
    return guild.emojis.find((r: Emoji) => r.toString() === str);
  }

  public isStaff(member: Member, settings: GuildSchema): boolean {
    let staffCheck: boolean;
    const adminCheck = this.isAdmin(member) || this.isOwner(member);
    // TODO implement proper staff role usage
    const staffRoles = settings.staffRoles;
    if (staffRoles) staffCheck = member.roles.some(r => staffRoles.includes(r)) || adminCheck;
    else staffCheck = adminCheck;

    return staffCheck;
  }

  public isAdmin(member: Member): boolean {
    let hasPerm = false;
    ['administrator', 'manageGuild'].map(p => {
      if (member.permission.has(p)) hasPerm = true;
      return;
    });

    return hasPerm;
  }

  public isOwner(user: User|Member): boolean {
    return this.config.owners.includes(user.id);
  }

  public async awaitChannelMessages(channel: TextableChannel, filter: CollectorFilter<Message>, options: AwaitMessagesOptions): Promise<MessageCollector> {
    return new MessageCollector(this, channel, filter, options).run();
  }

  public async awaitMessageReactions(message: Message, filter: CollectorFilter<any>, options: AwaitReactionsOptions): Promise<ReactionCollector> {
    return new ReactionCollector(this, message, filter, options).run();
  }

  public async awaitReply(
    message: Message,
    channel: TextableChannel,
    question: string,
    embed: Embed,
    limit?: number
  ): Promise<AwaitReply> {
    const filter = (msg: Message): boolean => msg.author.id === message.author.id;
    channel = channel || message.channel;

    try {
      const originMsg: Message = await channel.createMessage({
        content: question || null,
        embed: embed || null
      });
      const { collected } = await this.awaitChannelMessages(channel, filter, {
        max: 1,
        time: limit || 60000, // by default, limit 1 minutes
        errors: ['time']
      });

      return {
        originMsg,
        reply: collected.get(collected.keys().next().value)
      };
    } catch (e) {
      return;
    }
  }

  public async awaitReactions(
    user: User,
    channel: TextableChannel,
    question: string,
    reactions: Array<any>,
    embed: Embed,
    limit?: number
  ): Promise<any> {
    const filter = (userID: string): boolean => userID === user.id;

    let msg: Message;
    try {
      msg = await channel.createMessage({
        content: question || null,
        embed: embed || null
      });
      for (const r of reactions) await msg.addReaction(r);

      const { collected } = await this.awaitMessageReactions(msg, filter, {
        max: 1,
        time: limit || 60000, // by default, limit 1 minutes
        errors: ['time']
      });

      return collected[0];
    } catch (error) {
      if (msg) msg.delete();
    }
  }

  private _addEventListeners(): void {
    this.on('messageCreate', this._runMessageOperator);
  }

  private _runMessageOperator(message: SuggestionsMessage): void {
    this._commandListener(message);
  }

  private async _commandListener(message: SuggestionsMessage): Promise<void> {
    try {

      if (message.author.bot) return;
      if ((message.channel instanceof GuildChannel) && !message.channel.permissionsOf(this.user.id).has('sendMessages')) return;

      let settings: GuildSchema;
      if (message.guildID) {
        try {
          settings = await this.database.guildHelpers.getGuild(message.guildID);
        } catch (e) {
          Logger.error('COMMAND HANDLER', e);
        }
      }

      const prefixes = this.getPrefixes(true, settings);
      const prefixRegex = new RegExp(`(${prefixes.join('|')})`);
      const prefix = message.content.match(prefixRegex) ? message.content.match(prefixRegex)[0] : null;

      const getPrefix = new RegExp(`^<@!?${this.user.id}>( |)$`);
      if (message.content.match(getPrefix)) {
        let i = 1;
        const embed = MessageUtils.defaultEmbed()
          .setDescription(stripIndents`My prefixes ${message.guildID ? 'in this guild' : ''} are:

          ${this.getPrefixes(false, settings).map(p => `**${i++})** ${p}`).join('\n')}
        `);
        await (message.channel as GuildTextableChannel).createMessage({ embed });
        return;
      }

      if (!prefix) return;
      if (message.content.indexOf(prefix) !== 0) return;
      message.prefix = prefix;

      await this.commandHandler.handle(message, settings);
    } catch (e) {
      console.error(e.stack);
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  public async clean(text: any): Promise<any> {
    if (text && text.constructor.name === 'Promise') text = await text;
    if (typeof text !== 'string') {
      text = inspect(text, {
        depth: 1
      });
    }

    text = text
      .replace(/`/g, '`' + String.fromCharCode(8203))
      .replace(/@/g, '@' + String.fromCharCode(8203))
      .replace(this.token, '-REDACTED-')
      .replace(process.env.MONGO_URI, '-REDACTED-')
      .replace(process.env.DISCORD_TOKEN, '-REDACTED-')
      .replace(process.env.REDIS_HOSTNAME, '-REDACTED-')
      .replace(process.env.REDIS_PASSWORD, '-REDACTED-')
      .replace(process.env.REDIS_PORT, '-REDACTED-')
      .replace(process.env.SENTRY_DSN, '-REDACTED-')
      .replace(process.env.SENTRY_TRACES_SAMPLERATE, '-REDACTED-');

    return text;
  }

}
