import hastebin from 'hastebin-gen';
import { Type } from '@anishshobith/deeptype';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
dayjs.extend(duration);

import { CommandCategory, CommandNextFunction } from '../../types';
import MessageEmbed from '../../utils/MessageEmbed';
import Command from '../../structures/command';
import ExStaff from '../../structures/client';
import MessageUtils from '../../utils/MessageUtils';
import CommandContext from '../../structures/Context';

export default class EvalCommand extends Command {
  constructor(client: ExStaff) {
    super(client);

    this.name = 'eval';
    this.category = CommandCategory.OWNER;
    this.description = 'Run raw JavaScript code via the bot.';
    this.usages = ['eval <code>'];
    this.ownerOnly = true;
    this.botPermissions = ['embedLinks', 'manageMessages'];
    this.guildOnly = false;
  }

  public async runPreconditions(ctx: CommandContext, next: CommandNextFunction): Promise<any> {
    if (!ctx.args[0]) return MessageUtils.error(this.client, ctx.message, 'You need to provide code to eval!');
    next();
  }

  public async run(ctx: CommandContext): Promise<any> {
    const { colors: { main, suggestion: { rejected } } } = this.client.config;

    const code = ctx.args.join(' ');

    const embed = new MessageEmbed();
    const exceededEmbed = new MessageEmbed()
      .setFooter(`ID: ${ctx.sender.id}`);

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

        await ctx.dm({
          user: ctx.sender,
          content: `<${haste}>`
        });

        exceededEmbed.setColor(main);
        exceededEmbed.setDescription('📨 Output exceeded 1000 characters. DMing you the Hastebin.');

        const msg = await ctx.embed(exceededEmbed);
        await msg.addReaction('📧');
        await MessageUtils.delete(msg,{ timeout: 2500 });
        return;
      }

      embed.setColor(main);
      embed.addField('Input 📥', `\`\`\`js\n${code}\`\`\``);
      embed.addField('Type 🔖', `\`\`\`ts\n${new Type(evaled).is}\n\`\`\``);
      embed.addField('Output 📤', `\`\`\`js\n${clean}\`\`\``);
      embed.setFooter(`ID: ${ctx.sender.id} | Duration: ${dayjs.duration(end - start).milliseconds()}ms`);
    } catch (err) {
      if (err.length > 2000) {
        const haste = await hastebin(Buffer.from(err).toString(), {
          url: 'https://paste.thenerdcave.us',
          extension: 'js'
        });

        await ctx.dm({
          user: ctx.sender,
          content: `<${haste}>`
        });

        exceededEmbed.setColor(rejected);
        exceededEmbed.setDescription('📨 Output exceeded 2000 characters. DMing you the Hastebin.');

        const msg = await ctx.embed(exceededEmbed);
        await msg.addReaction('📧');
        await MessageUtils.delete(msg,{ timeout: 5000 });
        return;
      }

      embed.setColor(rejected);
      embed.addField('Error ❗', `\`\`\`bash\n${err}\`\`\``);
    }

    if (!code.startsWith('void')) return ctx.embed(embed);
  }
}
