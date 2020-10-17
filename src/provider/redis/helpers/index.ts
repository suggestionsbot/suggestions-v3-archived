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
import { Member } from 'eris';

export default class RedisHelpers {
  private _redis: Promisified;

  constructor(public client: SuggestionsClient, public redis: Promisified) {
    this._redis = redis;
  }

  private static _formSuggestionKey(id: string, guild: string, channel: string, message: string): string {
    // return `suggestion:${id}:${message}`;
    return `suggestion:${guild}:${channel}:${message}:${id}`;
  }

  private static _formGuildKey(guild: SuggestionGuild): string {
    return `guild:${Util.getGuildID(guild)}:settings`;
  }

  private static _formGuildBlacklistKey(user: SuggestionUser, guild: SuggestionGuild): string {
    if (guild) return `blacklist:${Util.getGuildID(guild)}:${Util.getUserID(user)}`;
    else return `blacklist:${Util.getUserID(user)}`;
  }

  public async getGlobalSuggestionCount(): Promise<number> {
    return this._redis.get('global:suggestions:count').then((count: any) => +count);
  }

  public async getGuildSuggestionCount(guild: SuggestionGuild): Promise<number> {
    return this._redis.get(`guild:${Util.getGuildID(guild)}:suggestions:count`).then((count: any) => +count);
  }

  public async getMemberSuggestionCount(member: Member): Promise<number> {
    return this._redis.get(`guild:${member.guild.id}:member:${member.id}:suggestions:count`).then((count: any) => +count);
  }

  public async getGlobalCommandCount(): Promise<number> {
    return this._redis.get('global:commands:count').then((count: any) => +count);
  }

  public async getGuildCommandCount(guild: SuggestionGuild): Promise<number> {
    return this._redis.get(`guild:${Util.getGuildID(guild)}:commands:count`).then((count: any) => +count);
  }

  public async getMemberCommandCount(member: Member): Promise<number> {
    return this._redis.get(`guild:${member.guild.id}:member:${member.id}:commands:count`).then((count: any) => +count);
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

  public async getGuildCount(): Promise<number> {
    const data = await this.getStats();
    return data.guilds;
  }

  public async getUserCount(): Promise<number> {
    const data = await this.getStats();
    return data.users;
  }

  public updateStats(data: ShardStats): Promise<boolean> {
    return this._redis.hset('shardstats', Date.now().toString(), JSON.stringify(data));
  }

  public getCachedGuild(guild: SuggestionGuild): Promise<GuildSchema> {
    return this._redis.get(RedisHelpers._formGuildKey(guild))
      .then((data: any) => JSON.parse(data));
  }

  public getCachedBlacklist(user: SuggestionUser, guild?: SuggestionGuild): Promise<BlacklistSchema> {
    return this.redis.get(RedisHelpers._formGuildBlacklistKey(user, guild!))
      .then((data: any) => JSON.parse(data));
  }

  public setCachedBlacklist(user: SuggestionUser, data: BlacklistSchema, guild?: SuggestionGuild): Promise<boolean> {
    return this._redis.set(RedisHelpers._formGuildBlacklistKey(user, guild!), JSON.stringify(data));
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
      if (!data?.length) return false;
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

  public setCachedSuggestion(data: SuggestionSchema): Promise<boolean> {
    return this._redis.set(RedisHelpers._formSuggestionKey(data.id, data.guild, data.channel, data.message), JSON.stringify(data));
  }

  public clearCachedSuggestion(id: string): Promise<boolean> {
    return this._redis.keys(`*${id}*`).then((data: any) => {
      if (!data?.length) return false;
      return this._redis.del(data[0]);
    });
  }

  public getCachedSuggestions(guild: SuggestionGuild, channel?: string): Promise<Array<SuggestionSchema>|undefined> {
    const key = `suggestion:${Util.getGuildID(guild)}:${channel ? channel : ''}:*`;
    return this._redis.keys(key).then((data: any) => {
      if (!data?.length) return;
      return this._redis.mget(data).then((data: any) => {
        const suggestions: Array<SuggestionSchema> = [];
        for (const s of data) {
          const suggestion = JSON.parse(s) as SuggestionSchema;
          suggestions.push(suggestion);
        }

        return suggestions;
      });
    });
  }
}
