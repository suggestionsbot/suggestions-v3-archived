import { Collection } from '@augu/immutable';
import { Message, User } from 'eris';
import { stripIndents } from 'common-tags';

import { Edit, SuggestionChannelType, SuggestionSchema, SuggestionType } from '../types';
import SuggestionChannel from '../structures/suggestions/SuggestionChannel';
import Logger from '../utils/Logger';
import SuggestionsClient from '../structures/core/Client';
import Suggestion from '../structures/suggestions/Suggestion';
import Util from '../utils/Util';
import SuggestionEmbeds from '../utils/SuggestionEmbeds';

export default class SuggestionManager {
  readonly #cache: Collection<Suggestion>;

  constructor(public channel: SuggestionChannel) {
    this.#cache = new Collection<Suggestion>();
  }

  get cache(): Collection<Suggestion> {
    return this.#cache;
  }

  get client(): SuggestionsClient {
    return this.channel.client;
  }

  async add(suggestion: Suggestion, cache: boolean = true): Promise<SuggestionSchema> {
    const record: Record<string, unknown> = {
      user: suggestion.author.id,
      message: suggestion.message!.id,
      suggestion: suggestion.suggestion!,
      id: suggestion.id(),
      guild: suggestion.guild.id,
      channel: suggestion.channel.channel.id,
      edits: [{
        edit: suggestion.suggestion!,
        editedBy: suggestion.author.id
      }]
    };

    if (this.channel.type === SuggestionChannelType.SUGGESTIONS) record.type = SuggestionType.REGULAR;
    if (this.channel.type === SuggestionChannelType.STAFF) record.type = SuggestionType.STAFF;

    const data = await this.client.database.helpers.suggestion.createSuggestion(record);
    if (cache) this.#cache.set(suggestion.id(), suggestion);
    this.channel.updateCount('incr');
    this.client.redis.instance!.incr(`guild:${data.guild}:member:${data.user}:suggestions:count`);
    this.client.redis.instance!.incr(`user:${data.user}:suggestions:count`);
    this.client.redis.instance!.incr(`guild:${data.guild}:suggestions:count`);
    this.client.redis.instance!.incr(`guild:${data.guild}:channel:${data.channel}:suggestions:count`);
    this.client.redis.instance!.incr('global:suggestions');

    Logger.log(`Created suggestion ${suggestion.id(true)} in the database.`);
    this.client.emit('suggestionCreate', suggestion);

    if (this.channel.cooldown && !this.channel.cooldowns.has(data.user)) this.channel.updateCooldowns(data.user);
    return data;
  }

