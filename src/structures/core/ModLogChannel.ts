import { Guild, GuildTextableChannel } from 'eris';

import BaseChannel from './BaseChannel';
import { GuildSchema, SuggestionChannelType } from '../../types';
import SuggestionsClient from './Client';

export default class ModLogChannel extends BaseChannel {
  public initialized: boolean;

  constructor(
    client: SuggestionsClient,
    guild: Guild,
    type: SuggestionChannelType,
    channel: GuildTextableChannel,
    settings: GuildSchema
  ) {
    super(client, guild, type, channel, settings);

    this.initialized = false;
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    this.initialized = true;
  }
}
