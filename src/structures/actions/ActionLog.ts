import { Guild, Member, Message, User } from 'eris';
import * as crypto from 'crypto';

import SuggestionsClient from '../core/Client';
import ActionLogChannel from './ActionLogChannel';
import { GuildSchema, ActionLogSchema, ActionLogTypes, ActionLogChange } from '../../types';
import MessageEmbed from '../../utils/MessageEmbed';
import MessageUtils from '../../utils/MessageUtils';
import Util from '../../utils/Util';

/**
 * What we need for a actionlog:
 *
 * - The client
 * - The channel of the actionlog
 * - The guild of the actionlog
 * - The guild's settings
 * - The message associated with the actionlog (only relevant when posting actionlog)
 * - The executor tied to the actionlog (ex. the user who approved a suggestion)
 * - The target tied to the actionlog (ex. the user who submitted the suggestion that was approved)
 * - The data that will be saved to the database (or even loaded from it to create the class)
 * - Type of actionlog
 *
 * Data that we need to pass in:
 * - The suggestion channel, suggestion comment data, etc (dictionary object?)
 */

export default class ActionLog {
  #executor!: User;
  #target?: User;
  #channel!: ActionLogChannel;
  #guild!: Guild;
  #id!: string;
  #settings!: GuildSchema;
  #message?: Message;
  #data!: ActionLogSchema;
  #type!: ActionLogTypes;
  #embedData?: Record<string, any>;
  #changes: Array<ActionLogChange>;

  constructor(public client: SuggestionsClient) {
    this.#changes = [];
  }

  get postable(): boolean {
    return (
      !!this.#channel &&
      !!this.#id
    );
  }

  get data(): ActionLogSchema {
    return this.#data;
  }

  get link(): string|undefined {
    if (!this.#message) return;
    else return `https://discord.com/channels/${this.#guild.id}/${this.#channel.id}/${this.#message.id}`;
  }

  get executor(): User {
    return this.#executor;
  }

  get target(): User|undefined {
    return this.#target;
  }

  get guild(): Guild {
    return this.#guild;
  }

  get channel(): ActionLogChannel {
    return this.#channel;
  }

  get message(): Message|undefined {
    return this.#message;
  }

  get type(): ActionLogTypes {
    return this.#type;
  }

  get changes(): Array<ActionLogChange> {
    return this.#changes;
  }

  id(short: boolean = false): string {
    return short ? this.#id.slice(33, 40) : this.#id;
  }

  setExecutor(executor: User | Member): this {
    this.#executor = 'user' in executor ? executor.user : executor;
    return this;
  }

  setTarget(target: User | Member): this {
    this.#target = 'user' in target ? target.user : target;
    return this;
  }

  setGuild(guild: Guild): this {
    this.#guild = guild;
    return this;
  }

  setChannel(channel: ActionLogChannel): this {
    this.#channel = channel;
    return this;
  }

  setSettings(settings: GuildSchema): this {
    this.#settings = settings;
    return this;
  }

  setMessage(message: Message): this {
    this.#message = message;
    return this;
  }

  setType(type: ActionLogTypes): this {
    this.#type = type;
    return this;
  }

  setEmbedData(data: Record<string, any>): this {
    this.#embedData = data;
    return this;
  }

  setChanges(changes: Array<ActionLogChange>): this {
    this.#changes = changes;
    return this;
  }

  async setData(data: ActionLogSchema): Promise<this> {
    this.#data = data;
    if (data.id) this.#id = data.id;
    if (data.executor) this.#executor = await this.client.getRESTUser(data.executor);
    if (data.target) this.#target = await this.client.getRESTUser(data.target);
    if (data.guild) this.#guild = await this.client.getRESTGuild(data.guild);
    if (data.channel) this.#channel = <ActionLogChannel>this.client.suggestionChannels.get(data.channel);
    if (data.type) this.#type = data.type;
    if (data.changes) this.#changes = data.changes;

    return new Promise(resolve => {
      resolve(this);
    });
  }

  async post(): Promise<this> {
    if (!this.#id) this.#id = crypto.randomBytes(20).toString('hex');
    if (!this.postable) throw new Error('ModLogNotPostable');

    this.#message = await this.#channel.channel.createMessage({ embed: this.#embedData });
    this.#data = await this.#channel.actionlogs.add(this);

    return this;
  }
}
