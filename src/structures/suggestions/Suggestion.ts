import { Emoji, Guild, Member, Message, MessageFile, User } from 'eris';
import fetch from 'node-fetch';
import * as crypto from 'crypto';

import SuggestionsClient from '../core/Client';
import SuggestionChannel from './SuggestionChannel';
import {
  Edit,
  GuildSchema,
  Note,
  StatusUpdates,
  SuggestionSchema, SuggestionState,
  SuggestionStateType,
  SuggestionType,
  UserSchema
} from '../../types';
import emojis from '../../utils/Emojis';
import Util from '../../utils/Util';
import SuggestionEmbeds from '../../utils/SuggestionEmbeds';
import Logger from '../../utils/Logger';

export default class Suggestion {
  #author!: User;
  #channel!: SuggestionChannel;
  #guild!: Guild;
  #id!: string;
  #settings!: GuildSchema;
  #profile!: UserSchema;
  #commandMessage?: Message;
  #suggestionMessage?: Message;
  #suggestion!: string;
  #data!: SuggestionSchema;
  #type!: SuggestionType;
  #state!: SuggestionStateType;
  #review!: boolean;
  #edits!: Array<Edit>;
  #notes!: Array<Note>;
  #statusUpdates!: Array<StatusUpdates>;

  constructor(public client: SuggestionsClient) {
    this.#state = 'PENDING';
    this.#review = false;
    this.#edits = [];
    this.#notes = [];
    this.#statusUpdates = [];
  }

  get postable(): boolean {
    return (
      !!this.#channel &&
      !!this.#commandMessage &&
      !!this.#id
    );
  }

  get data(): SuggestionSchema {
    return this.#data;
  }

