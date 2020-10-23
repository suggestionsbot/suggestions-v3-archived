import { Guild, GuildTextableChannel, Role, TextChannel } from 'eris';
import { Collection } from '@augu/immutable';

import {
  GuildSchema,
  SuggestionChannelType,
  SuggestionSchema,
  SuggestionChannel as SuggestionChannelObj, SuggestionRole,
} from '../types';
import SuggestionsClient from './Client';
import ChannelManager from '../managers/ChannelManager';

/**
 * TODO pull internal data directly from redis (as we already have this data in the db and redis
 */
export default class SuggestionChannel {
  private readonly _suggestions: Collection<SuggestionSchema>;
  private readonly _allowed: Collection<Role>;
  private readonly _blocked: Collection<Role>;
  private readonly _cooldowns: Map<string, { expires: number; }>;
  private _emojis: string;
  private _cooldown?: number;
  private _locked: boolean;
  private _reviewMode: boolean;

  constructor(
    public client: SuggestionsClient,
    public guild: Guild,
    public type: SuggestionChannelType,
    private _channel: GuildTextableChannel,
    private _settings: GuildSchema
  ) {
    this._suggestions = new Collection<SuggestionSchema>();
    this._allowed = new Collection<Role>();
    this._blocked = new Collection<Role>();
    this._cooldowns = new Map<string, { expires: number; }>();
    this._locked = false;
    this._reviewMode = false;
    this._emojis = 'defaultEmojis';
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

  public get suggestions(): Collection<SuggestionSchema> {
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

  public get emojis(): string {
    return this._emojis;
  }

  public get cooldown(): number|undefined {
    return this._cooldown;
  }

  public async init(): Promise<void> {
    this._locked = this.data!.locked;
    this._reviewMode = this.data!.reviewMode;
    this._emojis = this.data!.emojis;
    this._cooldown = this.data!.cooldown;
    this._addRoles(this.data!.allowed, this._allowed);
    this._addRoles(this.data!.blocked, this._blocked);
    this._addSuggestions();
  }

  public async createSuggestion(suggestion: Record<string, unknown>): Promise<SuggestionSchema|void> {
    suggestion.guild = this.guild.id;
    suggestion.channel = this.channel.id;

    const data = await this.client.database.suggestionHelpers.createSuggestion(suggestion);
    this._suggestions.set(data.id, data);
    if (this.cooldown && !this.cooldowns.has(data.user)) this.updateCooldowns(data.user);
    return data;
  }

  public getSuggestion(query: string, cached = true): SuggestionSchema|undefined {
    if (query.length === 40) {
      const suggestion = this._suggestions.find(r => r.id === query);
      if (!suggestion) throw new Error('SuggestionNotFound');

      return suggestion;
    }

    if (query.length === 7) {
      const suggestion = this._suggestions.find(s => s.id.slice(33, 40) === query);
      if (!suggestion) throw new Error('SuggestionNotFound');

      return suggestion;
    }

    if (query.length === 18) {
      const suggestion = this._suggestions.find(s => s.message === query);
      if (!suggestion) throw new Error('SuggestionNotFound');

      return suggestion;
    }

    const re = /(https?:\/\/)?(www\.)?((canary|ptb)\.?|(discordapp|discord\.com)\/channels)\/(.+[[0-9])/g;
    if (query.match(re)) {
      const matches = re.exec(query)!;
      const ids = matches[matches.length - 1].split('/');
      const messageID = ids[ids.length - 1];

      const suggestion = this._suggestions.find(s => s.message === messageID);
      if (!suggestion) throw new Error('SuggestionNotFound');

      return suggestion;
    }

    return;
  }

  public async deleteSuggestion(query: string): Promise<boolean> {
    return false;
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

  public async setEmojis(name: string): Promise<string> {
    this._emojis = name;
    this._settings.updateChannel(this.channel.id, { emojis: name });
    await this._settings.save();
    await this.client.redis.helpers.clearCachedGuild(this.guild);
    return this._emojis;
  }

  public async setCooldown(cooldown: number): Promise<number> {
    this._cooldown = cooldown;
    this._settings.updateChannel(this.channel.id, { cooldown });
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

  private async _addSuggestions(): Promise<void> {
    const suggestions = await this.client.redis.helpers.getCachedSuggestions(this.guild, this.channel.id);
    if (!suggestions) return;
    for (const suggestion of suggestions) {
      this._suggestions.set(suggestion.id, suggestion);
    }
  }
}
