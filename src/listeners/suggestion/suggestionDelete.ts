import Event from '../../structures/core/Event';
import SuggestionsClient from '../../structures/core/Client';
import Suggestion from '../../structures/suggestions/Suggestion';
import { SuggestionChannelType } from '../../types';
import ActionLogChannel from '../../structures/actions/ActionLogChannel';
import MessageUtils from '../../utils/MessageUtils';
import { User } from 'eris';
import ActionLog from '../../structures/actions/ActionLog';
import Logger from '../../utils/Logger';
import CodeBlock from '../../utils/CodeBlock';
import Util from '../../utils/Util';
import SuggestionEmbeds from '../../utils/SuggestionEmbeds';

export default class extends Event {
  constructor(client: SuggestionsClient, name: string,) {
    super(client, name);
  }
  // TODO: DM user when suggestion is deleted (account for silent and config value)
  async run(suggestion: Suggestion, executor: User, reason?: string): Promise<any> {
    const actionlogs = suggestion.channel.settings.channels.find(c => c.type === SuggestionChannelType.ACTION_LOGS);
    if (!actionlogs) throw new Error('NoActionLogChannel');
    const actionlogsChannel = <ActionLogChannel>(this.client.suggestionChannels.get(actionlogs.id) ??
        await this.client.suggestionChannels.fetchChannel(suggestion.guild, actionlogs.id, SuggestionChannelType.ACTION_LOGS));

    const changes = [];
    if (reason) changes.push({ key: 'reason', before: undefined, after: reason });

    const content = Util.cleanCodeBlock(suggestion.suggestion!);

    const suggestionContent = new CodeBlock()
      .setContent(Util.escapeMarkdown(content));

    const embed = MessageUtils.defaultEmbed()
      .setAuthor(`Suggestion Deleted | ${executor.tag}`, executor.avatarURL)
      .setDescription(suggestionContent.toString())
      .addField('Channel', suggestion.channel.channel.mention, true)
      .addField('Author', suggestion.author.mention, true)
      .addField('Suggestion ID', Util.boldCode(suggestion.id(true)), true)
      .setFooter(`Author ID: ${suggestion.author.id}`)
      .setTimestamp();

    const dmEmbed = SuggestionEmbeds.suggestionDeletedDM({
      id: suggestion.id(true),
      suggestion: suggestionContent.toString(),
      guild: suggestion.guild,
      author: suggestion.author,
      executor,
      reason
    });

    if (reason) embed.fields.push({
      name: 'Reason',
      value: reason,
      inline: true
    });

    const actionlog = new ActionLog(this.client)
      .setExecutor(executor)
      .setTarget(suggestion.author)
      .setChannel(actionlogsChannel)
      .setGuild(suggestion.guild)
      .setSettings(suggestion.channel.settings)
      .setType('SUGGESTION_DELETED')
      .setEmbedData(embed)
      .setChanges(changes);

    await actionlog.post().catch(e => Logger.error('SUGGESTION_DELETE', e));
    suggestion.author.createMessage({ embed: dmEmbed }).catch(() => {});
  }
}
