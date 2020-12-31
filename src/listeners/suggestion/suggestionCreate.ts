import Event from '../../structures/core/Event';
import SuggestionsClient from '../../structures/core/Client';
import Suggestion from '../../structures/suggestions/Suggestion';
import Logger from '../../utils/Logger';
import ModLog from '../../structures/moderation/ModLog';
import { SuggestionChannelType } from '../../types';
import ModLogChannel from '../../structures/moderation/ModLogChannel';
import MessageUtils from '../../utils/MessageUtils';

export default class extends Event {
  constructor(client: SuggestionsClient, name: string) {
    super(client, name);
  }

  public async run(suggestion: Suggestion): Promise<any> {
    const modlogChannel = <ModLogChannel>this.client.suggestionChannels
      .getGuildBucket(suggestion.guild, SuggestionChannelType.MOD_LOGS)[0] ??
      await this.client.suggestionChannels.fetchChannel(suggestion.guild, null, SuggestionChannelType.MOD_LOGS);
    if (!modlogChannel) throw new Error('NoModLogChannel');

    const embed = MessageUtils.defaultEmbed()
      .setAuthor(`Suggestion Created | ${suggestion.author.tag}`, suggestion.author.avatarURL)
      .addField('Channel', suggestion.channel.channel.mention, true)
      .addField('Author', suggestion.author.mention, true)
      .addField('Suggestion ID', `[\`${suggestion.id(true)}\`](${suggestion.link})`, true)
      .setFooter(`User ID: ${suggestion.author.id}`)
      .setTimestamp();

    const modlog = new ModLog(this.client)
      .setUser(suggestion.author)
      .setChannel(modlogChannel)
      .setGuild(suggestion.guild)
      .setSettings(suggestion.channel.settings)
      .setType('SUGGESTION_CREATED')
      .setEmbedData(embed);

    await modlog.post().catch(e => Logger.error('SUGGESTION_CREATE', e));
  }
}
