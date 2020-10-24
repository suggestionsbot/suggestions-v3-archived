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
import { stripIndents } from 'common-tags';
import dotenv from 'dotenv';
dotenv.config();

import {
  BotConfig,
  CollectorFilter,
  AwaitMessagesOptions,
  AwaitReply,
  AwaitReactionsOptions,
  GuildSchema,
} from '../types';
import config from '../config';
import CommandHandler from '../handlers/CommandHandler';
import MongoDB from '../provider/mongodb';
import MessageCollector from '../utils/MessageCollector';
import ReactionCollector from '../utils/ReactionCollector';
import Redis from '../provider/redis';
import Logger from '../utils/Logger';
import MessageUtils from '../utils/MessageUtils';
import LocalizationManager from '../managers/LocalizationManager';
import { CommandManager, SubCommandManager } from '../managers/CommandManager';
import ListenerManager from '../managers/ListenerManager';
import BotListManager from '../managers/BotListManager';
import ChecksManager from '../managers/ChecksManager';
import RatelimitManager from '../managers/RatelimitManager';
import ChannelManager from '../managers/ChannelManager';

/**
 * TODO Rewrite all emoji search methods to support sharding/clustering
 */
export default class SuggestionsClient extends Client {
  public readonly production: boolean;
  public base: Base|undefined;
  public commands: CommandManager;
  public subCommands: SubCommandManager;
  public events: ListenerManager;
  public locales: LocalizationManager;
  public botlists: BotListManager;
  public checks: ChecksManager;
  public ratelimiters: RatelimitManager;
  public suggestionChannels: ChannelManager;
  public config: BotConfig;
  public commandHandler: CommandHandler;
  public wait: any;
  public database: MongoDB;
  public redis: Redis;
  public messageCollectors: Array<MessageCollector>;

  constructor(public token: string, options?: ClientOptions) {
    super(token, options);

    this.commands = new CommandManager(this);
    this.subCommands = new SubCommandManager(this);
    this.events = new ListenerManager(this);
    this.locales = new LocalizationManager(this);
    this.botlists = new BotListManager(this);
    this.checks = new ChecksManager(this);
    this.ratelimiters = new RatelimitManager(this);
    this.suggestionChannels = new ChannelManager(this);

    this.database = new MongoDB(this);
    this.redis = new Redis(this);
    this.production = (/true/i).test(process.env.NODE_ENV!);
    this.config = config;
    this.commandHandler = new CommandHandler(this);
    this.wait = promisify(setTimeout);
    this.messageCollectors = [];
  }

  public start(): void {
    this.commands.init();
    this.events.init();
    this._addEventListeners();
    this.locales.init();
    this.checks.init();
    super.connect();
  }

  public getPrefixes(regex = false, formatted = false, settings?: GuildSchema): ReadonlyArray<string> {
    const prefixes: Array<string> = settings ?
      [...settings.prefixes, 'mention'] :
      [...this.config.prefixes, 'mention'];

    const modified: Array<string> = prefixes.map(p => {
      if (regex) {
        if (p === 'mention') return `^<@!?${this.user.id}> `;
        else return `\\${p}`;
      } else if (formatted) {
        if (p === 'mention') return this.user.mention;
        else return `\`${p}\``;
      } else {
        return p;
      }
    });

    return Object.freeze(modified);
  }

  public updateBotPresence(): void {
    const prefix = this.getPrefixes()[0];
    const help = this.commands.getCommand('help') || { name: 'help' };

    if (this.production) {
      this.base!.ipc.broadcast('changeStatus', {
        status: 'online',
        name: `your suggestions | ${prefix + help.name}`,
        type: 2
      });
    } else {
      this.base!.ipc.broadcast('changeStatus', {
        status: 'dnd',
        name: 'in code land...',
        type: 0
      });
    }
  }

  public findEmojiByName(name: string, guild: Guild): Emoji {
    return guild.emojis.find((r: Emoji) => r.name === name)!;
  }

  public findEmojiByID(id: string, guild: Guild): Emoji {
    return guild.emojis.find((r: Emoji) => r.id === id)!;
  }

  public findEmojiByString(str: string, guild: Guild): Emoji {
    return guild.emojis.find((r: Emoji) => r.toString() === str)!;
  }

  public isStaff(member: Member, settings: GuildSchema): boolean {
    let staffCheck: boolean;
    const adminCheck = this.isAdmin(member) || this.isOwner(member);
    const staffRoles = settings.staffRoles;
    if (staffRoles) staffCheck = member.roles.some(r => staffRoles.map(r => r.role).includes(r)) || adminCheck;
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

  public isSuperSecret(user: User): boolean {
    return this.config.superSecretUsers.includes(user.id);
  }

  public isOwner(user: User|Member|string): boolean {
    return this.config.owners.includes(typeof user === 'object' ? user.id : user);
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
    question: string|undefined,
    embed: Embed|undefined,
    limit?: number
  ): Promise<AwaitReply|void> {
    const filter = (msg: Message): boolean => msg.author.id === message.author.id;
    channel = channel || message.channel;

    try {
      const originMsg: Message = await channel.createMessage({
        content: question,
        embed: embed
      });
      const { collected } = await this.awaitChannelMessages(channel, filter, {
        max: 1,
        time: limit || 60000, // by default, limit 1 minutes
        errors: ['time']
      });

      return {
        originMsg,
        reply: collected.get(collected.keys().next().value)!
      };
    } catch (e) {
      return;
    }
  }

  public async awaitReactions(
    user: User,
    channel: TextableChannel,
    question: string|undefined,
    reactions: Array<any>,
    embed: Embed|undefined,
    limit?: number
  ): Promise<any> {
    const filter = (userID: string): boolean => userID === user.id;

    let msg!: Message;
    try {
      msg = await channel.createMessage({
        content: question,
        embed: embed
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

  private _runMessageOperator(message: Message): void {
    this._commandListener(message);
  }

  private async _commandListener(message: Message): Promise<void> {
    try {

      if (message.author.bot) return;
      if ((message.channel instanceof GuildChannel) && !message.channel.permissionsOf(this.user.id).has('sendMessages')) return;

      let settings!: GuildSchema;
      if (message.guildID) {
        try {
          if (this.database.connection !== null) settings = await this.database.guildHelpers.getGuild(message.guildID);
          else settings = <GuildSchema><unknown>{ ...this.config.defaults, guild: message.guildID };
        } catch (e) {
          Logger.error('COMMAND HANDLER', e);
        }
      } else {
        settings = <GuildSchema><unknown>this.config.defaults;
      }

      const prefixes = this.getPrefixes(true, false, settings);
      const prefixRegex = new RegExp(`(${prefixes.join('|')})`);
      const prefix = message.content.match(prefixRegex) ? message.content.match(prefixRegex)![0] : null;

      const getPrefix = new RegExp(`^<@!?${this.user.id}>( |)$`);
      if (message.content.match(getPrefix)) {
        let i = 1;
        const embed = MessageUtils.defaultEmbed()
          .setDescription(stripIndents`My prefixes ${message.guildID ? 'in this guild' : ''} are:

          ${this.getPrefixes(false, true, settings).map(p => `**${i++})** ${p}`).join('\n')}
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
      .replace(process.env.REDIS_PORT, '-REDACTED-')
      .replace(process.env.SENTRY_DSN, '-REDACTED-')
      .replace(process.env.SENTRY_TRACES_SAMPLERATE, '-REDACTED-');

    if (process.env.REDIS_PASSWORD) text = text.replace(process.env.REDIS_PASSWORD, '-REDACTED-');

    return text;
  }

}
