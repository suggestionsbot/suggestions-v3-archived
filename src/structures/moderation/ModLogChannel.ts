import { Guild, GuildTextableChannel } from 'eris';

import BaseChannel from '../core/BaseChannel';
import { GuildSchema, SuggestionChannelType } from '../../types';
import SuggestionsClient from '../core/Client';
import ModLogManager from '../../managers/ModLogManager';

export default class ModLogChannel extends BaseChannel {
  readonly #modlogs: ModLogManager;
  #initialized: boolean;
  #count: number;

  constructor(
    client: SuggestionsClient,
    guild: Guild,
    type: SuggestionChannelType,
    channel: GuildTextableChannel,
    settings: GuildSchema
  ) {
    super(client, guild, type, channel, settings);

    this.#initialized = false;
    this.#modlogs = new ModLogManager(this);
    this.#count = 0;
  }

  public get modlogs(): ModLogManager {
    return this.#modlogs;
  }

  public get count(): number {
    return this.#count;
  }

  public get initialized(): boolean {
    return this.#initialized;
  }

  async init(): Promise<void> {
    if (this.#initialized) return;
    this.type = this.data!.type;
    this.#count = await this.client.redis.helpers.getChannelCount(this.guild, this.type, this.channel);
    this.#initialized = true;
  }
}
