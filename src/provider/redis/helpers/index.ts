import SuggestionsClient from '../../../structures/client';
import { GuildSchema, Promisified, SuggestionSchema } from '../../../types';
import { Guild, Message } from 'eris';

export default class RedisHelpers {
  private _redis: Promisified;

  constructor(public client: SuggestionsClient, public redis: Promisified) {
    this.client = client;
    this._redis = redis;
  }

  private static _getGuildType(guild: Guild|string): string {
    return guild instanceof Guild ? guild.id : guild;
  }

  private static _getMessageType(message: Message|string): string {
    return message instanceof Message ? message.id : message;
  }

  private static _formSuggestionKey(id: string, message: string): string {
    return `suggestion:${id}:${message}`;
  }

  public static getGuildKey(guild: Guild|string): string {
    return `guild:${RedisHelpers._getGuildType(guild)}:settings`;
  }

  public getCachedGuild(guild: Guild|string): Promise<GuildSchema> {
    return this._redis.get(RedisHelpers.getGuildKey(guild)).then((data: any) => JSON.parse(data) as GuildSchema);
  }

  public setCachedGuild(guild: Guild|string, data: GuildSchema): Promise<boolean> {
    return this._redis.set(RedisHelpers.getGuildKey(guild), JSON.stringify(data));
  }

  public clearCachedGuild(guild: Guild|string): Promise<boolean> {
    return this._redis.del(RedisHelpers.getGuildKey(guild));
  }

  public getCachedSuggestion(id: string): Promise<SuggestionSchema> {
    return this._redis.keys(`*${id}*`).then((data: any) => {
      if (!data?.length) return;
      return this._redis.get(data[0] as string).then((data: any) => JSON.parse(data) as SuggestionSchema);
    });
  }

  public setCachedSuggestion(id: string, message: string, data: SuggestionSchema): Promise<boolean> {
    return this._redis.set(RedisHelpers._formSuggestionKey(id, message), JSON.stringify(data));
  }

  public clearCachedSuggestion(id: string): Promise<boolean> {
    return this._redis.keys(`*${id}*`).then((data: any) => {
      if (!data?.length) return;
      return this._redis.del(data[0] as string);
    });
  }
}
