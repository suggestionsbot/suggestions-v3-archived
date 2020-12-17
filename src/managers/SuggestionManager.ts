import { Collection } from '@augu/immutable';

import { SuggestionChannelType, SuggestionSchema, SuggestionType } from '../types';
import SuggestionChannel from '../structures/suggestions/SuggestionChannel';
import Logger from '../utils/Logger';
import SuggestionsClient from '../structures/core/Client';
import Suggestion from '../structures/suggestions/Suggestion';

export default class SuggestionManager {
  private readonly _cache: Collection<Suggestion>;

  constructor(public channel: SuggestionChannel) {
    this._cache = new Collection<Suggestion>();
  }

  public get cache(): Collection<Suggestion> {
    return this._cache;
  }

  public get client(): SuggestionsClient {
    return this.channel.client;
  }

  public async add(suggestion: Suggestion): Promise<SuggestionSchema> {
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

    const data = await this.channel.client.database.helpers.suggestion.createSuggestion(record);
    this._cache.set(suggestion.id(), suggestion);
    this.client.redis.instance!.incr(`guild:${data.guild}:member:${data.user}:suggestions:count`);
    this.client.redis.instance!.incr(`user:${data.user}:suggestions:count`);
    this.client.redis.instance!.incr(`guild:${data.guild}:suggestions:count`);
    this.client.redis.instance!.incr(`guild:${data.guild}:channel:${data.channel}:suggestions:count`);
    this.client.redis.instance!.incr('global:suggestions');

    Logger.log(`Created suggestion ${data.getSuggestionID(false)} in the database.`);

    if (this.channel.cooldown && !this.channel.cooldowns.has(data.user)) this.channel.updateCooldowns(data.user);
    return data;
  }

  public async delete(query: string): Promise<boolean> {
    const data = await this._queryFromDatabase(query);

    const deleted = await this.client.database.helpers.suggestion.deleteSuggestion(query);
    if (this._cache.has(data!.id())) this._cache.delete(data!.id());
    this.client.redis.instance!.decr(`guild:${data!.guild.id}:member:${data!.author.id}:suggestions:count`);
    this.client.redis.instance!.decr(`user:${data!.author.id}:suggestions:count`);
    this.client.redis.instance!.decr(`guild:${data!.guild.id}:suggestions:count`);
    this.client.redis.instance!.decr(`guild:${data!.guild.id}:channel:${data!.channel.channel.id}:suggestions:count`);
    this.client.redis.instance!.decr('global:suggestions');

    Logger.log(`Deleted suggestion ${data!.id(true)} from the database.`);

    return deleted;
  }

  public async fetch(query: string, cache: boolean = true, force: boolean = false): Promise<Suggestion|undefined|null> {
    if (query.length === 40) {
      const suggestion = force ? await this._queryFromDatabase(query) : this._cache.get(query) ??
          await this._queryFromDatabase(query);
      if (cache) this._cache.set(suggestion!.id(), suggestion!);

      return suggestion;
    }

    if (query.length === 7) {
      const suggestion = force ? await this._queryFromDatabase(query) :
        this._cache.find(s => s.id(true) === query) ?? await this._queryFromDatabase(query);
      if (cache) this._cache.set(suggestion!.id(), suggestion!);

      return suggestion;
    }

    const snowflake = /^(\d{17,19})$/g;
    if (query.match(snowflake)) {
      const suggestion = force ? await this._queryFromDatabase(query) : this._cache.get(query) ??
          await this._queryFromDatabase(query);
      if (cache) this._cache.set(suggestion!.id(), suggestion!);

      return suggestion;
    }

    const re = /(https?:\/\/)?(www\.)?((canary|ptb)\.?|(discordapp|discord\.com)\/channels)\/(.+[[0-9])/g;
    if (query.match(re)) {
      const matches = re.exec(query)!;
      const ids = matches[matches.length - 1].split('/');
      const messageID = ids[ids.length - 1];

      const suggestion = force ? await this._queryFromDatabase(query) :
        this._cache.find(s => s.message!.id === messageID) ?? await this._queryFromDatabase(query);
      if (cache) this._cache.set(suggestion!.id(), suggestion!);

      return suggestion;
    }

    return;
  }

  private _queryFromDatabase(query: string): Promise<Suggestion|null> {
    return this.client.database.helpers.suggestion.getSuggestion(this.channel.guild.id, query);
  }
}
