import Command from '../../structures/core/Command';
import SuggestionsClient from '../../structures/core/Client';
import Context from '../../structures/commands/Context';
import { CommandCategory } from '../../types';
import MessageUtils from '../../utils/MessageUtils';
import Util from '../../utils/Util';
import Logger from '../../utils/Logger';
import Suggestion from '../../structures/suggestions/Suggestion';
import SuggestionChannel from '../../structures/suggestions/SuggestionChannel';

export default class SuggestCommand extends Command {
  constructor(client: SuggestionsClient) {
    super(client);

    this.name = 'suggest';
    this.category = CommandCategory.SUGGESTIONS;
    this.description = 'Submit a new suggestion in a suggestion channel.';
    this.aliases = ['suggestion'];
    this.usages = [
      'suggest <suggestion>',
      'suggestion [channel] <suggestion>'
    ];
    this.examples = [
      'suggest can we add more colorful roles?',
      'suggest #video-ideas can you do a video on how to water cool?',
    ];
    this.throttles = {
      usages: 3,
      max: 5,
      duration: 60
    };
    this.botPermissions = ['manageMessages', 'embedLinks', 'addReactions', 'externalEmojis'];
    this.guarded = false;
    this.active = false;
    this.conditions = ['suggestionChannel'];
  }

  async run(ctx: Context): Promise<any> {
    const argCheck = Util.getChannel(ctx.args.get(0), ctx.guild!);
    const channels = ctx.settings!.channels.map(c => c.id);
    const isSuggestionChannel = channels.includes(ctx.channel.id);
    // TODO: Make sure to explicity note that if the command is ran in a suggestion channel, the suggestion will be sent in that channel, regardless of the argument
    const channel = isSuggestionChannel ? ctx.channel :
      Util.getChannel(channels.length <= 1 ? channels[0] : ctx.args.get(0), ctx.guild!)!;
    const sChannel = <SuggestionChannel>this.client.suggestionChannels.get(channel.id)!;
    const suggestion = argCheck ? ctx.args.slice(1).join(' ') : ctx.args.join(' ');

    try {
      const newSuggestion = new Suggestion(this.client)
        .setAuthor(ctx.sender)
        .setChannel(sChannel)
        .setCommandMessage(ctx.message)
        .setGuild(ctx.guild!)
        .setSuggestion(suggestion)
        .setSettings(ctx.settings!)
        .setProfile(ctx.profile);

      await newSuggestion.post();

      MessageUtils.delete(ctx.message, { timeout: 5000 });
    } catch (e) {
      Logger.error(e.stack);
      return MessageUtils.error(ctx.client, ctx.message, e.message, true);
    }
  }
}
