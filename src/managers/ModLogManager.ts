import { Collection } from '@augu/immutable';
import ModLog from '../structures/moderation/ModLog';
import ModLogChannel from '../structures/moderation/ModLogChannel';
import modlogsClient from '../structures/core/Client';
import { ModLogSchema } from '../types';
import Logger from '../utils/Logger';

export default class ModLogManager {
  readonly #cache: Collection<ModLog>;

  constructor(public channel: ModLogChannel) {
    this.#cache = new Collection<ModLog>();
  }

  public get cache(): Collection<ModLog> {
    return this.#cache;
  }

  public get client(): modlogsClient {
    return this.channel.client;
  }

  public async add(modlog: ModLog, cache: boolean = false): Promise<ModLogSchema> {
    const record: Record<string, unknown> = {
      user: modlog.user.id,
      moderator: modlog.moderator.id,
      guild: modlog.guild.id,
      channel: modlog.channel.id,
      message: modlog.message?.id ?? null,
      id: modlog.id(),
      type: modlog.type
    };

    const data = await this.client.database.helpers.modlog.createModLog(record);
    if (cache) this.#cache.set(modlog.id(), modlog);
    this.client.redis.instance!.incr(`guild:${data.guild}:modlogs:count`);
    this.client.redis.instance!.incr(`guild:${data.guild}:channel:${data.channel}:modlogs:count`);
    this.client.redis.instance!.incr('global:modlogs');

    Logger.log(`Created modlog ${modlog.id(true)} in the database...`);

    return data;
  }

  public async delete(query: string): Promise<boolean> {
    const data = await this.queryFromDatabase(query);

    const deleted = await this.client.database.helpers.modlog.deleteModLog(query);
    if (this.#cache.has(data!.id())) this.#cache.delete(data!.id());
    this.client.redis.instance!.decr(`guild:${data!.guild}:modlogs:count`);
    this.client.redis.instance!.decr(`guild:${data!.guild}:channel:${data!.channel}:modlogs:count`);
    this.client.redis.instance!.decr('global:modlogs');

    Logger.log(`Deleted modlog ${data!.id(true)} from the databae...`);

    return deleted;
  }

  public async fetch(query: string, cache: boolean = true, force: boolean = false): Promise<ModLog|undefined|null> {
    if (query.length === 40) {
      const modlog = force ? await this.queryFromDatabase(query) : this.#cache.get(query) ??
          await this.queryFromDatabase(query);
      if (cache) this.#cache.set(modlog!.id(), modlog!);

      return modlog;
    }

    if (query.length === 7) {
      const modlog = force ? await this.queryFromDatabase(query) :
        this.#cache.find(s => s.id(true) === query) ?? await this.queryFromDatabase(query);
      if (cache) this.#cache.set(modlog!.id(), modlog!);

      return modlog;
    }

    const snowflake = /^(\d{17,19})$/g;
    if (query.match(snowflake)) {
      const modlog = force ? await this.queryFromDatabase(query) : this.#cache.get(query) ??
          await this.queryFromDatabase(query);
      if (cache) this.#cache.set(modlog!.id(), modlog!);

      return modlog;
    }

    return;
  }

  private queryFromDatabase(query: string): Promise<ModLog|null> {
    return this.client.database.helpers.modlog.getModLog(this.channel.guild.id, query);
  }
}
