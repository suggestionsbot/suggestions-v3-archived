import hastebin from 'hastebin-gen';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
dayjs.extend(duration);

import { SuggestionsMessage, CommandNextFunction } from '../../types';
import MessageEmbed from '../../utils/MessageEmbed';
import Command from '../../structures/command';
import ExStaff from '../../structures/client';
import MessageUtils from '../../utils/MessageUtils';
import Logger from '../../utils/Logger';

export default class EvalCommand extends Command {
  constructor(client: ExStaff) {
    super(client);

    this.name = 'eval';
    this.category = 'Bot Owner';
    this.description = 'Run raw JavaScript code via the bot.';
    this.usages = ['eval <code>'];
    this.ownerOnly = true;
  }

  public async runPreconditions(message: SuggestionsMessage, args: Array<string>, next: CommandNextFunction): Promise<any> {
    if (!args[0]) return MessageUtils.error(this.client, message, 'You need to provide code to eval!');
    next();
  }

  public async run(message: SuggestionsMessage, args: Array<string>): Promise<any> {
    const { colors: { main, suggestion: { rejected } } } = this.client.config;

    const code = args.join(' ');

    const embed = new MessageEmbed();
    const exceededEmbed = new MessageEmbed()
        .setFooter(`ID: ${message.author.id}`);

    try {
      const start = Date.now();
      // tslint:disable-next-line: no-eval
      const evaled = eval(code);
      const clean = await this.client.clean(evaled);
      const end = Date.now();

      // 6 graves, and 2 characters for "js"
      const MAX_CHARS = 3 + 2 + clean.length + 3;
      if (MAX_CHARS > 1000) {
        const haste = await hastebin(Buffer.from(clean).toString(), {
          url: 'https://paste.thenerdcave.us',
          extension: 'js'
        });

        await message.author.getDMChannel().then(channel => channel.createMessage(`<${haste}>`))

        exceededEmbed.setColor(main);
        exceededEmbed.setDescription('📨 Output exceeded 1000 characters. DMing you the Hastebin.');

        const msg = await message.channel.createMessage({ embed: exceededEmbed });
        await msg.addReaction('📧');
        await MessageUtils.delete(msg,{ timeout: 2500 });
        return;
      }

      embed.setColor(main);
      embed.addField('Input 📥', `\`\`\`js\n${code}\`\`\``);
      embed.addField('Output 📤', `\`\`\`js\n${clean}\`\`\``);
      embed.setFooter(`ID: ${message.author.id} | Duration: ${dayjs.duration(end - start).milliseconds()}ms`)
    } catch (err) {
      if (err.length > 2000) {
        const haste = await hastebin(Buffer.from(err).toString(), {
          url: 'https://paste.thenerdcave.us',
          extension: 'js'
        });

        await message.author.getDMChannel().then(channel => channel.createMessage(`<${haste}>`))

        exceededEmbed.setColor(rejected);
        exceededEmbed.setDescription('📨 Output exceeded 2000 characters. DMing you the Hastebin.');

        const msg = await message.channel.createMessage({ embed: exceededEmbed });
        await msg.addReaction('📧');
        await MessageUtils.delete(msg,{ timeout: 5000 });
        return;
      }

      embed.setColor(rejected);
      embed.addField('Error ❗', `\`\`\`bash\n${err}\`\`\``);
    }

    if (!code.startsWith('void')) return message.channel.createMessage({ embed });
  }
}
