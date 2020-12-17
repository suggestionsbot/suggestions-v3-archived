import SuggestionsClient from './Client';
import { Guild, GuildTextableChannel } from 'eris';
import { GuildSchema, SuggestionChannelType, SuggestionChannel } from '../../types';
import ChannelManager from '../../managers/ChannelManager';

export default abstract class BaseChannel {
  abstract initialized: boolean;

  protected constructor(
    public client: SuggestionsClient,
    public guild: Guild,
    public type: SuggestionChannelType,
    public channel: GuildTextableChannel,
    public settings: GuildSchema
  ) {}

  public get data(): SuggestionChannel | undefined {
    return this.settings.channels.find(c => c.channel === this.channel.id);
  }

  public get manager(): ChannelManager {
    return this.client.suggestionChannels;
  }

  abstract async init(): Promise<void>;
}