  async delete(suggestion: Suggestion|string, executor: User, reason?: string): Promise<boolean> {
    let data: Suggestion|undefined;
    if (suggestion instanceof Suggestion) data = suggestion;
    else data = <Suggestion>await this.fetch(suggestion, false, true);

    // TODO: Make sure we account for *any* messages related to the suggestion when deleting
    const messageID = data!.data.message;
    const message = this.channel.channel.messages.get(messageID) ?? await this.channel.channel.getMessage(messageID);
    if (message) await message.delete();
    const deleted = await this.client.database.helpers.suggestion.deleteSuggestion(data!.id());
    if (this.#cache.has(data!.id())) this.#cache.delete(data!.id());
    this.channel.updateCount('decr');
    this.client.redis.instance!.decr(`guild:${data!.guild.id}:member:${data!.author.id}:suggestions:count`);
    this.client.redis.instance!.decr(`user:${data!.author.id}:suggestions:count`);
    this.client.redis.instance!.decr(`guild:${data!.guild.id}:suggestions:count`);
    this.client.redis.instance!.decr(`guild:${data!.guild.id}:channel:${data!.channel.channel.id}:suggestions:count`);
    this.client.redis.instance!.decr('global:suggestions');

    Logger.log(`Deleted suggestion ${data!.id(true)} from the database.`);
    this.client.emit('suggestionDelete', suggestion, executor, reason);

    return deleted;
  }

  async edit(query: Suggestion|string, executor: User, ctxMessage: Message, edit: string, reason?: string): Promise<Suggestion|undefined> {
    const data = query instanceof Suggestion
      ? <SuggestionSchema>await this.queryFromDatabase(query.id(), true)
      : <SuggestionSchema>await this.fetch(query, false, true, true);

    const newEdit = <Edit>{
      edit,
      editedBy: executor.id,
      reason: reason ? reason : undefined
    };

    data!.suggestion = edit;
    data!.edits.unshift(newEdit);
    const saved = await data!.save();
    const suggestion = await new Suggestion(this.client).setData(saved);
    if (this.#cache.has(suggestion!.data.id)) this.#cache.set(suggestion!.id(), suggestion!);
    this.client.redis.instance!.incr(`suggestions:${suggestion!.id}:edits:count`);

    const allowedNicknames = Util.userCanDisplayNickname({
      client: this.client,
      guild: suggestion.guild,
      profile: suggestion.userProfile,
      settings: suggestion.guildSettings
    });

    const messageID = suggestion.data.message;
    const message = this.channel.channel.messages.get(messageID) ?? await this.channel.channel.getMessage(messageID);
    if (message) {
      if (!suggestion.message) suggestion.setSuggestionMessage(message);
      const embed = SuggestionEmbeds.fullSuggestion({
        author: suggestion.author,
        channel: suggestion.channel,
        guild: suggestion.guild,
        id: suggestion.id(true),
        message: ctxMessage,
        nickname: allowedNicknames,
        suggestion: edit
      });

      await message.edit({ embed });
    }

    Logger.log(`Edited suggestion ${suggestion!.id(true)}.`);
    this.client.emit('suggestionEdit', suggestion, executor, edit, reason);

    return suggestion;
  }

  async fetch(query: string, cache: boolean = true, force: boolean = false, raw?: boolean): Promise<Suggestion|SuggestionSchema|undefined> {
    if (query.length === 40) {
      if (raw) return this.queryFromDatabase(query, raw);

      if (!force) {
        const existing = this.#cache.get(query);
        if (existing) return existing;
      }

      const suggestion = <Suggestion>await this.queryFromDatabase(query);
      if (cache) this.#cache.set(suggestion!.id(), suggestion!);
      return suggestion;
    }

    if (query.length === 7) {
      if (raw) return this.queryFromDatabase(query, raw);

      if (!force) {
        const existing = this.#cache.find(s => s.id(true) === query);
        if (existing) return existing;
      }

      const suggestion = <Suggestion>await this.queryFromDatabase(query);
      if (cache) this.#cache.set(suggestion!.id(), suggestion!);
      return suggestion;
    }

    const snowflake = /^(\d{17,19})$/g;
    if (query.match(snowflake)) {
      if (raw) return this.queryFromDatabase(query, raw);

      if (!force) {
        const existing = this.#cache.find(s => s.data.message === query);
        if (existing) return existing;
      }

      const suggestion = <Suggestion>await this.queryFromDatabase(query);
      if (cache) this.#cache.set(suggestion!.id(), suggestion!);
      return suggestion;
    }

    const re = /(https?:\/\/)?(www\.)?((canary|ptb)\.?|(discordapp|discord\.com)\/channels)\/(.+[[0-9])/g;
    if (query.match(re)) {
      const messageID = Util.getMessageIDFromLink(query);
      if (raw) return this.queryFromDatabase(messageID, raw);

      if (!force) {
        const existing = this.#cache.find(s => s.data.message === messageID);
        if (existing) return existing;
      }

      const suggestion = <Suggestion>await this.queryFromDatabase(query);
      if (cache) this.#cache.set(suggestion!.id(), suggestion!);
      return suggestion;
    }

    return;
  }

  private queryFromDatabase(query: string, raw?: boolean): Promise<Suggestion|SuggestionSchema|undefined> {
    return this.client.database.helpers.suggestion.getSuggestion(query, raw);
  }
}
