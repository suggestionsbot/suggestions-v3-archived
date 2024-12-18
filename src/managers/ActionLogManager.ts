import { Collection } from '@augu/immutable';

import ActionLog from '../structures/actions/ActionLog';
import ActionLogChannel from '../structures/actions/ActionLogChannel';
import { ActionLogSchema } from '../types';
import Logger from '../utils/Logger';
import SuggestionsClient from '../structures/core/Client';

export default class ActionLogManager {
  readonly #cache: Collection<ActionLog>;

  constructor(public channel: ActionLogChannel) {
    this.#cache = new Collection<ActionLog>();
  }

  get cache(): Collection<ActionLog> {
    return this.#cache;
  }

  get client(): SuggestionsClient {
    return this.channel.client;
  }

  async add(actionlog: ActionLog, cache: boolean = false): Promise<ActionLogSchema> {
    const record: Record<string, unknown> = {
      executor: actionlog.executor.id,
      target: actionlog.target?.id ?? null,
      guild: actionlog.guild.id,
      channel: actionlog.channel.id,
      message: actionlog.message?.id ?? null,
      id: actionlog.id(),
      type: actionlog.type
    };

    const data = await this.client.database.helpers.actionlog.createActionLog(record);
    if (cache) this.#cache.set(actionlog.id(), actionlog);
    this.client.redis.instance!.incr(`guild:${data.guild}:actionlogs:count`);
    this.client.redis.instance!.incr(`guild:${data.guild}:channel:${data.channel}:actionlogs:count`);
    this.client.redis.instance!.incr('global:actionlogs');

    Logger.log(`Created actionlog ${actionlog.id(true)} in the database...`);

    return data;
  }

  async delete(query: string): Promise<boolean> {
    const data = await this.queryFromDatabase(query);

    const deleted = await this.client.database.helpers.actionlog.deleteActionLog(query);
    if (this.#cache.has(data!.id())) this.#cache.delete(data!.id());
    this.client.redis.instance!.decr(`guild:${data!.guild}:actionlogs:count`);
    this.client.redis.instance!.decr(`guild:${data!.guild}:channel:${data!.channel}:actionlogs:count`);
    this.client.redis.instance!.decr('global:actionlogs');

    Logger.log(`Deleted actionlog ${data!.id(true)} from the databae...`);

    return deleted;
  }

  async fetch(query: string, cache: boolean = true, force: boolean = false): Promise<ActionLog|undefined|null> {
    if (query.length === 40) {
      if (!force) {
        const existing = this.#cache.get(query);
        if (existing) return existing;
      }

      const actionlog = await this.queryFromDatabase(query);
      if (cache) this.#cache.set(actionlog!.id(), actionlog!);
      return actionlog;
    }

    if (query.length === 7) {
      if (!force) {
        const existing = this.#cache.find(a => a.id(true) === query);
        if (existing) return existing;
      }

      const actionlog = await this.queryFromDatabase(query);
      if (cache) this.#cache.set(actionlog!.id(), actionlog!);
      return actionlog;
    }

    return;
  }

  private queryFromDatabase(query: string): Promise<ActionLog|undefined> {
    return this.client.database.helpers.actionlog.getActionLog(query);
  }
}
