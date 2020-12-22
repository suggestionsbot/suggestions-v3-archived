import { Guild, TextChannel } from 'eris';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

import Event from '../../structures/core/Event';
import SuggestionsClient from '../../structures/core/Client';
import Logger from '../../utils/Logger';
import Util from '../../utils/Util';
import MessageEmbed from '../../utils/MessageEmbed';

export default class extends Event {
  constructor(client: SuggestionsClient, name: string) {
    super(client, name);
  }

  public async run(guild: Guild): Promise<any> {
    const { guild: { deleted: color } } = this.client.config.colors;

    try {
      const clientUser = guild.members.get(this.client.user.id) ?? await Util.getGuildMemberByID(guild, this.client.user.id);

      const oldServer = new MessageEmbed()
        .setTitle('Added')
        .setDescription([
          `**ID:** \`${guild.id}\``,
          `**Name:** \`${guild.name}\``,
          `**Members:** \`${guild.memberCount}\``,
          `**Joined:** \`${dayjs(clientUser.joinedAt).fromNow()}\``,
          `**Owner:** <@${guild.ownerID}> \`[${guild.ownerID}]\``
        ].join('\n'))
        .setColor(color)
        .setTimestamp();

      await this.client.getRESTChannel(this.client.system)
        .then(((chn: any) => (<TextChannel>chn).createMessage({ embed: oldServer })));
    } catch (e) {
      Logger.error('GUILD_CREATE EVENT', e);
    }
  }
}
