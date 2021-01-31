import { Collection } from '@augu/immutable';
import { User } from 'eris';

import { SuggestionChannelType, SuggestionSchema, SuggestionType } from '../types';
import SuggestionChannel from '../structures/suggestions/SuggestionChannel';
import Logger from '../utils/Logger';
import SuggestionsClient from '../structures/core/Client';
import Suggestion from '../structures/suggestions/Suggestion';
import Util from '../utils/Util';

export default class SuggestionManager {
  readonly #cache: Collection<Suggestion>;

  constructor(public channel: SuggestionChannel) {
    this.#cache = new Collection<Suggestion>();
  }

  public get cache(): Collection<Suggestion> {
    return this.#cache;
  }

  public get client(): SuggestionsClient {
    return this.channel.client;
  }

  public async add(suggestion: Suggestion, cache: boolean = true): Promise<SuggestionSchema> {
    const record: Record<string, unknown> = {
      user: suggestion.author.id,
      message: suggestion.message!.id,
      suggestion: suggestion.suggestion!,
      id: suggestion.id(),
      guild: suggestion.guild.id,
      channel: suggestion.channel.channel.id
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

  public async delete(suggestion: Suggestion|string, executor: User, reason?: string|boolean): Promise<boolean> {
    let data: Suggestion|undefined;
    if (suggestion instanceof Suggestion) data = suggestion;
    else data = await this.fetch(suggestion, false, true);

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

  public async fetch(query: string, cache: boolean = true, force: boolean = false): Promise<Suggestion|undefined> {
    if (query.length === 40) {
      if (!force) {
        const existing = this.#cache.get(query);
        if (existing) return existing;
      }

      const suggestion = await this.queryFromDatabase(query);
      if (cache) this.#cache.set(suggestion!.id(), suggestion!);
      return suggestion;
    }

    if (query.length === 7) {
      if (!force) {
        const existing = this.#cache.find(s => s.id(true) === query);
        if (existing) return existing;
      }

      const suggestion = await this.queryFromDatabase(query);
      if (cache) this.#cache.set(suggestion!.id(), suggestion!);
      return suggestion;
    }

    const snowflake = /^(\d{17,19})$/g;
    if (query.match(snowflake)) {
      if (!force) {
        const existing = this.#cache.find(s => s.data.message === query);
        if (existing) return existing;
      }

      const suggestion = await this.queryFromDatabase(query);
      if (cache) this.#cache.set(suggestion!.id(), suggestion!);
      return suggestion;
    }

    const re = /(https?:\/\/)?(www\.)?((canary|ptb)\.?|(discordapp|discord\.com)\/channels)\/(.+[[0-9])/g;
    if (query.match(re)) {
      const messageID = Util.getMessageIDFromLink(query);
      if (!force) {
        const existing = this.#cache.find(s => s.data.message === messageID);
        if (existing) return existing;
      }

      const suggestion = await this.queryFromDatabase(query);
      if (cache) this.#cache.set(suggestion!.id(), suggestion!);
      return suggestion;
    }

    return;
  }

  private queryFromDatabase(query: string): Promise<Suggestion|undefined> {
    return this.client.database.helpers.suggestion.getSuggestion(query);
  }
}
