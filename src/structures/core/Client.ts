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
  TextableChannel, TextChannel,
  User
} from 'eris';
import { inspect } from 'util';
import { stripIndents } from 'common-tags';

import {
  BotConfig,
  CollectorFilter,
  AwaitMessagesOptions,
  AwaitReply,
  AwaitReactionsOptions,
  GuildSchema, SuggestionChannelType, SuggestionUser, UserSchema, ClientStatusData,
} from '../../types';
import config from '../../config';
import CommandHandler from '../../handlers/CommandHandler';
import MongoDB from '../../providers/mongodb';
import MessageCollector from '../../utils/MessageCollector';
import ReactionCollector from '../../utils/ReactionCollector';
import Redis from '../../providers/redis';
import Logger from '../../utils/Logger';
import MessageUtils from '../../utils/MessageUtils';
import LocalizationManager from '../../managers/LocalizationManager';
import { CommandManager, SubCommandManager } from '../../managers/CommandManager';
import ListenerManager from '../../managers/ListenerManager';
import BotListManager from '../../managers/BotListManager';
import ConditionsManager from '../../managers/ConditionsManager';
import RatelimitManager from '../../managers/RatelimitManager';
import ChannelManager from '../../managers/ChannelManager';
import SuggestionChannel from '../suggestions/SuggestionChannel';
import SuggestionHandler from '../../handlers/SuggestionHandler';
import Context from '../commands/Context';
import Util from '../../utils/Util';
import emojis from '../../utils/Emojis';

/**
 * TODO Rewrite all emoji search methods to support sharding/clustering
 */
export default class SuggestionsClient extends Client {
  readonly production: boolean;
  readonly system: string;
  commands: CommandManager;
  subCommands: SubCommandManager;
  events: ListenerManager;
  locales: LocalizationManager;
  botlists: BotListManager;
  conditions: ConditionsManager;
  ratelimiters: RatelimitManager;
  suggestionChannels: ChannelManager;
  config: BotConfig;
  commandHandler: CommandHandler;
  suggestionHandler: SuggestionHandler;
  database: MongoDB;
  redis: Redis;
  messageCollectors: Array<MessageCollector>;

  constructor(token: string, options?: ClientOptions) {
    super(token, options);

    this.commands = new CommandManager(this);
    this.subCommands = new SubCommandManager(this);
    this.events = new ListenerManager(this);
    this.locales = new LocalizationManager(this);
    this.botlists = new BotListManager(this);
    this.conditions = new ConditionsManager(this);
    this.ratelimiters = new RatelimitManager(this);
    this.suggestionChannels = new ChannelManager(this);

    this.database = new MongoDB(this);
    this.redis = new Redis(this);
    this.production = (/true/i).test(process.env.NODE_ENV!);
    this.config = config;
    this.commandHandler = new CommandHandler(this);
    this.suggestionHandler = new SuggestionHandler(this);
    this.messageCollectors = [];
    this.system = this.production ? '601219766258106399' : '737166408525283348';

    if (!this.production) {
      this.on('debug', (message: string, id: number) => {
        try {
          Logger.debug(`SHARD: ${id}`, JSON.parse(message));
        } catch (e) {
          Logger.debug(`SHARD: ${id}`, message);
        }
      });
    }

    this.on('error', (err: Error, id: number) => {
      Logger.error('CLIENT', 'shard', id, 'error', err.stack);
    });
  }

  start(): void {
    this.commands.init();
    this.events.init();
    this.addEventListeners();
    this.locales.init();
    this.conditions.init();
  }

  connect(): Promise<void> {
    this.start();
    return super.connect();
  }

