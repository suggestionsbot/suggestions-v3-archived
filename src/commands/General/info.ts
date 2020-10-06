import { GuildChannel } from 'eris';
import dayjs from 'dayjs';

import Command from '../../structures/command';
import SuggestionsClient from '../../structures/client';
import MessageEmbed from '../../utils/MessageEmbed';
import Logger from '../../utils/Logger';

import { version, description } from '../../../package.json';
import MessageUtils from '../../utils/MessageUtils';
import { ShardStats, SuggestionsMessage } from '../../types';


// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: erisVersion }  = require('../../../node_modules/eris/package.json');

export default class InfoCommand extends Command {
  constructor(public client: SuggestionsClient) {
    super(client);

    this.name = 'info';
    this.category = 'General';
    this.description = 'View information about the bot and it\'s global statistics.';
    this.aliases = ['botinfo'];
    this.guildOnly = false;
    this.guarded = true;
  }

  public async run(message: SuggestionsMessage, args: Array<string>): Promise<any> {
    const { colors: { main }, owners: ownerIDs } = this.client.config;

    try {
      const owners: Array<string> = ownerIDs.map(o => this.client.users.get(o).mention);
      const created = dayjs(this.client.user.createdAt).format('MM/DD/YYYY');
      const cluster = this.client.base.clusterID;
      const shard = message.channel instanceof GuildChannel ? message.guild.shard.id : this.client.shards.get(0).id;

      const promises: [Promise<ShardStats>, Promise<number>, Promise<number>] = [
        this.client.redis.helpers?.getStats() ?? null,
        this.client.redis.helpers?.getGlobalSuggestionCount() ?? null,
        this.client.redis.helpers?.getGlobalCommandCount() ?? null,
      ];

      const [stats, suggestions, commands] = await Promise.all(promises);

      const embed = new MessageEmbed()
        .setTitle(this.client.user.username)
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
        .addField('Versions', [
          `**❯ Version:** \`${version}\``,
          `**❯ Node:** \`${process.version.replace('v', '')}\``,
          `**❯ Eris:** \`${erisVersion}\``,
        ].join('\n'), true)
        .addField('Statistics', [
          `**❯ Guilds:** \`${stats?.guilds ?? 0}\``,
          `**❯ Users:** \`${stats?.users ?? 0}\``,
          `**❯ Suggestions:** \`${suggestions ?? 0}\``,
          `**❯ Commands:** \`${commands ?? 0}\``,
          `**❯ Memory:** \`${Math.round(stats?.totalRam ?? 0)} MB\``
        ].join('\n'), true)
        .setFooter(`© 2020 Nerd Cave Development | PID ${process.pid} | Cluster ${cluster} | Shard ${shard}`);

      await message.channel.createMessage({ embed });
    } catch (e) {
      Logger.error(`CMD:${this.name.toUpperCase()}`, e);
      return MessageUtils.error(this.client, message, e.message, true);
    }
  }
}
