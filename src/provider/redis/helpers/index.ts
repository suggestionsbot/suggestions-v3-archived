import { Member, TextChannel } from 'eris';

import {
  BlacklistSchema,
  GuildSchema,
  ShardStats,
  SuggestionGuild,
  SuggestionSchema,
  SuggestionUser
} from '../../../types';
import Util from '../../../utils/Util';
import Logger from '../../../utils/Logger';
import Redis from '../index';

export default class RedisHelpers {
  constructor(public redis: Redis) {}

  private static _formSuggestionKey(id: string, guild: string, channel: string, message: string): string {
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
    return this.redis.instance!.get('global:suggestions:count').then((count: any) => +count);
  }

  public async getGuildSuggestionCount(guild: SuggestionGuild, channel?: TextChannel): Promise<number> {
    const key = channel ? `guild:${Util.getGuildID(guild)}:channel:${channel.id}:suggestions:count` :
      `guild:${Util.getGuildID(guild)}:suggestions:count`;
    return this.redis.instance!.get(key).then((count: any) => +count);
  }

  public async getMemberSuggestionCount(member: Member): Promise<number> {
    return this.redis.instance!.get(`guild:${member.guild.id}:member:${member.id}:suggestions:count`).then((count: any) => +count);
  }

  public async getGlobalCommandCount(): Promise<number> {
    return this.redis.instance!.get('global:commands:count').then((count: any) => +count);
  }

  public async getGuildCommandCount(guild: SuggestionGuild): Promise<number> {
    return this.redis.instance!.get(`guild:${Util.getGuildID(guild)}:commands:count`).then((count: any) => +count);
  }

  public async getMemberCommandCount(member: Member): Promise<number> {
    return this.redis.instance!.get(`guild:${member.guild.id}:member:${member.id}:commands:count`).then((count: any) => +count);
  }

  public async getGlobalBlacklistCount(): Promise<number> {
    return this.redis.instance!.get('global:blacklists:count').then((count: any) => +count);
  }

  public async getGuildBlacklistCount(guild: SuggestionGuild): Promise<number> {
    return this.redis.instance!.get(`guild:${Util.getGuildID(guild)}:blacklists:count`).then((count: any) => +count);
  }

  public async getStats(): Promise<ShardStats> {
    const data: any = await this.redis.instance!.hgetall('shardstats');
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
    return this.redis.instance!.hset('shardstats', Date.now().toString(), JSON.stringify(data));
  }

  public getCachedGuild(guild: SuggestionGuild): Promise<GuildSchema> {
    return this.redis.instance!.get(RedisHelpers._formGuildKey(guild))
      .then((data: any) => JSON.parse(data));
  }

  public getCachedBlacklist(user: SuggestionUser, guild?: SuggestionGuild): Promise<BlacklistSchema> {
    return this.redis.instance!.get(RedisHelpers._formGuildBlacklistKey(user, guild!))
      .then((data: any) => JSON.parse(data));
  }

  public setCachedBlacklist(user: SuggestionUser, data: BlacklistSchema, guild?: SuggestionGuild): Promise<boolean> {
    return this.redis.instance!.set(RedisHelpers._formGuildBlacklistKey(user, guild!), JSON.stringify(data));
  }

  public clearCachedBlacklist(user: SuggestionUser, guild: SuggestionGuild): Promise<boolean> {
    return this.redis.instance!.del(RedisHelpers._formGuildBlacklistKey(user, guild));
  }

  public setCachedGuild(guild: SuggestionGuild, data: GuildSchema): Promise<boolean> {
    return this.redis.instance!.set(RedisHelpers._formGuildKey(guild), JSON.stringify(data));
  }

  public clearCachedGuild(guild: SuggestionGuild): Promise<boolean> {
    return this.redis.instance!.del(RedisHelpers._formGuildKey(guild));
  }

  public clearCachedData(guild: SuggestionGuild): Promise<boolean> {
    return this.redis.instance!.keys(`*${Util.getGuildID(guild)}*`).then((data: any) => {
      if (!data?.length) return false;
      Logger.log(...data);
      return this.redis.instance!.del(...data);
    });
  }

  public getCachedSuggestion(id: string): Promise<SuggestionSchema> {
    return this.redis.instance!.keys(`*${id}*`).then((data: any) => {
      if (!data?.length) return;
      return this.redis.instance!.get(data[0] as string).then((data: any) => JSON.parse(data));
    });
  }

  public setCachedSuggestion(data: SuggestionSchema): Promise<boolean> {
    return this.redis.instance!.set(RedisHelpers._formSuggestionKey(data.id, data.guild, data.channel, data.message), JSON.stringify(data));
  }

  public clearCachedSuggestion(id: string): Promise<boolean> {
    return this.redis.instance!.keys(`*${id}*`).then((data: any) => {
      if (!data?.length) return false;
      return this.redis.instance!.del(data[0]);
    });
  }

  public getCachedSuggestions(guild: SuggestionGuild, channel?: string): Promise<Array<SuggestionSchema>|undefined> {
    const key = `suggestion:${Util.getGuildID(guild)}:${channel ? channel : ''}:*`;
    return this.redis.instance!.keys(key).then((data: any) => {
      if (!data?.length) return;
      return this.redis.instance!.mget(data).then((data: any) => {
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
