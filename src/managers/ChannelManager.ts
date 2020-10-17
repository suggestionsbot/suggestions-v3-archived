import SuggestionChannel from '../structures/SuggestionChannel';
import { Collection } from '@augu/immutable';
import SuggestionsClient from '../structures/Client';
import { SuggestionGuild } from '../types';

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

  public getGuildBucket(guild: SuggestionGuild): Array<SuggestionChannel> {
    return this.filter(c => c.guild.id === (typeof guild === 'object' ? guild.id : guild));
  }
}
