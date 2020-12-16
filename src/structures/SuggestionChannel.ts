import { Guild, GuildTextableChannel, Role, TextChannel } from 'eris';
import { Collection } from '@augu/immutable';

import {
  GuildSchema,
  SuggestionChannel as SuggestionChannelObj,
  SuggestionChannelType,
  SuggestionRole,
} from '../types';
import SuggestionsClient from './Client';
import ChannelManager from '../managers/ChannelManager';
import SuggestionManager from '../managers/SuggestionManager';

export default class SuggestionChannel {
  private readonly _suggestions: SuggestionManager;
  private readonly _allowed: Collection<Role>;
  private readonly _blocked: Collection<Role>;
  private readonly _cooldowns: Map<string, { expires: number; }>;
  private _count: number;
  private _emojis: number;
  private _cooldown?: number;
  private _locked: boolean;
  private _reviewMode: boolean;
  private _initialized: boolean;

  constructor(
    public client: SuggestionsClient,
    public guild: Guild,
    public type: SuggestionChannelType,
    private _channel: GuildTextableChannel,
    private _settings: GuildSchema
  ) {
    this._suggestions = new SuggestionManager(this);
    this._allowed = new Collection<Role>();
    this._blocked = new Collection<Role>();
    this._cooldowns = new Map<string, { expires: number; }>();
    this._locked = false;
    this._reviewMode = false;
    this._emojis = 0;
    this._count = 0;
    this._initialized = false;
  }

  public get data(): SuggestionChannelObj|undefined {
    return this._settings.channels.find(c => c.channel === this._channel.id);
  }

  public get locked(): boolean {
    return this._locked;
  }

  public get reviewMode(): boolean {
    return this._reviewMode;
  }

  public get suggestions(): SuggestionManager {
    return this._suggestions;
  }

  public get allowed(): Collection<Role> {
    return this._allowed;
  }

  public get blocked(): Collection<Role> {
    return this._blocked;
  }

  public get channel(): TextChannel {
    return this._channel;
  }

  public get cooldowns(): Map<string, { expires: number; }> {
    return this._cooldowns;
  }

  public get manager(): ChannelManager {
    return this.client.suggestionChannels;
  }

  public get emojis(): number {
    return this._emojis;
  }

  public get cooldown(): number|undefined {
    return this._cooldown;
  }

  public get count(): number {
    return this._count;
  }

  public async init(): Promise<void> {
    if (this._initialized) return;
    if (this.data!.locked) this._locked = this.data!.locked;
    if (this.data!.reviewMode) this._reviewMode = this.data!.reviewMode;
    if (this.data!.emojis) this._emojis = this.data!.emojis;
    if (this.data!.cooldown) this._cooldown = this.data!.cooldown;
    this.type = this.data!.type;
    this._addRoles(this.data!.allowed, this._allowed);
    this._addRoles(this.data!.blocked, this._blocked);
    this._count = await this.client.redis.helpers.getGuildSuggestionCount(this.guild, this.channel);
    this._initialized = true;
  }

  public async setReviewMode(enabled: boolean): Promise<boolean> {
    this._reviewMode = enabled;
    this._settings.updateChannel(this.channel.id, { reviewMode: enabled });
    await this._settings.save();
    await this.client.redis.helpers.clearCachedGuild(this.guild);
    return this._reviewMode;
  }

  public async lock(locked: boolean): Promise<boolean> {
    this._locked = locked;
    this._settings.updateChannel(this.channel.id, { locked });
    await this._settings.save();
    await this.client.redis.helpers.clearCachedGuild(this.guild);
    return this._locked;
  }

  public async setEmojis(id: number): Promise<number> {
    this._emojis = id;
    this._settings.updateChannel(this.channel.id, { emojis: id });
    await this._settings.save();
    await this.client.redis.helpers.clearCachedGuild(this.guild);
    return this._emojis;
  }

  public async setCooldown(cooldown: number): Promise<number|undefined> {
    this._cooldown = cooldown === 0 ? undefined : cooldown;
    this._settings.updateChannel(this.channel.id, { cooldown: this._cooldown });
    await this._settings.save();
    await this.client.redis.helpers.clearCachedGuild(this.guild);
    return this._cooldown;
  }

  public async updateRole(data: SuggestionRole): Promise<boolean> {
    const role = this.guild.roles.get(data.role)!;
    switch (data.type) {
      case 'allowed': {
        this._allowed.has(data.role) ? this._allowed.delete(data.role) : this._allowed.set(data.role, role);
        this._settings.updateChannelRoles(this.channel.id, data);
        await this._settings.save();
        await this.client.redis.helpers.clearCachedGuild(this.guild);
        return this._allowed.has(data.role);
      }
      case 'blocked': {
        this._blocked.has(data.role) ? this._blocked.delete(data.role) : this._blocked.set(data.role, role);
        this._settings.updateChannelRoles(this.channel.id, data);
        await this._settings.save();
        await this.client.redis.helpers.clearCachedGuild(this.guild);
        return this._blocked.has(data.role);
      }
      default: throw new Error('InvalidRoleType');
    }
  }

  public async clearRoles(type: 'allowed'|'blocked', reset?: boolean): Promise<void> {
    if (type === 'allowed') {
      this._allowed.clear();
      this.data!.allowed = [];
    } else {
      if (reset) {
        this._blocked.clear();
        this.data!.blocked = [];
      } else {
        this.data!.blocked = [<SuggestionRole>{
          role: 'all',
          addedBy: this.client.user.id,
          type: 'blocked'
        }];
      }
    }
    await this._settings.save();
    await this.client.redis.helpers.clearCachedGuild(this.guild);
  }

  public updateCooldowns(user: string, remove?: boolean): boolean {
    if (remove) return this._cooldowns.delete(user);
    this._cooldowns.set(user, { expires: this._cooldown! + Date.now() });
    // TODO in the future when we pull from redis directly, make sure to remove this setTimeout
    setTimeout(() => {
      this._cooldowns.delete(user);
    }, this._cooldown!);
    return this._cooldowns.has(user);
  }

  private async _addRoles(roles: Array<SuggestionRole>, collection: Collection<Role>): Promise<void> {
    for (const r of roles) {
      const role = this.guild.roles.get(r.role);
      if (!role) continue;
      collection.set(role.id, role);
    }
  }
}
