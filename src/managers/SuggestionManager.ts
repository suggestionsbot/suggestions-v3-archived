import { Collection } from '@augu/immutable';

import { SuggestionChannelType, SuggestionSchema, SuggestionType } from '../types';
import SuggestionChannel from '../structures/SuggestionChannel';
import Logger from '../utils/Logger';
import SuggestionsClient from '../structures/Client';

export default class SuggestionManager {
  private readonly _cache: Collection<SuggestionSchema>;

  constructor(public channel: SuggestionChannel) {
    this._cache = new Collection<SuggestionSchema>();
  }

  public get cache(): Collection<SuggestionSchema> {
    return this._cache;
  }

  public get client(): SuggestionsClient {
    return this.channel.client;
  }

  public async add(suggestion: Record<string, unknown>): Promise<SuggestionSchema|void> {
    suggestion.guild = this.channel.guild.id;
    suggestion.channel = this.channel.channel.id;
    if (this.channel.type === SuggestionChannelType.SUGGESTIONS) suggestion.type = SuggestionType.REGULAR;
    if (this.channel.type === SuggestionChannelType.STAFF) suggestion.type = SuggestionType.STAFF;

    const data = await this.channel.client.database.helpers.suggestion.createSuggestion(suggestion);
    this._cache.set(data.id, data);
    this.client.redis.instance!.incr(`guild:${data.guild}:member:${data.user}:suggestions:count`);
    this.client.redis.instance!.incr(`user:${data.user}:suggestions:count`);
    this.client.redis.instance!.incr(`guild:${data.guild}:suggestions:count`);
    this.client.redis.instance!.incr(`guild:${data.guild}:channel:${data.channel}:suggestions:count`);
    this.client.redis.instance!.incr('global:suggestions');

    Logger.log(`Created suggestion ${data.getSuggestionID(false)} in the database...`);

    if (this.channel.cooldown && !this.channel.cooldowns.has(data.user)) this.channel.updateCooldowns(data.user);
    return data;
  }

  public async delete(query: string): Promise<boolean> {
    const data = await this._queryFromDatabase(query);
    if (!data) return false;

    const deleted = await this.client.database.helpers.suggestion.deleteSuggestion(query);
    if (!deleted) return false;
    this._cache.delete(data.id);
    this.client.redis.instance!.decr(`guild:${data.guild}:member:${data.user}:suggestions:count`);
    this.client.redis.instance!.decr(`user:${data.user}:suggestions:count`);
    this.client.redis.instance!.decr(`guild:${data.guild}:suggestions:count`);
    this.client.redis.instance!.decr(`guild:${data.guild}:channel:${data.channel}:suggestions:count`);
    this.client.redis.instance!.decr('global:suggestions');

    Logger.log(`Deleted suggestion ${data.getSuggestionID(false)} from the database.`);

    return deleted;
  }

  public async fetch(query: string, cache: boolean = true, force: boolean = false): Promise<SuggestionSchema|undefined|null> {
    if (query.length === 40) {
      const suggestion = force ? await this._queryFromDatabase(query) : this._cache.get(query) ??
          await this._queryFromDatabase(query);
      if (!suggestion) throw new Error('SuggestionNotFound');
      if (cache) this._cache.set(suggestion.id, suggestion);

      return suggestion;
    }

    if (query.length === 7) {
      const suggestion = force ? await this._queryFromDatabase(query) :
        this._cache.find(s => s.id.slice(33, 40) === query) ?? await this._queryFromDatabase(query);
      if (!suggestion) throw new Error('SuggestionNotFound');
      if (cache) this._cache.set(suggestion.id, suggestion);

      return suggestion;
    }

    const snowflake = /^(\d{17,19})$/g;
    if (query.match(snowflake)) {
      const suggestion = force ? await this._queryFromDatabase(query) : this._cache.get(query) ??
          await this._queryFromDatabase(query);
      if (!suggestion) throw new Error('SuggestionNotFound');
      if (cache) this._cache.set(suggestion.id, suggestion);

      return suggestion;
    }

    const re = /(https?:\/\/)?(www\.)?((canary|ptb)\.?|(discordapp|discord\.com)\/channels)\/(.+[[0-9])/g;
    if (query.match(re)) {
      const matches = re.exec(query)!;
      const ids = matches[matches.length - 1].split('/');
      const messageID = ids[ids.length - 1];

      const suggestion = force ? await this._queryFromDatabase(query) :
        this._cache.find(s => s.message === messageID) ?? await this._queryFromDatabase(query);
      if (!suggestion) throw new Error('SuggestionNotFound');
      if (cache) this._cache.set(suggestion.id, suggestion);

      return suggestion;
    }

    return;
  }

  private _queryFromDatabase(query: string): Promise<SuggestionSchema|null> {
    return this.client.database.helpers.suggestion.getSuggestion(this.channel.guild.id, query);
  }
}
