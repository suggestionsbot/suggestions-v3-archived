import { Guild, GuildTextableChannel } from 'eris';
import { Collection } from '@augu/immutable';

import SuggestionsClient from '../structures/core/Client';
import SuggestionChannel from '../structures/suggestions/SuggestionChannel';
import { SuggestionChannelType, SuggestionGuild } from '../types';
import BaseChannel from '../structures/core/BaseChannel';
import ActionLogChannel from '../structures/actions/ActionLogChannel';

export default class ChannelManager extends Collection<BaseChannel> {
  constructor(public client: SuggestionsClient) {
    super();
  }

  public async addChannel(channel: BaseChannel): Promise<void> {
    this.set(channel.channel.id, channel);
  }

  public removeChannel(channel: SuggestionChannel): boolean {
    this.delete(channel.channel.id);
    return this.has(channel.channel.id);
  }

  public getGuildBucket(guild: SuggestionGuild, type?: SuggestionChannelType): Array<BaseChannel> {
    return this.filter(c =>
      (c.guild.id === (typeof guild === 'object' ? guild.id : guild)) &&
      (type ? c.type === type : true)
    );
  }

  public async fetchChannel(guild: Guild, channelID?: string|null, type?: SuggestionChannelType|null): Promise<BaseChannel | undefined> {
    if (channelID && this.has(channelID)) return this.get(channelID);
    const settings = await this.client.redis.helpers.getCachedGuild(guild.id);
    const dbChannel = channelID ? settings.channels.find(c => c.id === channelID) : settings.channels.filter(c => c.type === type)[0];
    if (!dbChannel) throw new Error('NoChannelInDatabase');

    const text = <GuildTextableChannel>this.client.getChannel(dbChannel.id);
    if (!text) throw new Error('TextChannelNotFound');

    switch (dbChannel.type) {
      case SuggestionChannelType.SUGGESTIONS: case SuggestionChannelType.LOGS: {
        const channel = new SuggestionChannel(this.client, guild, dbChannel.type, text, settings);
        await channel.init();
        this.client.suggestionChannels.addChannel(channel);
        return channel;
      }
      case SuggestionChannelType.ACTION_LOGS: {
        const channel = new ActionLogChannel(this.client, guild, dbChannel.type, text, settings);
        await channel.init();
        this.client.suggestionChannels.addChannel(channel);
        return channel;
      }
    }
  }
}
