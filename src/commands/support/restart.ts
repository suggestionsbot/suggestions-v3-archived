import Command from '../../structures/core/Command';
import SuggestionsClient from '../../structures/core/Client';
import { CommandCategory, CommandNextFunction } from '../../types';
import CommandContext from '../../structures/commands/Context';
import MessageUtils from '../../utils/MessageUtils';
import Logger from '../../utils/Logger';

export default class RestartCommand extends Command {

  constructor(client: SuggestionsClient) {
    super(client);

    this.name = 'restart';
    this.category = CommandCategory.SUPPORT;
    this.description = 'Restart a single cluster, multiple clusters or all clusters.';
    this.usages = [
      'restart cluster <id> [...id]',
      'restart cluster all',
    ];
    this.examples = [
      'restart 3',
      'restart 3 4 7',
      'restart all'
    ];
    this.supportOnly = true;
    this.guildOnly = false;
  }

  async runPreconditions(ctx: CommandContext, next: CommandNextFunction): Promise<any> {
    const arg = ctx.args.get(0)?.toLowerCase();
    if (!arg) return MessageUtils.error(this.client, ctx.message,
      'Please provide a valid argument!');

    if (arg && isNaN(+arg) && (arg.toLowerCase() !== 'all'))
      return MessageUtils.error(this.client, ctx.message, `\`${arg}\` is not a number`);
    else if (arg.toLowerCase() === 'all') return next();

    next();
  }

  async run(ctx: CommandContext): Promise<any> {
    const arg = ctx.args.get(0)?.toLowerCase();

    try {
      if (arg === 'all') this.client.cluster.ipc.broadcast('restart');
      else this.client.cluster.launchModule?.restartCluster(+arg);

      await ctx.embed(
        MessageUtils.defaultEmbed()
          .setDescription(`Restarting ${arg === 'all' ? 'all clusters' : `cluster \`${arg}\``}.`)
          .setFooter(`ID: ${ctx.sender.id}`)
          .setTimestamp()
      );
    } catch (e) {
      Logger.error(`CMD:${this.name.toUpperCase()}`, e);
      return MessageUtils.error(this.client, ctx.message, e.message, true);
    }
  }
}
