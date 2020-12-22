import { Guild, Member, Message, User } from 'eris';

import SuggestionsClient from '../core/Client';
import ModLogChannel from './ModLogChannel';
import { GuildSchema, ModLogSchema, ModLogTypes } from '../../types';
import * as crypto from 'crypto';
import MessageEmbed from '../../utils/MessageEmbed';
import MessageUtils from '../../utils/MessageUtils';
import Util from '../../utils/Util';

/**
 * What we need for a modlog:
 *
 * - The client
 * - The channel of the modlog
 * - The guld of the modlog
 * - The guild's settings
 * - The message associated with the mod log (only relevant when posting modlog)
 * - The user tied to the modlog
 * - The moderator tied to the modlog
 * - The data that will be saved to the database (or even loaded from it to create the class)
 * - Type of modlog action
 *
 * Data that we need to pass in:
 * - The suggestion channel, suggestion comment data, etc (dictionary object?)
 */

export default class ModLog {
  #user!: User;
  #moderator!: User;
  #channel!: ModLogChannel;
  #guild!: Guild;
  #id!: string;
  #settings!: GuildSchema;
  #message?: Message;
  #data!: ModLogSchema|Record<string, unknown>;
  #type!: ModLogTypes;
  #embedData?: Record<string, any>;

  constructor(public client: SuggestionsClient) {}

  public get postable(): boolean {
    return (
      !!this.#channel &&
      !!this.#id
    );
  }

  public get data(): ModLogSchema|Record<string, unknown> {
    return this.#data;
  }

  public get link(): string|undefined {
    if (!this.#message) return;
    else return `https://discord.com/channels/${this.#guild.id}/${this.#channel.id}/${this.#message.id}`;
  }

  public get user(): User {
    return this.#user;
  }

  public get moderator(): User {
    return this.#moderator;
  }

  public get guild(): Guild {
    return this.#guild;
  }

  public get channel(): ModLogChannel {
    return this.#channel;
  }

  public get message(): Message|undefined {
    return this.#message;
  }

  public get type(): ModLogTypes {
    return this.#type;
  }

  public id(short: boolean = false): string {
    return short ? this.#id.slice(33, 40) : this.#id;
  }

  public setUser(user: User | Member): this {
    this.#user = 'user' in user ? user.user : user;
    return this;
  }

  public setModerator(moderator: User | Member): this {
    this.#moderator = 'user' in moderator ? moderator.user : moderator;
    return this;
  }

  public setGuild(guild: Guild): this {
    this.#guild = guild;
    return this;
  }

  public setChannel(channel: ModLogChannel): this {
    this.#channel = channel;
    return this;
  }

  public setSettings(settings: GuildSchema): this {
    this.#settings = settings;
    return this;
  }

  public setMessage(message: Message): this {
    this.#message = message;
    return this;
  }

  public setType(type: ModLogTypes): this {
    this.#type = type;
    return this;
  }

  public setEmbedData(data: Record<string, any>): this {
    this.#embedData = data;
    return this;
  }

  public async setData(data: ModLogSchema): Promise<this> {
    this.#data = data;
    if (data.user) this.#user = await this.client.getRESTUser(data.user);
    if (data.moderator) this.#moderator = await this.client.getRESTUser(data.moderator);
    if (data.guild) this.#guild = await this.client.getRESTGuild(data.guild);
    if (data.channel) this.#channel = <ModLogChannel>this.client.suggestionChannels.get(data.channel);
    if (data.type) this.#type = data.type;

    return new Promise(resolve => {
      resolve(this);
    });
  }

  public async post(): Promise<this> {
    if (!this.#id) this.#id = crypto.randomBytes(20).toString('hex');
    if (!this.postable) throw new Error('ModLogNotPostable');
    const embed = this.buildEmbed();

    this.#message = await this.#channel.channel.createMessage({ embed });
    this.#data = await this.#channel.modlogs.add(this);

    return this;
  }

  private buildEmbed(): MessageEmbed {
    return MessageUtils.defaultEmbed()
      .setAuthor(`Suggestion Created | ${Util.formatUserTag(this.#user)}`, this.#user.avatarURL)
      .addField('Channel', `<#${this.#embedData?.channel}>`, true)
      .addField('Author', `<@${this.#embedData?.author}>`, true)
      .addField('Suggestion ID', this.#embedData?.suggestion, true)
      .setFooter(`User ID: ${this.#embedData?.author}`)
      .setTimestamp();
  }
}
