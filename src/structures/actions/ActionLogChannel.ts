import { Guild, GuildTextableChannel } from 'eris';

import BaseChannel from '../core/BaseChannel';
import { GuildSchema, SuggestionChannelType } from '../../types';
import SuggestionsClient from '../core/Client';
import ActionLogManager from '../../managers/ActionLogManager';

export default class ActionLogChannel extends BaseChannel {
  readonly #actionlogs: ActionLogManager;
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
    this.#actionlogs = new ActionLogManager(this);
    this.#count = 0;
  }

  public get actionlogs(): ActionLogManager {
    return this.#actionlogs;
  }

  public get count(): number {
    return this.#count;
  }

  public get initialized(): boolean {
    return this.#initialized;
  }

  async init(): Promise<void> {
    if (this.#initialized) throw new Error('ChannelAlreadyInitialized');
    this.type = this.data!.type;
    this.#count = await this.client.redis.helpers.getChannelCount(this.guild, this.type, this.channel);
    this.#initialized = true;
  }
}
