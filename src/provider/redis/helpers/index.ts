import SuggestionsClient from '../../../structures/Client';
import {
  BlacklistSchema,
  GuildSchema,
  Promisified, ShardStats,
  SuggestionGuild,
  SuggestionSchema,
  SuggestionUser
} from '../../../types';
import Util from '../../../utils/Util';
import Logger from '../../../utils/Logger';

export default class RedisHelpers {
  private _redis: Promisified;

  constructor(public client: SuggestionsClient, public redis: Promisified) {
    this.client = client;
    this._redis = redis;
  }

  private static _formSuggestionKey(id: string, message: string): string {
    return `suggestion:${id}:${message}`;
  }

  private static _formGuildKey(guild: SuggestionGuild): string {
    return `guild:${Util.getGuildID(guild)}:settings`;
  }

  private static _formGuildBlacklistKey(user: SuggestionUser, guild: SuggestionGuild): string {
    if (guild) return `blacklist:${Util.getGuildID(guild)}:${Util.getUserID(user)}`;
    else `blacklist:${Util.getUserID(user)}`;
  }

  public async getGlobalSuggestionCount(): Promise<number> {
    return this._redis.get('global:suggestions:count').then((count: any) => +count);
  }

  public async getGuildSuggestionCount(guild: SuggestionGuild): Promise<number> {
    return this._redis.get(`guild:${Util.getGuildID(guild)}:suggestions:count`).then((count: any) => +count);
  }

  public async getGlobalCommandCount(): Promise<number> {
    return this._redis.get('global:commands:count').then((count: any) => +count);
  }

  public async getGuildCommandCount(guild: SuggestionGuild): Promise<number> {
    return this._redis.get(`guild:${Util.getGuildID(guild)}:commands:count`).then((count: any) => +count);
  }

  public async getGlobalBlacklistCount(): Promise<number> {
    return this._redis.get('global:blacklists:count').then((count: any) => +count);
  }

  public async getGuildBlacklistCount(guild: SuggestionGuild): Promise<number> {
    return this._redis.get(`guild:${Util.getGuildID(guild)}:blacklists:count`).then((count: any) => +count);
  }

  public async getStats(): Promise<ShardStats> {
    const data: any = await this._redis.hgetall('shardstats');
    const field = Object.keys(data).sort((a, b) => +a - +b)[0];
    return JSON.parse(data[field]);
  }

  public updateStats(data: ShardStats): Promise<boolean> {
    return this._redis.hset('shardstats', Date.now().toString(), JSON.stringify(data));
  }

  public getCachedGuild(guild: SuggestionGuild): Promise<GuildSchema> {
    return this._redis.get(RedisHelpers._formGuildKey(guild))
      .then((data: any) => JSON.parse(data));
  }

  public getCachedBlacklist(user: SuggestionUser, guild: SuggestionGuild = null): Promise<BlacklistSchema> {
    return this.redis.get(RedisHelpers._formGuildBlacklistKey(user, guild))
      .then((data: any) => JSON.parse(data));
  }

  public setCachedBlacklist(user: SuggestionUser, data: BlacklistSchema, guild: SuggestionGuild = null): Promise<boolean> {
    return this._redis.set(RedisHelpers._formGuildBlacklistKey(user, guild), JSON.stringify(data));
  }

  public clearCachedBlacklist(user: SuggestionUser, guild: SuggestionGuild): Promise<boolean> {
    return this._redis.del(RedisHelpers._formGuildBlacklistKey(user, guild));
  }

  public setCachedGuild(guild: SuggestionGuild, data: GuildSchema): Promise<boolean> {
    return this._redis.set(RedisHelpers._formGuildKey(guild), JSON.stringify(data));
  }

  public clearCachedGuild(guild: SuggestionGuild): Promise<boolean> {
    return this._redis.del(RedisHelpers._formGuildKey(guild));
  }

  public clearCachedData(guild: SuggestionGuild): Promise<boolean> {
    return this._redis.keys(`*${Util.getGuildID(guild)}*`).then((data: any) => {
      if (!data?.length) return;
      Logger.log(...data);
      return this._redis.del(...data);
    });
  }

  public getCachedSuggestion(id: string): Promise<SuggestionSchema> {
    return this._redis.keys(`*${id}*`).then((data: any) => {
      if (!data?.length) return;
      return this._redis.get(data[0] as string).then((data: any) => JSON.parse(data));
    });
  }

  public setCachedSuggestion(id: string, message: string, data: SuggestionSchema): Promise<boolean> {
    return this._redis.set(RedisHelpers._formSuggestionKey(id, message), JSON.stringify(data));
  }

  public clearCachedSuggestion(id: string): Promise<boolean> {
    return this._redis.keys(`*${id}*`).then((data: any) => {
      if (!data?.length) return;
      return this._redis.del(data[0]);
    });
  }
}
