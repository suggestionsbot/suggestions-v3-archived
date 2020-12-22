import Event from '../../structures/core/Event';
import SuggestionsClient from '../../structures/core/Client';
import Suggestion from '../../structures/suggestions/Suggestion';
import Logger from '../../utils/Logger';
import ModLog from '../../structures/moderation/ModLog';
import { SuggestionChannelType } from '../../types';
import ModLogChannel from '../../structures/moderation/ModLogChannel';

export default class extends Event {
  constructor(client: SuggestionsClient, name: string) {
    super(client, name);
  }

  public async run(suggestion: Suggestion): Promise<any> {
    Logger.event('SUGGESTION_CREATE', `the suggestion content: ${suggestion.suggestion}`);

    const modlogChannel = <ModLogChannel>this.client.suggestionChannels
      .getGuildBucket(suggestion.guild, SuggestionChannelType.MOD_LOGS)[0];
    if (!modlogChannel) throw new Error('NoModLogChannel');

    const embedData = {
      channel: suggestion.channel.id,
      author: suggestion.author.id,
      suggestion: suggestion.id(true)
    };

    const modlog = new ModLog(this.client)
      .setUser(suggestion.author)
      .setChannel(modlogChannel)
      .setGuild(suggestion.guild)
      .setSettings(suggestion.channel.settings)
      .setType('SUGGESTION_CREATED')
      .setEmbedData(embedData);

    await modlog.post().catch(e => Logger.error('SUGGESTION_CREATE', e));
  }
}
