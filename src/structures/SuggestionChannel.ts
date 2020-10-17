import { Guild, GuildTextableChannel, Role, TextChannel } from 'eris';
import { Collection } from '@augu/immutable';

import {
  GuildSchema,
  SuggestionChannelType,
  SuggestionSchema,
  SuggestionChannel as SuggestionChannelObj,
} from '../types';
import SuggestionsClient from './Client';
import ChannelManager from '../managers/ChannelManager';
import Logger from '../utils/Logger';

export default class SuggestionChannel {
  private readonly _suggestions: Collection<SuggestionSchema>;
  private readonly _allowed: Collection<Role>;
  private readonly _blocked: Collection<Role>;
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
    this._locked = false;
    this._reviewMode = false;
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

  public get manager(): ChannelManager {
    return this.client.suggestionChannels;
  }

  public async init(): Promise<void> {
    this._locked = this.data!.locked;
    this._reviewMode = this.data!.reviewMode;
    this._addRoles(this.data!.allowed, this._allowed);
    this._addRoles(this.data!.blocked, this._blocked);
    this._addSuggestions();
  }

  public async createSuggestion(suggestion: Record<string, unknown>): Promise<SuggestionSchema|void> {
    suggestion.guild = this.guild.id;
    suggestion.channel = this.channel.id;

    const data = await this.client.database.suggestionHelpers.createSuggestion(suggestion);
    this._suggestions.set(data.id, data);
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
    this._settings.updateChannel(this.channel.id, { enabled });
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

  public async updateRole(role: Role, type: 'allowed'|'blocked'): Promise<boolean> {
    switch (type) {
      case 'allowed': {
        this._allowed.has(role.id) ? this._allowed.delete(role.id) : this._allowed.set(role.id, role);
        this._settings.updateChannelRoles(this.channel.id, role.id, 'allowed');
        await this._settings.save();
        await this.client.redis.helpers.clearCachedGuild(this.guild);
        return this._allowed.has(role.id);
      }
      case 'blocked': {
        this._allowed.has(role.id) ? this._blocked.delete(role.id) : this._blocked.set(role.id, role);
        this._settings.updateChannelRoles(this.channel.id, role.id, 'blocked');
        await this._settings.save();
        await this.client.redis.helpers.clearCachedGuild(this.guild);
        return this._blocked.has(role.id);
      }
      default: {
        throw new Error('InvalidRoleType');
      }
    }
  }

  private async _addRoles(roles: Array<string>, collection: Collection<Role>): Promise<void> {
    for (const r of roles) {
      const role = this.guild.roles.get(r);
      if (!role) continue;
      collection.set(r, role);
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
