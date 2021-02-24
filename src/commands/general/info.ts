import dayjs from 'dayjs';
import { VERSION as erisVersion } from 'eris';

import Command from '../../structures/core/Command';
import SuggestionsClient from '../../structures/core/Client';
import MessageEmbed from '../../utils/MessageEmbed';
import Logger from '../../utils/Logger';

import { description, version } from '../../../package.json';
import MessageUtils from '../../utils/MessageUtils';
import { CommandCategory } from '../../types';
import Context from '../../structures/commands/Context';
import Util from '../../utils/Util';
import { ClusterManagerStats } from '@nedbot/sharder';

export default class InfoCommand extends Command {
  constructor(client: SuggestionsClient) {
    super(client);

    this.name = 'info';
    this.category = CommandCategory.GENERAL;
    this.description = 'View information about the bot and it\'s global statistics.';
    this.aliases = ['botinfo'];
    this.guildOnly = false;
  }

  async run(ctx: Context): Promise<any> {
    const { colors: { main }, owners: ownerIDs } = this.client.config;

    try {
      const owners: Array<string> = ownerIDs.map(o => `<@${o}>`);
      const created = dayjs(this.client.user.createdAt).format('MM/DD/YYYY');
      const cluster = this.client.cluster.id;
      const shard = ctx.shard!.id;

      const promises: [Promise<ClusterManagerStats>, Promise<number>, Promise<number>] = [
        this.client.redis.helpers?.getStats() ?? null,
        this.client.redis.helpers?.getGlobalSuggestionCount() ?? null,
        this.client.redis.helpers?.getGlobalCommandCount() ?? null,
      ];

      const [stats, suggestions, commands] = await Promise.all(promises);

      const embed = new MessageEmbed()
        .setTitle(`${this.client.user.username} [v${version} / ${Util.lastCommitHash()}]`)
        .setURL(this.client.config.website)
        .setDescription(description)
        .setColor(main)
        .setThumbnail(this.client.user.dynamicAvatarURL('png', 2048))
        .addField('Information', [
          `**❯ Creator:** ${owners.join(' ')}`,
          `**❯ Created:** \`${created}\``,
          `**❯ GitHub:** [Link](${this.client.config.github})`,
          `**❯ Discord:** [Link](${this.client.config.discord})`,
          `**❯ Website:** [Link](${this.client.config.website})`,
          `**❯ Invite:** [Invite me](${this.client.config.invite})`
        ].join('\n'), true)
        .addField('Statistics', [
          `**❯ Guilds:** \`${stats?.guilds ?? 0}\``,
          `**❯ Users:** \`${stats?.users ?? 0}\``,
          `**❯ Suggestions:** \`${suggestions ?? 0}\``,
          `**❯ Commands:** \`${commands ?? 0}\``,
          `**❯ Memory:** \`${Math.round(stats?.ramUsage ?? 0)} MB\``
        ].join('\n'), true)
        .addField('Versions', [
          `**❯ Version:** \`v${version}\``,
          `**❯ Node:** \`${process.version}\``,
          `**❯ Eris:** \`v${erisVersion}\``,
        ].join('\n'), true)
        .setFooter(`© 2021 Anthony Collier | PID ${process.pid} | Cluster ${cluster} | Shard ${shard}`);

      await ctx.embed(embed);
    } catch (e) {
      Logger.error(`CMD:${this.name.toUpperCase()}`, e);
      return MessageUtils.error(this.client, ctx.message, e.message, true);
    }
  }
}
