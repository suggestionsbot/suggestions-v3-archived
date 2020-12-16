import Command from '../../structures/core/Command';
import SuggestionsClient from '../../structures/core/Client';
import CommandContext from '../../structures/commands/Context';
import { CommandCategory } from '../../types';
import Logger from '../../utils/Logger';
import MessageUtils from '../../utils/MessageUtils';
import Util from '../../utils/Util';

export default class ArianaCommand extends Command {
  constructor(client: SuggestionsClient) {
    super(client);

    this.name = 'ariana';
    this.category = CommandCategory.OWNER;
    this.description = 'Much love to Ariana Grande <3';
    this.ownerOnly = true;
    this.guildOnly = false;
  }

  async run(ctx: CommandContext): Promise<any> {
    try {
      const { data } = await Util.getGiphy().random('@arianagrande');
      const url = data.images.original.url;
      return ctx.embed({
        color: 0xCCCCFF,
        image: { url }
      });
    } catch (e) {
      Logger.error('GIPHY', e.stack);
      return MessageUtils.error(this.client, ctx.message, `Error searching **@arianagrade** on Giphy: **${e.message}**`);
    }
  }
}
