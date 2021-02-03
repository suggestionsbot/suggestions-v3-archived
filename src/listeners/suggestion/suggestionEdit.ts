// TODO: Turn into suggestionUpdate to handle all sorts of suggestion updates
import Event from '../../structures/core/Event';
import SuggestionsClient from '../../structures/core/Client';
import Suggestion from '../../structures/suggestions/Suggestion';
import { User } from 'eris';
import { SuggestionChannelType } from '../../types';
import ActionLogChannel from '../../structures/actions/ActionLogChannel';
import CodeBlock from '../../utils/CodeBlock';
import Util from '../../utils/Util';
import MessageUtils from '../../utils/MessageUtils';
import ActionLog from '../../structures/actions/ActionLog';
import Logger from '../../utils/Logger';
import SuggestionEmbeds from '../../utils/SuggestionEmbeds';

export default class extends Event {
  constructor(client: SuggestionsClient, name: string) {
    super(client, name);
  }

  async run(suggestion: Suggestion, executor: User, edit: string, reason: string): Promise<any> {
    const actionlogs = suggestion.channel.settings.channels.find(c => c.type === SuggestionChannelType.ACTION_LOGS);
    if (!actionlogs) throw new Error('NoActionLogChannel');
    const actionlogsChannel = <ActionLogChannel>(this.client.suggestionChannels.get(actionlogs.id) ??
        await this.client.suggestionChannels.fetchChannel(suggestion.guild, actionlogs.id, SuggestionChannelType.ACTION_LOGS));

    const changes = [];
    if (reason) changes.push({ key: 'reason', before: undefined, after: reason });

    const [oldContent, newContent] = [suggestion.edits[1].edit, edit];

    const embed = MessageUtils.defaultEmbed()
      .setAuthor(`Suggestion Edited | ${executor.tag}`, executor.avatarURL)
      .setDescription(newContent)
      .addField('Channel', suggestion.channel.channel.mention, true)
      .addField('Author', suggestion.author.mention, true)
      .addField('Suggestion ID', `[${Util.boldCode(suggestion.id(true))}](${suggestion.link})`, true)
      .setFooter(`Author ID: ${suggestion.author.id}`)
      .setTimestamp();

    const dmEmbed = SuggestionEmbeds.suggestionEditedDM({
      id: suggestion.id(true),
      link: suggestion.link,
      suggestion: { before: oldContent, after: newContent },
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
      .setType('SUGGESTION_EDITED')
      .setEmbedData(embed)
      .setChanges(changes);

    actionlog.post().catch(e => Logger.error('SUGGESTION_EDITED', e));
    suggestion.author.createMessage({ embed: dmEmbed }).catch(() => {});
  }
}
