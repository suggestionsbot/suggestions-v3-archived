import { Guild, User } from 'eris';
import { stripIndents } from 'common-tags';
import crypto from 'crypto';

import { GuildSchema, SuggestionSchema, SuggestionType } from '../types';
import CommandContext from './Context';
import MessageEmbed from '../utils/MessageEmbed';
import MessageUtils from '../utils/MessageUtils';
import SuggestionChannel from './SuggestionChannel';
import Util from '../utils/Util';
import emojis from '../utils/Emojis';
import SuggestionsClient from './Client';

export default class Suggestion {
  #_sender: User;
  #_channel: SuggestionChannel;
  readonly #_guild: Guild;
  readonly #_id: string;
  readonly #_suggestion: string;
  readonly #_settings: GuildSchema;
  readonly #_client: SuggestionsClient;

  constructor(
    ctx: CommandContext,
    suggestion: string,
    channel: SuggestionChannel,
  ) {
    this.#_client = ctx.client;
    this.#_guild = ctx.guild!;
    this.#_channel = channel;
    this.#_sender = ctx.sender;
    this.#_suggestion = suggestion;
    this.#_id = crypto.randomBytes(20).toString('hex');
    this.#_settings = ctx.settings!;

    this._postSuggestion();
  }

  public get id(): string|undefined {
    return this.#_id;
  }

  public get shortID(): string|undefined {
    return this.#_id.slice(33, 40);
  }

  private _createDMEmbed(): MessageEmbed {
    return MessageUtils.defaultEmbed()
      .setAuthor(this.#_guild.name, this.#_guild.iconURL)
      .setDescription(stripIndents`Hey, ${this.#_sender.mention}. Your suggestion has been sent to the ${this.#_channel.channel.mention} to be voted on!

      Please wait until it gets approved or rejected by a staff member.

      Your suggestion ID (sID) for reference is **${this.shortID}**.
      `)
      .setFooter(`Guild ID: ${this.#_guild!.id} | sID: ${this.shortID}`)
      .setTimestamp();
  }

  private _createEmbed(): MessageEmbed {
    const imageCheck = /(http(s?):)([/|.|\w|\s|-])*\.(?:jpg|gif|png)/.exec(this.#_suggestion);

    const embed = MessageUtils.defaultEmbed()
      .setDescription(stripIndents`
          **Submitter**
          ${Util.escapeMarkdown(Util.formatUserTag(this.#_sender))}

          **Suggestion**
          ${this.#_suggestion}
        `)
      .setThumbnail(this.#_sender.avatarURL)
      .setFooter(`User ID: ${this.#_sender.id} | sID: ${this.shortID}`)
      .setTimestamp();

    if (imageCheck) embed.setImage(imageCheck[0]);
    return embed;
  }

  private async _postSuggestion(): Promise<SuggestionSchema|void> {
    const voteEmojis = [...emojis, ...this.#_settings!.emojis];
    const setEmojis = voteEmojis[this.#_channel.emojis]!;
    const guild = setEmojis.system ? await this.#_client.base!.ipc.fetchGuild('737166408525283348') : this.#_guild!;
    const reactions = setEmojis.emojis.map(e => e && Util.matchUnicodeEmoji(e) ? e : guild.emojis.find(ge => ge.id === e));

    // TODO dont forget to re-enable this when we implement (dm) responses
    // this.#_sender.getDMChannel().then(c => c.createMessage({ embed: this._createDMEmbed() }));
    const msg = await this.#_channel.channel.createMessage({ embed: this._createEmbed() });

    for (const react of reactions) {
      if (react) await msg.addReaction(typeof react !== 'string' ? Util.getReactionString(react)! : react);
    }

    return this.#_channel.createSuggestion({
      user: this.#_sender.id,
      message: '',
      suggestion: this.#_suggestion,
      id: this.#_id,
      type: SuggestionType.REGULAR
    });
  }
}
