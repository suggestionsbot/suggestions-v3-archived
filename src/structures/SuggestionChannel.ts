import { GuildTextableChannel, Role, TextChannel } from 'eris';
import { Collection } from '@augu/immutable';

import {
  GuildSchema,
  SuggestionChannelType,
  SuggestionSchema,
  SuggestionChannel as SuggestionChannelObj,
} from '../types';
import SuggestionsClient from './Client';

export interface SuggestionObject {
  channel: TextChannel;
  data: SuggestionSchema;
}

export default abstract class SuggestionChannel {
  private readonly _suggestions: Collection<SuggestionObject>;
  private readonly _roles: Collection<Role>;
  private _locked?: boolean;


  protected constructor(
    public client: SuggestionsClient,
    public type: SuggestionChannelType,
    private _channel: GuildTextableChannel,
    private _settings: GuildSchema
  ) {
    this._suggestions = new Collection<SuggestionObject>();
    this._roles = new Collection<Role>();
  }

  private async _addRoles(): Promise<void> {
    for (const r of this._settings.staffRoles) {
      const role = this._channel.guild.roles.get(r);
      if (!role) continue;
      this._roles.set(r, role);
    }
  }

  private async _addSuggestions(): Promise<void> {
    const suggestions = await this.client.redis.helpers.getCachedSuggestions(this._channel.guild);
    if (!suggestions) return;
    for (const suggestion of suggestions) {
      this._suggestions.set(suggestion.id, {
        channel: this.channel,
        data: suggestion
      });
    }
  }

  public get data(): SuggestionChannelObj|undefined {
    return this._settings.channels.find(c => c.channel === this._channel.id);
  }

  public get suggestions(): Collection<SuggestionObject> {
    return this._suggestions;
  }

  public get roles(): Collection<Role> {
    return this._roles;
  }

  public get channel(): TextChannel {
    return this._channel;
  }

  public async init(): Promise<void> {
    this._addRoles();
    this._addSuggestions();
  }

  public async createSuggestion(suggestion: Record<string, unknown>): Promise<SuggestionSchema|void> {
    return;
  }

  public async getSuggestion(id: string): Promise<SuggestionSchema|undefined> {
    return undefined;
  }

  public async updateSuggestion(id: string, data: Record<string, unknown>): Promise<SuggestionSchema|undefined> {
    return undefined;
  }

  public async deleteSuggestion(id: string): Promise<boolean> {
    return false;
  }

  public async lock(locked?: boolean): Promise<boolean> {
    this._locked = locked;
    this._settings.updateChannel(this.channel.id, { locked });
    await this._settings.save();
    await this.client.redis.helpers.clearCachedGuild(this._channel.guild);
    return false;
  }
}
