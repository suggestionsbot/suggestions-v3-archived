import { Guild, TextChannel } from 'eris';
import dayjs from 'dayjs';

import Event from '../../structures/core/Event';
import SuggestionsClient from '../../structures/core/Client';
import Logger from '../../utils/Logger';
import MessageEmbed from '../../utils/MessageEmbed';
import Util from '../../utils/Util';

export default class extends Event {
  constructor(client: SuggestionsClient, name: string) {
    super(client, name);
  }

  public async run(guild: Guild): Promise<any> {
    const { guild: { created: color } } = this.client.config.colors;

    try {
      const newServer = new MessageEmbed()
        .setTitle('Added')
        .setDescription([
          `**ID:** \`${guild.id}\``,
          `**Name:** \`${Util.escapeMarkdown(guild.name)}\``,
          `**Members:** \`${guild.memberCount}\``,
          `**Created:** \`${dayjs(guild.createdAt).format('MM/DD/YYYY HH:mm:ss')}\``,
          `**Owner:** <@${guild.ownerID}> \`[${guild.ownerID}]\``
        ].join('\n'))
        .setColor(color)
        .setTimestamp();

      await this.client.getRESTChannel(this.client.system)
        .then(((chn: any) => (<TextChannel>chn).createMessage({ embed: newServer })));
    } catch (e) {
      Logger.error('GUILD_CREATE EVENT', e);
    }
  }
}
