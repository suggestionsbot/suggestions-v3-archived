import { Member, TextChannel } from 'eris';

import {
  GuildSchema,
  ShardStats, SuggestionChannelType,
  SuggestionGuild,
} from '../../../types';
import Util from '../../../utils/Util';
import Redis from '../index';

// TODO: Add methods for storing the bot inviter

export default class RedisHelpers {
  constructor(public redis: Redis) {}

  private static formGuildKey(guild: SuggestionGuild): string {
    return `guild:${Util.getGuildID(guild)}:settings`;
  }

  async getGlobalSuggestionCount(): Promise<number> {
    return this.redis.instance!.get('global:suggestions:count').then((count: any) => +count);
  }

  async getChannelCount(guild: SuggestionGuild, type: SuggestionChannelType, channel?: TextChannel): Promise<number> {
    const key = channel ? `guild:${Util.getGuildID(guild)}:channel:${channel.id}:${type}:count` :
      `guild:${Util.getGuildID(guild)}:${type}:count`;
    return this.redis.instance!.get(key).then((count: any) => +count);
  }

  async getMemberSuggestionCount(member: Member): Promise<number> {
    return this.redis.instance!.get(`guild:${member.guild.id}:member:${member.id}:suggestions:count`).then((count: any) => +count);
  }

  async getGlobalCommandCount(): Promise<number> {
    return this.redis.instance!.get('global:commands:count').then((count: any) => +count);
  }

  async getGuildCommandCount(guild: SuggestionGuild): Promise<number> {
    return this.redis.instance!.get(`guild:${Util.getGuildID(guild)}:commands:count`).then((count: any) => +count);
  }

  async getMemberCommandCount(member: Member): Promise<number> {
    return this.redis.instance!.get(`guild:${member.guild.id}:member:${member.id}:commands:count`).then((count: any) => +count);
  }

  async getGlobalBlacklistCount(): Promise<number> {
    return this.redis.instance!.get('global:blacklists:count').then((count: any) => +count);
  }

  async getGuildBlacklistCount(guild: SuggestionGuild): Promise<number> {
    return this.redis.instance!.get(`guild:${Util.getGuildID(guild)}:blacklists:count`).then((count: any) => +count);
  }

  async getStats(): Promise<ShardStats> {
    const data: any = await this.redis.instance!.hgetall('shardstats');
    const field = Object.keys(data).sort((a, b) => +a - +b)[0];
    return JSON.parse(data[field]);
  }

  async getGuildCount(): Promise<number> {
    const data = await this.getStats();
    return data.guilds;
  }

  async getUserCount(): Promise<number> {
    const data = await this.getStats();
    return data.users;
  }

  updateStats(data: ShardStats): Promise<boolean> {
    return this.redis.instance!.hset('shardstats', Date.now().toString(), JSON.stringify(data));
  }

  getCachedGuild(guild: SuggestionGuild): Promise<GuildSchema> {
    return this.redis.instance!.get(RedisHelpers.formGuildKey(guild))
      .then((data: any) => JSON.parse(data));
  }

  setCachedGuild(guild: SuggestionGuild, data: GuildSchema): Promise<boolean> {
    return this.redis.instance!.set(RedisHelpers.formGuildKey(guild), JSON.stringify(data));
  }

  clearCachedGuild(guild: SuggestionGuild): Promise<boolean> {
    return this.redis.instance!.del(RedisHelpers.formGuildKey(guild));
  }

  clearCachedData(guild: SuggestionGuild): Promise<boolean> {
    return this.redis.instance!.keys(`*${Util.getGuildID(guild)}*`).then((data: any) => {
      if (!data?.length) return false;
      return this.redis.instance!.del(...data);
    });
  }
}
