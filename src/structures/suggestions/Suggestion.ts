import { Guild, Member, Message, MessageFile, User } from 'eris';
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
  private _author!: User;
  private _channel!: SuggestionChannel;
  private _guild!: Guild;
  private _id!: string;
  private _settings!: GuildSchema;
  private _message?: Message;
  private _suggestionMessage?: Message;
  private _suggestion?: string;
  private _data!: SuggestionSchema|Record<string, unknown>;
  private _type!: SuggestionType;

  constructor(public client: SuggestionsClient) {}

  public get postable(): boolean {
    return (
      !!this._channel &&
      !!this._message &&
      !!this._id
    );
  }

  public get data(): SuggestionSchema|Record<string, unknown> {
    return this._data;
  }

  public get link(): string|undefined {
    if (!this._suggestionMessage) return;
    return `https://discord.com/channels/${this._guild.id}/${this._channel.channel.id}/${this._suggestionMessage.id}`;
  }

  public get author(): User {
    return this._author;
  }

  public get guild(): Guild {
    return this._guild;
  }

  public get channel(): SuggestionChannel {
    return this._channel;
  }

  public get message(): Message|undefined {
    return this._suggestionMessage;
  }

  public get suggestion(): string|undefined {
    return this._suggestion;
  }

  public id(short: boolean = false): string {
    return short ? this._id.slice(33, 40) : this._id;
  }

  public setAuthor(user: User | Member): this {
    this._author = 'user' in user ? user.user : user;
    return this;
  }

  public setGuild(guild: Guild): this {
    this._guild = guild;
    return this;
  }

  public setChannel(channel: SuggestionChannel): this {
    this._channel = channel;
    return this;
  }

  public setSettings(settings: GuildSchema): this {
    this._settings = settings;
    return this;
  }

  public setMessage(message: Message): this {
    this._message = message;
    return this;
  }

  public setSuggestion(suggestion: string): this {
    this._suggestion = suggestion;
    return this;
  }

  public async setData(data: SuggestionSchema): Promise<this> {
    this._data = data;
    if (data.user) this._author = await this.client.getRESTUser(data.user);
    if (data.guild) this._guild = await this.client.getRESTGuild(data.guild);
    if (data.channel) this._channel = this.client.suggestionChannels.get(data.channel)!;
    if (data.suggestion) this._suggestion = data.suggestion;
    if (data.type) this._type = data.type;

    return new Promise(resolve => {
      resolve(this);
    });
  }

  public async post(): Promise<this> {
    if (!this._id) this._id = crypto.randomBytes(20).toString('hex');
    if (!this.postable) throw new Error('SuggestionNotPostable');
    const voteEmojis = [...emojis, ...this._settings.emojis];
    const setEmojis = voteEmojis[this._channel.emojis];
    const guild = setEmojis.system ? await this.client.base!.ipc.fetchGuild(this.client.system) : this._guild;
    const reactions = setEmojis.emojis.map(e => e && Util.matchUnicodeEmoji(e) ? e : guild.emojis.find(ge => ge.id === e));
    const embed = this._buildEmbed();

    // TODO dont forget to re-enable this when we implement (dm) responses
    // this._author.getDMChannel().then(c => c.createMessage({ embed: this._buildDMEmbed() }))

    let file: MessageFile|undefined;
    if (this._message && (this._message.attachments.length > 0)) {
      const attachment = this._message.attachments[0];
      const fileExtArray = attachment.filename.split('.');
      const fileExt = fileExtArray[fileExtArray.length - 1];
      if (['jpg', 'jpeg', 'png', 'gif', 'gifv'].includes(fileExt)) embed.setImage(attachment.url);
      else file = { file: await fetch(attachment.url).then(res => res.buffer()), name: attachment.filename };
    }

    this._suggestionMessage = await this._channel.channel.createMessage({ embed }, file);

    for (const react of reactions) {
      if (react) await this._suggestionMessage.addReaction(typeof react === 'string' ? react : Util.getReactionString(react));
    }

    this._data = await this._channel.suggestions.add(this);

    return this;
  }

  private _buildDMEmbed(): MessageEmbed {
    return MessageUtils.defaultEmbed()
      .setAuthor(this._guild.name, this._guild.iconURL)
      .setDescription(stripIndents`Hey, ${this._author.mention}. Your suggestion has been sent to the ${this._channel.channel.mention} to be voted on!
          
          Please wait until it get approved or rejected by a staff member.
          
          [[Jump to Suggestion]](${this.link!})
          
          Your suggestion ID (sID) for reference is **${this.id(true)}**
        `)
      .setFooter(`Guild ID: ${this._guild.id} | sID: ${this.id(true)}`)
      .setTimestamp();
  }

  private _buildEmbed(): MessageEmbed {
    const imageCheck = /(http(s?):)([/|.|\w|\s|-])*\.(?:jpg|gif|png)/.exec(this._suggestion!);

    const embed = MessageUtils.defaultEmbed()
      .setDescription(stripIndents`
          **Submitter**
          ${Util.escapeMarkdown(Util.formatUserTag(this._author))}
          **Suggestion**
          ${this._suggestion}
        `)
      .setThumbnail(this._author.avatarURL)
      .setFooter(`User ID: ${this._author.id} | sID: ${this.id(true)}`)
      .setTimestamp();

    if (imageCheck) embed.setImage(imageCheck[0]);
    return embed;
  }
}
