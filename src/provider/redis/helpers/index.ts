import SuggestionsClient from '../../../structures/client';
import { GuildSchema, Promisified } from '../../../types';
import { Guild } from 'eris';

export default class RedisHelpers {
  private _redis: Promisified;

  constructor(public client: SuggestionsClient, public redis: Promisified) {
    this.client = client;
    this._redis = redis;
  }

  private static _getGuildType(guild: Guild|string): string {
    return guild instanceof Guild ? guild.id : guild;
  }

  public static getGuildKey(guild: Guild|string): string {
    return `guild:${RedisHelpers._getGuildType(guild)}:settings`;
  }

  public getCachedGuild(guild: Guild|string): Promise<GuildSchema> {
    // @ts-expect-error override async-redis return type
    return this._redis.get(RedisHelpers.getGuildKey(guild)).then((data: string) => JSON.parse(data) as GuildSchema);
  }

  public setCachedGuild(guild: Guild|string, data: GuildSchema): Promise<boolean> {
    return this._redis.set(RedisHelpers.getGuildKey(guild), JSON.stringify(data));
  }

  public clearCachedGuild(guild: Guild|string): Promise<boolean> {
    return this._redis.del(RedisHelpers.getGuildKey(guild));
  }
}
