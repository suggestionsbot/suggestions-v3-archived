import { Emoji, Guild, Member, Message, MessageFile, User } from 'eris';
import fetch from 'node-fetch';
import * as crypto from 'crypto';
import { stripIndents } from 'common-tags';

import SuggestionsClient from '../core/Client';
import SuggestionChannel from './SuggestionChannel';
import { GuildSchema, SuggestionSchema, SuggestionType } from '../../types';
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
  #data!: SuggestionSchema|Record<string, unknown>;
  #type!: SuggestionType;

  constructor(public client: SuggestionsClient) {}

  public get postable(): boolean {
    return (
      !!this.#channel &&
      !!this.#message &&
      !!this.#id
    );
  }

  public get data(): SuggestionSchema|Record<string, unknown> {
    return this.#data;
  }

  public get link(): string|undefined {
    if (!this.#suggestionMessage) return;
    else return `https://discord.com/channels/${this.#guild.id}/${this.#channel.channel.id}/${this.#suggestionMessage.id}`;
  }

  public get author(): User {
    return this.#author;
  }

  public get guild(): Guild {
    return this.#guild;
  }

  public get channel(): SuggestionChannel {
    return this.#channel;
  }

  public get message(): Message|undefined {
    return this.#suggestionMessage;
  }

  public get suggestion(): string|undefined {
    return this.#suggestion;
  }

  public get type(): SuggestionType {
    return this.#type;
  }

  public id(short: boolean = false): string {
    return short ? this.#id.slice(33, 40) : this.#id;
  }

  public setAuthor(user: User | Member): this {
    this.#author = 'user' in user ? user.user : user;
    return this;
  }

  public setGuild(guild: Guild): this {
    this.#guild = guild;
    return this;
  }

  public setChannel(channel: SuggestionChannel): this {
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

  public setSuggestion(suggestion: string): this {
    this.#suggestion = suggestion;
    return this;
  }

  public setType(type: SuggestionType): this {
    this.#type = type;
    return this;
  }

  public async setData(data: SuggestionSchema): Promise<this> {
    this.#data = data;
    if (data.user) this.#author = await this.client.getRESTUser(data.user);
    if (data.guild) this.#guild = await this.client.getRESTGuild(data.guild);
    if (data.channel) this.#channel = <SuggestionChannel>this.client.suggestionChannels.get(data.channel)!;
    if (data.suggestion) this.#suggestion = data.suggestion;
    if (data.type) this.#type = data.type;

    return new Promise(resolve => {
      resolve(this);
    });
  }

  public async post(): Promise<this> {
    if (!this.#id) this.#id = crypto.randomBytes(20).toString('hex');
    if (!this.postable) throw new Error('SuggestionNotPostable');
    const voteEmojis = [...emojis, ...this.#settings.emojis];
    const setEmojis = voteEmojis[this.#channel.emojis];
    const guild = setEmojis.system ? await this.client.base!.ipc.fetchGuild(this.client.system) : this.#guild;
    const reactions = setEmojis.emojis.map(e => e && Util.matchUnicodeEmoji(e) ? e : (<Array<Emoji>>guild.emojis).find(ge => ge.id === e));
    const embed = this.buildEmbed();

    // TODO dont forget to re-enable this when we implement (dm) responses
    // this.#author.getDMChannel().then(c => c.createMessage({ embed: this.buildDMEmbed() }))

    let file: MessageFile|undefined;
    if (this.#message && (this.#message.attachments.length > 0)) {
      const attachment = this.#message.attachments[0];
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

  private buildDMEmbed(): MessageEmbed {
    return MessageUtils.defaultEmbed()
      .setAuthor(this.#guild.name, this.#guild.iconURL)
      .setDescription(stripIndents`Hey, ${this.#author.mention}. Your suggestion has been sent to the ${this.#channel.channel.mention} to be voted on!
          
          Please wait until it get approved or rejected by a staff member.
          
          [[Jump to Suggestion]](${this.link!})
          
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
