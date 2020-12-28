import { Guild, GuildTextableChannel } from 'eris';

import SuggestionsClient from './Client';
import { GuildSchema, SuggestionChannelType, SuggestionChannel } from '../../types';
import ChannelManager from '../../managers/ChannelManager';

export default abstract class BaseChannel {
  protected constructor(
    public client: SuggestionsClient,
    public guild: Guild,
    public type: SuggestionChannelType,
    public channel: GuildTextableChannel,
    public settings: GuildSchema
  ) {}

  public get data(): SuggestionChannel | undefined {
    return this.settings.channels.find(c => c.id === this.channel.id);
  }

  public get manager(): ChannelManager {
    return this.client.suggestionChannels;
  }

  public get id(): string {
    return this.channel.id;
  }

  abstract async init(): Promise<void>;
}
