import { Guild, GuildTextableChannel, Role } from 'eris';
import { Collection } from '@augu/immutable';

import {
  GuildSchema,
  SuggestionChannelType,
  SuggestionRole,
} from '../../types';
import SuggestionsClient from '../core/Client';
import SuggestionManager from '../../managers/SuggestionManager';
import BaseChannel from '../core/BaseChannel';

type Cooldown = { expires: number; };

export default class SuggestionChannel extends BaseChannel {
  readonly #suggestions: SuggestionManager;
  readonly #allowed: Collection<Role>;
  readonly #blocked: Collection<Role>;
  readonly #cooldowns: Map<string, Cooldown>;
  #count: number;
  #emojis: number;
  #cooldown?: number;
  #locked: boolean;
  #removeMode: boolean;
  #initialized: boolean;

  constructor(
    client: SuggestionsClient,
    guild: Guild,
    type: SuggestionChannelType,
    channel: GuildTextableChannel,
    settings: GuildSchema
  ) {
    super(client, guild, type, channel, settings);

    this.#initialized = false;
    this.#suggestions = new SuggestionManager(this);
    this.#allowed = new Collection<Role>();
    this.#blocked = new Collection<Role>();
    this.#cooldowns = new Map<string, Cooldown>();
    this.#locked = false;
    this.#removeMode = false;
    this.#emojis = 0;
    this.#count = 0;
  }

  public get locked(): boolean {
    return this.#locked;
  }

  public get reviewMode(): boolean {
    return this.#removeMode;
  }

  public get suggestions(): SuggestionManager {
    return this.#suggestions;
  }

  public get allowed(): Collection<Role> {
    return this.#allowed;
  }

  public get blocked(): Collection<Role> {
    return this.#blocked;
  }

  public get cooldowns(): Map<string, Cooldown> {
    return this.#cooldowns;
  }

  public get emojis(): number {
    return this.#emojis;
  }

  public get cooldown(): number|undefined {
    return this.#cooldown;
  }

  public get count(): number {
    return this.#count;
  }

  public get initialized(): boolean {
    return this.#initialized;
  }

  public async init(): Promise<void> {
    if (this.#initialized) throw new Error('ChannelAlreadyInitialized');
    if (this.data!.locked) this.#locked = this.data!.locked;
    if (this.data!.reviewMode) this.#removeMode = this.data!.reviewMode;
    if (this.data!.emojis) this.#emojis = this.data!.emojis;
    if (this.data!.cooldown) this.#cooldown = this.data!.cooldown;
    this.type = this.data!.type;
    this.addRoles(this.data!.allowed, this.#allowed);
    this.addRoles(this.data!.blocked, this.#blocked);
    this.#count = await this.client.redis.helpers.getChannelCount(this.guild, this.type, this.channel);
    this.#initialized = true;
  }

  public async setReviewMode(enabled: boolean): Promise<boolean> {
    this.#removeMode = enabled;
    this.settings.updateChannel(this.channel.id, { reviewMode: enabled });
    await this.settings.save();
    await this.client.redis.helpers.clearCachedGuild(this.guild);
    return this.#removeMode;
  }

  public async lock(locked: boolean): Promise<boolean> {
    this.#locked = locked;
    this.settings.updateChannel(this.channel.id, { locked });
    await this.settings.save();
    await this.client.redis.helpers.clearCachedGuild(this.guild);
    return this.#locked;
  }

  public async setEmojis(id: number): Promise<number> {
    this.#emojis = id;
    this.settings.updateChannel(this.channel.id, { emojis: id });
    await this.settings.save();
    await this.client.redis.helpers.clearCachedGuild(this.guild);
    return this.#emojis;
  }

  public async setCooldown(cooldown: number): Promise<number|undefined> {
    this.#cooldown = cooldown === 0 ? undefined : cooldown;
    this.settings.updateChannel(this.channel.id, { cooldown: this.#cooldown });
    await this.settings.save();
    await this.client.redis.helpers.clearCachedGuild(this.guild);
    return this.#cooldown;
  }

  public async updateRole(data: SuggestionRole): Promise<boolean> {
    const role = this.guild.roles.get(data.id)!;
    switch (data.type) {
      case 'allowed': {
        this.#allowed.has(data.id) ? this.#allowed.delete(data.id) : this.#allowed.set(data.id, role);
        this.settings.updateChannelRoles(this.channel.id, data);
        await this.settings.save();
        await this.client.redis.helpers.clearCachedGuild(this.guild);
        return this.#allowed.has(data.id);
      }
      case 'blocked': {
        this.#blocked.has(data.id) ? this.#blocked.delete(data.id) : this.#blocked.set(data.id, role);
        this.settings.updateChannelRoles(this.channel.id, data);
        await this.settings.save();
        await this.client.redis.helpers.clearCachedGuild(this.guild);
        return this.#blocked.has(data.id);
      }
      default: throw new Error('InvalidRoleType');
    }
  }

  public async clearRoles(type: 'allowed'|'blocked', reset?: boolean): Promise<void> {
    if (type === 'allowed') {
      this.#allowed.clear();
      this.data!.allowed = [];
    } else {
      if (reset) {
        this.#blocked.clear();
        this.data!.blocked = [];
      } else {
        this.data!.blocked = [<SuggestionRole>{
          id: 'all',
          addedBy: this.client.user.id,
          type: 'blocked'
        }];
      }
    }
    await this.settings.save();
    await this.client.redis.helpers.clearCachedGuild(this.guild);
  }

  public updateCooldowns(user: string, remove?: boolean): boolean {
    if (remove) return this.#cooldowns.delete(user);
    this.#cooldowns.set(user, { expires: this.#cooldown! + Date.now() });
    // TODO in the future when we pull from redis directly, make sure to remove this setTimeout
    setTimeout(() => {
      this.#cooldowns.delete(user);
    }, this.#cooldown!);
    return this.#cooldowns.has(user);
  }

  public updateCount(type: 'incr' | 'decr'): number {
    if (type === 'incr') this.#count++;
    else this.#count--;
    return this.#count;
  }

  private addRoles(roles: Array<SuggestionRole>, collection: Collection<Role>): void {
    for (const r of roles) {
      const role = this.guild.roles.get(r.id);
      if (!role) continue;
      collection.set(role.id, role);
    }
  }
}
