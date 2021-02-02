import { Emoji, Guild, Member, Message, MessageFile, User } from 'eris';
import fetch from 'node-fetch';
import * as crypto from 'crypto';
import { stripIndents } from 'common-tags';

import SuggestionsClient from '../core/Client';
import SuggestionChannel from './SuggestionChannel';
import { Edit, GuildSchema, Note, StatusUpdates, SuggestionSchema, SuggestionType } from '../../types';
import emojis from '../../utils/Emojis';
import Util from '../../utils/Util';
import MessageEmbed from '../../utils/MessageEmbed';
import MessageUtils from '../../utils/MessageUtils';

export default class Suggestion {
  #author!: User;
  #channel!: SuggestionChannel;
  #guild!: Guild;
  #id!: string;
  #settings!: GuildSchema;
  #message?: Message;
  #suggestionMessage?: Message;
  #suggestion!: string;
  #data!: SuggestionSchema;
  #type!: SuggestionType;
  #edits!: Array<Edit>;
  #notes!: Array<Note>;
  #statusUpdates!: Array<StatusUpdates>;

  constructor(public client: SuggestionsClient) {}

  get postable(): boolean {
    return (
      !!this.#channel &&
      !!this.#message &&
      !!this.#id
    );
  }

  get data(): SuggestionSchema {
    return this.#data;
  }

  get link(): string|undefined {
    if (!this.#suggestionMessage) return;
    else return `https://discord.com/channels/${this.#guild.id}/${this.#channel.channel.id}/${this.#suggestionMessage.id}`;
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

  get edits(): Array<Edit> {
    return this.#edits;
  }

  get notes(): Array<Note> {
    return this.#notes;
  }

  get statusUpdates(): Array<StatusUpdates> {
    return this.#statusUpdates;
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

  setMessage(message: Message): this {
    this.#message = message;
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
    const embed = this.buildEmbed();


    let file: MessageFile|undefined;
    if (this.#message && (this.#message.attachments.length > 0)) {
      const attachment = this.#message.attachments[0];
      const fileExtArray = attachment.filename.split('.');
      const fileExt = fileExtArray[fileExtArray.length - 1];
      if (['jpg', 'jpeg', 'png', 'gif', 'gifv'].includes(fileExt)) embed.setImage(attachment.url);
      else file = { file: await fetch(attachment.url).then(res => res.buffer()), name: attachment.filename };
    }

    this.#suggestionMessage = await this.#channel.channel.createMessage({ embed }, file);
    // TODO dont forget to re-enable this when we implement (dm) responses
    // this.#author.getDMChannel().then(c => c.createMessage({ embed: this.buildDMEmbed() }));

    for (const react of reactions) {
      if (react) await this.#suggestionMessage.addReaction(typeof react === 'string' ? react : Util.getReactionString(react));
    }

    this.#data = await this.#channel.suggestions.add(this);

    return this;
  }

  private buildDMEmbed(): MessageEmbed {
    return MessageUtils.defaultEmbed()
      .setAuthor(this.#guild.name, this.#guild.iconURL)
      .setDescription(stripIndents`Hey, ${this.#author.mention}. Your suggestion has been sent to the ${this.#channel.channel.mention} to be voted on!
          
          Please wait until it get approved or rejected by a staff member.
          
          *Jump to Suggestion* → [\`[${this.id(true)}]\`](${this.link!})
          
          Your suggestion ID (sID) for reference is **${this.id(true)}**
        `)
      .setFooter(`Guild ID: ${this.#guild.id} | sID: ${this.id(true)}`)
      .setTimestamp();
  }

  private buildEmbed(): MessageEmbed {
    const imageCheck = /(http(s?):)([/|.|\w|\s|-])*\.(?:jpg|gif|png)/.exec(this.#suggestion!);

    const embed = MessageUtils.defaultEmbed()
      .setDescription(stripIndents`
          **Submitter**
          ${Util.escapeMarkdown(this.#author.tag)}

          **Suggestion**
          ${this.#suggestion}
        `)
      .setThumbnail(this.#author.avatarURL)
      .setFooter(`User ID: ${this.#author.id} | sID: ${this.id(true)}`)
      .setTimestamp();

    if (imageCheck) embed.setImage(imageCheck[0]);
    return embed;
  }
}