  getPrefixes(regex = false, formatted = false, settings?: GuildSchema): ReadonlyArray<string> {
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

  updateBotPresence(): void {
    const prefix = this.getPrefixes()[0];

    if (this.production) {
      this.cluster!.ipc.broadcast<ClientStatusData>('changeStatus', {
        status: 'online',
        name: `your suggestions | ${prefix + 'help'}`,
        type: 2
      });
    } else {
      this.cluster!.ipc.broadcast<ClientStatusData>('changeStatus', {
        status: 'dnd',
        name: 'in code land...',
        type: 0
      });
    }
  }

  findEmojiByName(name: string, guild: Guild): Emoji {
    return guild.emojis.find((r: Emoji) => r.name === name)!;
  }

  findEmojiByID(id: string, guild: Guild): Emoji {
    return guild.emojis.find((r: Emoji) => r.id === id)!;
  }

  findEmojiByString(str: string, guild: Guild): Emoji {
    return guild.emojis.find((r: Emoji) => r.toString() === str)!;
  }

  isGuildStaff(member: Member, settings: GuildSchema): boolean {
    let staffCheck: boolean;
    const adminCheck = this.isGuildAdmin(member) || this.isOwner(member);
    const staffRoles = settings.staffRoles;
    if (staffRoles) staffCheck = member.roles.some(r => staffRoles.map(r => r.id).includes(r)) || adminCheck;
    else staffCheck = adminCheck;

    return staffCheck;
  }

  isGuildAdmin(member: Member): boolean {
    return Object.keys(member.permissions.json).some(p => ['administrator', 'manageGuild'].includes(p));
  }

  isSuperSecret(user: User): boolean {
    return this.config.superSecretUsers.includes(user.id);
  }

  isOwner(user: SuggestionUser): boolean {
    return this.config.owners.includes(typeof user === 'object' ? user.id : user);
  }

  isPremiumGuild(guild: Guild): Promise<boolean> {
    return this.database.helpers.guild.getGuild(guild.id)
      .then(guild => guild?.premium ?? false);
  }

  async getVoteEmojisView(settings: GuildSchema, index?: number|null, channel?: SuggestionChannel): Promise<Array<string>|string> {
    let allEmojis = [...emojis];
    if (settings.emojis) allEmojis = [...emojis, ...settings.emojis];

    if (typeof index === 'number') {
      const emojiSet = allEmojis[index];
      const emojis = emojiSet.emojis.map(async e => {
        if (emojiSet.custom) {
          return this.cluster.ipc.fetchGuild(emojiSet.system ? this.system : settings.guild).then(g => {
            if (!g) throw new Error('GuildNotFound');
            const emoji = (<Array<Emoji>>g.emojis).find((emoji: Emoji) => emoji.id === e);
            if (!emoji) return e;

            if (emoji.animated) return `<a:${emoji.name}:${emoji.id}>`;
            else return `<:${emoji.name}:${emoji.id}>`;
          });
        } else {
          return e;
        }
      });

      return Promise.all(emojis).then(e => e.join(' '));
    }

    if (!settings.defaultEmojis) settings.defaultEmojis = 0;
    const emojiSets = allEmojis.map(async (set, index) => {
      let emojiSet;

      if (set.custom) {
        emojiSet = set.emojis.map(async e => {
          return this.cluster!.ipc.fetchGuild(set.system ? this.system : settings.guild).then(g => {
            if (!g) throw new Error('GuildNotFound');
            const emoji = (<Array<Emoji>>g.emojis).find((emoji: Emoji) => emoji.id === e);
            if (!emoji) return e;

            if (emoji.animated) return `<a:${emoji.name}:${emoji.id}>`;
            else return `<:${emoji.name}:${emoji.id}>`;
          });
        });
      } else {
        emojiSet = set.emojis;
      }

      const emojiSetView = await Promise.all(emojiSet);

      if (index === settings.defaultEmojis) return `\`${index++}\`: ${emojiSetView.join(' ')} ***(Default Set)***`;
      if (index === (channel && channel.emojis)) return `\`${index++}\`: ${emojiSetView.join(' ')} ***(Channel Set)***`;
      else return `\`${index++}\` ${emojiSetView.join(' ')}`;
    });

    return Promise.all(emojiSets);
  }

  async awaitChannelMessages(channel: TextableChannel, filter: CollectorFilter<Message>, options: AwaitMessagesOptions): Promise<MessageCollector> {
    return new MessageCollector(this, channel, filter, options).run();
  }

  async awaitMessageReactions(message: Message, filter: CollectorFilter<any>, options: AwaitReactionsOptions): Promise<ReactionCollector> {
    return new ReactionCollector(this, message, filter, options).run();
  }

  async awaitReply(
    message: Message,
    channel: TextableChannel,
    question?: string,
    embed?: Embed,
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

  async awaitReactions(
    user: User,
    channel: TextableChannel,
    question: string|undefined,
    reactions: Array<any>,
    embed?: Embed,
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

  private addEventListeners(): void {
    this.on('messageCreate', this.runMessageOperator);
  }

  private runMessageOperator(message: Message): void {
    this.commandListener(message);
    this.suggestionsListener(message);
  }

  private async suggestionsListener(message: Message): Promise<any> {
    try {
      if (message.author.bot) return;
      if ((message.channel instanceof GuildChannel) &&
        !message.channel.permissionsOf(this.user.id).has('sendMessages')) return;
      if (!message.guildID) return;

      let guildSettings: GuildSchema;
      let userSettings: UserSchema;
      if (this.database.connection !== null) {
        guildSettings = await this.database.helpers.guild.getGuild(message.guildID);
        userSettings = await this.database.helpers.user.getUser(message.author);
      } else {
        guildSettings = <GuildSchema><unknown>{ ...this.config.defaults.guild, guild: message.guildID };
        userSettings = <UserSchema><unknown>{ ...this.config.defaults.user, user: message.author.id };
      }

      const isInDatabase = guildSettings.channels.map(c => c.id).includes(message.channel.id);
      if (!isInDatabase) return;

      let channel = <SuggestionChannel>this.suggestionChannels.get(message.channel.id);
      if (!channel) {
        channel = new SuggestionChannel(
          this,
          (<TextChannel>message.channel).guild,
          SuggestionChannelType.SUGGESTIONS,
            <TextChannel>message.channel,
            guildSettings
        );
        await channel.init();
        await this.suggestionChannels.addChannel(channel);
      }

      if (channel && !channel.initialized) await channel.init();

      const locale = this.locales.get(guildSettings.locale);
      const ctx: Context = new Context(message, [], locale, { guild: guildSettings, user: userSettings });

      // TODO: Implement check for various suggestion-related commands + arg checking for said commands
      if (await this.commands.isCommand(message, guildSettings)) return;
      await this.suggestionHandler.handle(ctx);
    } catch (e) {
      Logger.error('SUGGESTIONS LISTENER', e);
    }
  }

  private async commandListener(message: Message): Promise<void> {
    try {
      if (message.author.bot) return;
      if ((message.channel instanceof GuildChannel) && !message.channel.permissionsOf(this.user.id).has('sendMessages')) return;

      let guildSettings!: GuildSchema;
      let userSettings!: UserSchema;
      try {
        if (message.guildID) {
          if (this.database.connection !== null) {
            guildSettings = await this.database.helpers.guild.getGuild(message.guildID);
            userSettings = await this.database.helpers.user.getUser(message.author);
          } else {
            guildSettings = <GuildSchema><unknown>{ ...this.config.defaults.guild, guild: message.guildID };
            userSettings = <UserSchema><unknown>{ ...this.config.defaults.user, user: message.author.id };
          }
        } else {
          if (this.database.connection !== null) userSettings = await this.database.helpers.user.getUser(message.author);
          else userSettings = <UserSchema><unknown>{ ...this.config.defaults.user, user: message.author.id };

          guildSettings = <GuildSchema><unknown>this.config.defaults.guild;
        }
      } catch (e) {
        Logger.error('COMMAND HANDLER', e);
      }

      const prefixes = this.getPrefixes(true, false, guildSettings);
      const prefixRegex = new RegExp(`(${prefixes.join('|')})`);
      const prefix = message.content.match(prefixRegex) ? message.content.match(prefixRegex)![0] : null;

      const getPrefix = new RegExp(`^<@!?${this.user.id}>( |)$`);
      if (message.content.match(getPrefix)) {
        let i = 1;
        const embed = MessageUtils.defaultEmbed()
          .setDescription(stripIndents`My prefixes ${message.guildID ? 'in this guild' : ''} are:

          ${this.getPrefixes(false, true, guildSettings).map(p => `**${i++})** ${p}`).join('\n')}
        `);
        await (message.channel as GuildTextableChannel).createMessage({ embed });
        return;
      }

      if (!prefix) return;
      if (message.content.indexOf(prefix) !== 0) return;
      message.prefix = prefix;

      await this.commandHandler.handle(message, { guild: guildSettings, user: userSettings });
    } catch (e) {
      Logger.error('COMMAND LISTENER', e);
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async clean(text: any): Promise<any> {
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

  // TODO: We need to fix the usage below to properly fetch guild members. Or keep users in support roles in cache??
  async isSupport(user: User): Promise<boolean> {
    return this.cluster!.ipc.fetchGuild(this.system)
      .then(async (guild: any) => {
        const member: Member = guild.members[user.id] ?? await Util.getGuildMemberByID(<Guild>guild, user.id);
        if (member) return member.roles.some(r => this.config.supportRoles.includes(r));
        else return false;
      });
  }

  async isBooster(user: User): Promise<boolean> {
    return this.cluster!.ipc.fetchGuild(this.system)
      .then(async (guild: any) => {
        const member: Member = guild.members[user.id] ?? await Util.getGuildMemberByID(<Guild>guild, user.id);
        if (member) return member.roles.includes(this.config.boosterRole);
        else return false;
      });
  }

  async getBotInviter(guild: Guild): Promise<Member|{ id: string; }|undefined> {
    return guild.getAuditLogs(undefined, undefined, 28).then(logs => {
      return logs.entries.find(gal => gal.targetID === this.user.id)?.member as Member ?? undefined;
    });
  }
}
