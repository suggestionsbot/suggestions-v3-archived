import Command from '../../structures/core/Command';
import SuggestionsClient from '../../structures/core/Client';
import CommandContext from '../../structures/commands/Context';
import { CommandCategory } from '../../types';
import Logger from '../../utils/Logger';
import MessageUtils from '../../utils/MessageUtils';
import Util from '../../utils/Util';

export default class ZendayaCommand extends Command {
  constructor(client: SuggestionsClient) {
    super(client);

    this.name = 'zendaya';
    this.category = CommandCategory.OWNER;
    this.description = 'Oh shit it\'s Zendaya!';
    this.ownerOnly = true;
    this.guildOnly = false;
  }

  async run(ctx: CommandContext): Promise<any> {
    try {
      const { data } = await Util.getGiphy().random('@zendaya');
      const url = data.images.original.url;
      return ctx.embed({
        color: 0xFF69B4,
        image: { url }
      });
    } catch (e) {
      Logger.error('GIPHY', e.stack);
      return MessageUtils.error(this.client, ctx.message, `Error searching **@zendaya** on Giphy: **${e.message}**`);
    }
  }
}
