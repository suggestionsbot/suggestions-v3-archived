import { Client, ClientOptions, Emoji, Guild, GuildChannel, GuildTextableChannel, Member, Message, User } from 'eris';
import { promisify } from 'util';
import dotenv from 'dotenv';
dotenv.config();

import { Command, Event, BotConfig, SubCommand } from '../types';
import Collection from '@discordjs/collection';
import CoreLoaders from '../utils/core';
import config from '../config';
import { stripIndents } from 'common-tags';
import CommandHandler from '../handlers/CommandHandler';
import MongoDB from '../provider/mongodb';

export default class SuggestionsClient extends Client {
  private _core: CoreLoaders;
  public readonly production: boolean;
  public commands: Collection<string, Command>;
  public aliases: Collection<string, string>;
  public subCommands: Collection<string, SubCommand>;
  public subCommandAliases: Collection<string, string>;
  public events: Collection<string, Event>;
  public config: BotConfig;
  public commandHandler: CommandHandler;
  public wait: any;
  public database: MongoDB;

  constructor(public token: string, options?: ClientOptions) {
    super(token, options);

    this.commands = new Collection();
    this.subCommands = new Collection();
    this.aliases = new Collection();
    this.subCommandAliases = new Collection();
    this.events = new Collection();

    this._core = new CoreLoaders(this);
    this.database = new MongoDB(this);
    this.production = (/true/i).test(process.env.NODE_ENV);
    this.config = config;
    this.commandHandler = new CommandHandler(this);
    this.wait = promisify(setTimeout);
  }

  public start(): void {
    this._core.loadCommands();
    this._core.loadListeners();
    this._addEventListeners();
    super.connect();
  }

  public getPrefixes(regex = false): ReadonlyArray<string> {
    const prefixes: Array<string> = [
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
    const help = this.commands.get('help');

    if (this.production) {
      this.editStatus('online', {
        name: `your suggestions | ${prefix + help}`,
        type: 2
      });
    } else {
      this.editStatus('dnd', {
        name: 'in code land...',
        type: 0
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

  public isStaff(member: Member): boolean {
    let staffCheck: boolean;
    const adminCheck = this.isAdmin(member) || this.isOwner(member);
    const staffRoles = member.guild.settings.staffRoles;
    if (staffRoles) staffCheck = member.roles.some(r => staffRoles.map(s => s.id).includes(r)) || adminCheck;
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

  private _addEventListeners(): void {
    this.on('messageCreate', this._runMessageOperator);
  }

  private _runMessageOperator(message: Message): void {
    this._commandListener(message);
  }

  private _commandListener(message: Message): void {
    try {
      const prefixes = this.getPrefixes(true);

      if (message.author.bot) return;
      if ((message.channel instanceof GuildChannel) && !message.channel.permissionsOf(this.user.id).has('sendMessages')) return;

      if (this.config.prefixes.length === 0)
        new Error('The array of prefixes cannot be empty!');

      const prefixRegex = new RegExp(`(${prefixes.join('|')})`);
      const prefix = message.content.match(prefixRegex) ? message.content.match(prefixRegex)[0] : null;

      const getPrefix = new RegExp(`^<@!?${this.user.id}>( |)$`);
      if (message.content.match(getPrefix)) {
        let i = 1;
        (message.channel as GuildTextableChannel).createMessage({ embed: {
          description: stripIndents`My prefixes in this guild are:

            ${this.getPrefixes().map(p => `**${i++})** ${p}`).join('\n')}`,
          color: this.config.colors.main
        }}
        );
        return;
      }

      if (!prefix) return;
      if (message.content.indexOf(prefix) !== 0) return;
      message.prefix = prefix;

      this.commandHandler.handle(message);
    } catch (e) {
      console.error(e.stack);
    }
  }
}
