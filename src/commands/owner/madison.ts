import Command from '../../structures/core/Command';
import SuggestionsClient from '../../structures/core/Client';
import CommandContext from '../../structures/commands/Context';
import { CommandCategory } from '../../types';
import Logger from '../../utils/Logger';
import MessageUtils from '../../utils/MessageUtils';
import Util from '../../utils/Util';

export default class MadisonCommand extends Command {
  constructor(client: SuggestionsClient) {
    super(client);

    this.name = 'madison';
    this.category = CommandCategory.OWNER;
    this.description = 'Simping for Madion Beer?';
    this.ownerOnly = true;
    this.guildOnly = false;
  }

  async run(ctx: CommandContext): Promise<any> {
    try {
      const { data } = await Util.getGiphy().random('@madisonbeer');
      const url = data.images.original.url;
      return ctx.embed({
        color: 0x670A0A,
        image: { url }
      });
    } catch (e) {
      Logger.error('GIPHY', e.stack);
      return MessageUtils.error(this.client, ctx.message, `Error searching **@madisonbeer** on Giphy: **${e.message}**`);
    }
  }
}
