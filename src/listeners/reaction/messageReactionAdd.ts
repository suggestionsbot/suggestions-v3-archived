import { Member, Message, PartialEmoji } from 'eris';

import Event from '../../structures/core/Event';
import SuggestionsClient from '../../structures/core/Client';
import Logger from '../../utils/Logger';
import MessageUtils from '../../utils/MessageUtils';
import Util from '../../utils/Util';
import emojis from '../../utils/Emojis';
import SuggestionChannel from '../../structures/suggestions/SuggestionChannel';

export default class extends Event {
  constructor(client: SuggestionsClient, name: string) {
    super(client, name);
  }

  public async run(message: Dictionary, emoji: PartialEmoji, reactor: Member): Promise<any> {
    const emojiObj = emoji.id ? Util.getReactionString(emoji) : emoji.name;
    const suggestionMessage: Message|undefined = !message.channel.messages.has(message.id) ? await message.channel.getMessage(message.id) : undefined;
    if (reactor.user.bot) return;

    if (suggestionMessage && suggestionMessage.guild) {
      try {
        const settings = await this.client.database.helpers.guild.getGuild(message.guildID, true);
        const channel = settings.channels.find(c => c.id === message.channel.id);
        if (!channel) return;
        const sChannel = <SuggestionChannel>(this.client.suggestionChannels.get(message.channel.id) ??
            await this.client.suggestionChannels.fetchChannel(suggestionMessage.guild, channel.id, channel.type))!;

        const suggestion = await this.client.database.helpers.suggestion.getSuggestion(message.id);
        if (!suggestion) return;

        const restrictVote = suggestion && settings.restrictVoting;
        const voteEmojis = [...emojis, ...settings.emojis];
        const emojiSet = voteEmojis[sChannel.emojis].emojis
          .map(s => s && (Util.parseEmoji(s)!.id ?? Util.parseEmoji(s)!.name));
        if (restrictVote && !emojiSet.includes(emoji.id ?? emoji.name))
          return await suggestionMessage.removeReaction(emojiObj, reactor.id);

        const selfVote = suggestion && (suggestion.author.id === reactor.id) && settings.selfVoting;
        /**
         * Unique voting (uniqueVoting):
         * true: multiple reactions can't be added
         * false: multiple reactions can be added
         */
        const uniqueVote = suggestion && (suggestion.author.id === reactor.id) && settings.uniqueVoting;
        if (!selfVote) await suggestionMessage.removeReaction(emojiObj, reactor.id);

        if (uniqueVote) {
          const users = await Promise.all(Object.keys(suggestionMessage.reactions).map((s: string) => {
            return suggestionMessage.getReaction(s).then(u => u.map(u => u.id));
          })).then(res => res.flat());

          if (users.filter(u => u === reactor.id).length > 1) await suggestionMessage.removeReaction(emojiObj, reactor.id);
        }
      } catch (error) {
        Logger.error(error.stack);
        return MessageUtils.error(this.client, suggestionMessage, error.message, true);
      }
    }
  }
}
