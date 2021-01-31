import Event from '../../structures/core/Event';
import SuggestionsClient from '../../structures/core/Client';
import Suggestion from '../../structures/suggestions/Suggestion';
import Logger from '../../utils/Logger';
import ActionLog from '../../structures/actions/ActionLog';
import { SuggestionChannelType } from '../../types';
import ActionLogChannel from '../../structures/actions/ActionLogChannel';
import MessageUtils from '../../utils/MessageUtils';

export default class extends Event {
  constructor(client: SuggestionsClient, name: string) {
    super(client, name);
  }

  public async run(suggestion: Suggestion): Promise<any> {
    const actionlogs = suggestion.channel.settings.channels.find(c => c.type === SuggestionChannelType.ACTION_LOGS);
    if (!actionlogs) throw new Error('NoActionLogChannel');
    const actionlogsChannel = <ActionLogChannel>(this.client.suggestionChannels.get(actionlogs.id) ??
      await this.client.suggestionChannels.fetchChannel(suggestion.guild, actionlogs.id, SuggestionChannelType.ACTION_LOGS));

    const embed = MessageUtils.defaultEmbed()
      .setAuthor(`Suggestion Created | ${suggestion.author.tag}`, suggestion.author.avatarURL)
      .addField('Channel', suggestion.channel.channel.mention, true)
      .addField('Author', suggestion.author.mention, true)
      .addField('Suggestion ID', `[\`${suggestion.id(true)}\`](${suggestion.link})`, true)
      .setFooter(`Author ID: ${suggestion.author.id}`)
      .setTimestamp();

    const actionlog = new ActionLog(this.client)
      .setExecutor(suggestion.author)
      .setChannel(actionlogsChannel)
      .setGuild(suggestion.guild)
      .setSettings(suggestion.channel.settings)
      .setType('SUGGESTION_CREATED')
      .setEmbedData(embed);

    await actionlog.post().catch(e => Logger.error('SUGGESTION_CREATE', e));
  }
}
