import Command from '../../structures/Command';
import SuggestionsClient from '../../structures/Client';
import { CommandCategory, CommandNextFunction } from '../../types';
import CommandContext from '../../structures/Context';
import MessageUtils from '../../utils/MessageUtils';
import { oneLine } from 'common-tags';
import Logger from '../../utils/Logger';

export default class RestartCommand extends Command {

  constructor(client: SuggestionsClient) {
    super(client);

    this.name = 'restart';
    this.category = CommandCategory.SUPPORT;
    this.description = 'Restart a single shard/cluster, multiple shards/clusters or all shards/clusters.';
    this.usages = [
      'restart shard <id> [id] [...id]',
      'restart shard all',
      'restart cluster <id> [id] [...id]',
      'restart cluster all',
    ];
    this.examples = [
      'restart shard 14',
      'restart cluster 3',
      'restart shard 8 9 10 11',
      'restart cluster 3 4 7',
      'restart shard all',
      'restart cluster all'
    ];
    this.supportOnly = true;
    this.guildOnly = false;
  }

  async runPreconditions(ctx: CommandContext, next: CommandNextFunction): Promise<any> {
    const option = ctx.args.get(0);
    const arg = ctx.args.get(1);
    if (!option) return MessageUtils.error(this.client, ctx.message,
      'Please provide a valid option!');

    if (!['shard', 'cluster'].includes(option.toLowerCase()) || (['shard', 'cluster'].includes(option.toLowerCase()) && !arg))
      return MessageUtils.error(this.client, ctx.message, oneLine`Valid options: \`${ctx.prefix + this.name} shard <id|all>\` 
        or \`${ctx.prefix + this.name} cluster <id|all>\``);

    if (arg && isNaN(+arg) && (arg.toLowerCase() !== 'all'))
      return MessageUtils.error(this.client, ctx.message, `\`${arg}\` is not a number`);
    else if (arg.toLowerCase() === 'all') next();

    next();
  }

  async run(ctx: CommandContext): Promise<any> {
    const option = ctx.args.get(0).toLowerCase();
    const arg = ctx.args.get(1).toLowerCase();

    switch (option) {
      // case 'shard': {
      //
      //   break;
      // }
      case 'cluster': {
        try {
          await ctx.embed(
            MessageUtils.defaultEmbed()
              .setDescription(`Restarting ${arg === 'all' ? 'all clusters' : `cluster \`${arg}\``}.`)
              .setFooter(`ID: ${ctx.sender.id}`)
              .setTimestamp()
          );

          if (arg === 'all') {
            return this.client.redis.helpers.getStats().then(data => {
              data.clusters.map(c => {
                this.client.base!.restartCluster(c.cluster);
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                setTimeout(() => {}, 3000);
              });
            });
          } else this.client.base!.restartCluster(+arg);

        } catch (e) {
          Logger.error(`CMD:${this.name.toUpperCase()}`, e);
          return MessageUtils.error(this.client, ctx.message, e.message, true);
        }
        break;
      }
    }
  }
}
