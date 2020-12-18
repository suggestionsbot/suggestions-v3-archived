import SuggestionChannel from '../structures/suggestions/SuggestionChannel';
import { Collection } from '@augu/immutable';
import SuggestionsClient from '../structures/core/Client';
import { SuggestionChannelType, SuggestionGuild } from '../types';

export default class ChannelManager extends Collection<SuggestionChannel> {
  constructor(public client: SuggestionsClient) {
    super();
  }

  public async addChannel(channel: SuggestionChannel): Promise<void> {
    this.set(channel.channel.id, channel);
  }

  public removeChannel(channel: SuggestionChannel): boolean {
    this.delete(channel.channel.id);
    return this.has(channel.channel.id);
  }

  public getGuildBucket(guild: SuggestionGuild, type?: SuggestionChannelType): Array<SuggestionChannel> {
    return this.filter(c =>
      (c.guild.id === (typeof guild === 'object' ? guild.id : guild)) &&
      (type ? c.type === type : true)
    );
  }
}