  get link(): string {
    if (this.#suggestionMessage) return this.#suggestionMessage.jumpLink;
    return `https://discord.com/channels/${this.#guild.id}/${this.#channel.channel.id}/${this.#data.message}`;
  }

  get author(): User {
    return this.#author;
  }

  get guild(): Guild {
    return this.#guild;
  }

  get channel(): SuggestionChannel {
    return this.#channel;
  }

  get message(): Message|undefined {
    return this.#suggestionMessage;
  }

  get suggestion(): string|undefined {
    return this.#suggestion;
  }

  get type(): SuggestionType {
    return this.#type;
  }

  get state(): SuggestionStateType {
    return this.#state;
  }

  get review(): boolean {
    return this.#review;
  }

  get edits(): Array<Edit> {
    return this.#edits;
  }

  get notes(): Array<Note> {
    return this.#notes;
  }

  get statusUpdates(): Array<StatusUpdates> {
    return this.#statusUpdates;
  }

  get userProfile(): UserSchema {
    return this.#profile;
  }

  get guildSettings(): GuildSchema {
    return this.#settings;
  }

  id(short: boolean = false): string {
    return short ? this.#id.slice(33, 40) : this.#id;
  }

  setAuthor(user: User | Member): this {
    this.#author = 'user' in user ? user.user : user;
    return this;
  }

  setGuild(guild: Guild): this {
    this.#guild = guild;
    return this;
  }

  setChannel(channel: SuggestionChannel): this {
    this.#channel = channel;
    return this;
  }

  setSettings(settings: GuildSchema): this {
    this.#settings = settings;
    return this;
  }

  setProfile(profile: UserSchema): this {
    this.#profile = profile;
    return this;
  }

  setCommandMessage(message: Message): this {
    this.#commandMessage = message;
    return this;
  }

  setSuggestionMessage(message: Message): this {
    this.#suggestionMessage = message;
    return this;
  }

  setSuggestion(suggestion: string): this {
    this.#suggestion = suggestion;
    return this;
  }

  setType(type: SuggestionType): this {
    this.#type = type;
    return this;
  }

  setState(state: SuggestionState): void {
    if (state.type === this.#state) throw new Error('SameSuggestionState');

    switch (state.type) {
      case 'PENDING': {
        if (state.inReview) {
          //  handle logic to send suggestion to review channel

        } else {
          //  handle logic to send suggestion to its set channel
        }
        break;
      }
      case 'APPROVED': {
        if (state.inReview) {
          //  handle logic to send suggestion to review channel

        } else {
          //  handle logic to send suggestion to its set channel
        }
        break;
      }
      case 'REJECTED': {

        break;
      }
      case 'CONSIDERED': {

        break;
      }
      case 'IMPLEMENTED': {

        break;
      }
      default: {

        break;
      }
    }
  }

  async fetchMessage(): Promise<Message|undefined> {
    if (this.#suggestionMessage) return this.#suggestionMessage;
    const messageID = this.#data.message;
    const message = this.channel.channel.messages.get(messageID) ??
      await this.channel.channel.getMessage(messageID);
    if (message) {
      this.#suggestionMessage = message;
      return this.#suggestionMessage;
    } else return;
  }

  async setData(data: SuggestionSchema): Promise<this> {
    this.#data = data;
    if (data.id) this.#id = data.id;
    if (data.user) this.#author = await this.client.getRESTUser(data.user);
    if (data.guild) this.#guild = await this.client.getRESTGuild(data.guild);
    if (data.channel) this.#channel = <SuggestionChannel>await this.client.suggestionChannels.fetchChannel(this.#guild, data.channel)!;
    if (data.suggestion) this.#suggestion = data.suggestion;
    if (data.type) this.#type = data.type;
    if (data.state) this.#state = data.state;
    if (data.review) this.#review = data.review;
    if (data.message) await this.fetchMessage();
    if (data.edits) this.#edits = data.edits;
    if (data.notes) this.#notes = data.notes;
    if (data.statusUpdates) this.#statusUpdates = data.statusUpdates;

    return new Promise(resolve => {
      resolve(this);
    });
  }

  async post(): Promise<this> {
    if (!this.#id) this.#id = crypto.randomBytes(20).toString('hex');
    if (!this.postable) throw new Error('SuggestionNotPostable');
    const voteEmojis = [...emojis, ...this.#settings.emojis];
    const setEmojis = voteEmojis[this.#channel.emojis];
    const guild = setEmojis.system ? await this.client.base!.ipc.fetchGuild(this.client.system) : this.#guild;
    const reactions = setEmojis.emojis.map(e => e && Util.matchUnicodeEmoji(e) ? e : (<Array<Emoji>>guild.emojis).find(ge => ge.id === e));
    const allowNicknames = Util.userCanDisplayNickname({
      client: this.client,
      guild: this.#guild,
      settings: this.#settings,
      profile: this.#profile
    });

    const embed = SuggestionEmbeds.fullSuggestion({
      channel: this.#channel,
      guild: this.#guild,
      id: this.#id.slice(33, 40),
      suggestion: this.#suggestion,
      message: this.#commandMessage!,
      author: this.#author,
      nickname: allowNicknames
    });

    let file: MessageFile|undefined;
    if (this.#commandMessage && (this.#commandMessage.attachments.length > 0)) {
      const attachment = this.#commandMessage.attachments[0];
      const fileExtArray = attachment.filename.split('.');
      const fileExt = fileExtArray[fileExtArray.length - 1];
      if (['jpg', 'jpeg', 'png', 'gif', 'gifv'].includes(fileExt)) embed.setImage(attachment.url);
      else file = { file: await fetch(attachment.url).then(res => res.buffer()), name: attachment.filename };
    }

    this.#suggestionMessage = await this.#channel.channel.createMessage({ embed }, file);

    for (const react of reactions) {
      if (react) await this.#suggestionMessage.addReaction(typeof react === 'string' ? react : Util.getReactionString(react));
    }

    this.#data = await this.#channel.suggestions.add(this);

    return this;
  }

  async edit(executor: User, edit: string, reason?: string): Promise<this> {
    const newEdit = <Edit>{
      edit,
      editedBy: executor.id,
      reason: reason ? reason : undefined
    };

    this.#suggestion = edit;
    this.#edits.unshift(newEdit);
    const saved = await this.#data.save();
    await this.setData(saved);
    if (this.#channel.suggestions.cache.has(this.#id))
      this.#channel.suggestions.cache.set(this.#id, this);
    this.client.redis.instance!.incr(`suggestions:${this.#id}:edits:count`);

    const allowedNicknames = Util.userCanDisplayNickname({
      client: this.client,
      guild: this.guild,
      profile: this.userProfile,
      settings: this.guildSettings
    });

    const messageID = this.#data.message;
    const message = this.channel.channel.messages.get(messageID) ?? await this.channel.channel.getMessage(messageID);
    if (message) {
      if (!this.#suggestionMessage) this.setSuggestionMessage(message);
      const embed = SuggestionEmbeds.fullSuggestion({
        author: this.#author,
        channel: this.#channel,
        guild: this.#guild,
        id: this.#id.slice(33, 40),
        message,
        nickname: allowedNicknames,
        suggestion: edit
      });

      await message.edit({ embed });
    }

    Logger.log(`Edited suggestion ${this.#id.slice(33, 40)}.`);
    this.client.emit('suggestionEdit', this, executor, edit, reason);

    return new Promise(resolve => {
      resolve(this);
    });
  }
}
