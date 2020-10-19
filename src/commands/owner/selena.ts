import Command from '../../structures/Command';
import SuggestionsClient from '../../structures/Client';
import CommandContext from '../../structures/Context';
import { CommandCategory } from '../../types';
import Logger from '../../utils/Logger';
import MessageUtils from '../../utils/MessageUtils';
import Util from '../../utils/Util';

export default class SelenaCommand extends Command {
  constructor(client: SuggestionsClient) {
    super(client);

    this.name = 'selena';
    this.category = CommandCategory.OWNER;
    this.description = 'Selena the OG!';
    this.ownerOnly = true;
    this.guildOnly = false;
  }

  async run(ctx: CommandContext): Promise<any> {
    try {
      const { data } = await Util.getGiphy().random('@selenagomez');
      const url = data.images.original.url;
      return ctx.embed({
        color: 0x32CD32,
        image: { url }
      });
    } catch (e) {
      Logger.error('GIPHY', e.stack);
      return MessageUtils.error(this.client, ctx.message, `Error searching **@selenagomez** on Giphy: **${e.message}**`);
    }
  }
}
