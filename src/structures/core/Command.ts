import SuggestionsClient from './Client';
import { CommandThrottling, Command as CommandClass, CommandCategory } from '../../types';
import Context from '../commands/Context';
import { RatelimitBucket } from '../../managers/RatelimitManager';

export default abstract class Command implements CommandClass {
  active: boolean;
  adminOnly: boolean|undefined;
  aliases: Array<string>|undefined;
  botPermissions: Array<string|number>|undefined;
  category!: CommandCategory;
  conditions: Array<string>|undefined;
  description!: string;
  examples: Array<string>|undefined;
  guarded: boolean;
  guildOnly: boolean;
  name!: string;
  ownerOnly: boolean|undefined;
  staffOnly: boolean|undefined;
  subCommands: Array<string>;
  superOnly: boolean|undefined;
  supportOnly: boolean|undefined;
  throttles: CommandThrottling;
  usages: Array<string>|undefined;
  userPermissions: Array<string|number>|undefined;

  protected constructor(public client: SuggestionsClient) {
    this.throttles = {
      usages: 2,
      max: 4,
      duration: 5
    };
    this.active = true;
    this.aliases = [];
    this.subCommands = [];
    this.guarded = true;
    this.guildOnly = true;
  }

  async run(ctx: Context): Promise<any> {
    throw new Error(`The command ${this.name} does not have the required "run" method!`);
  }

  get ratelimiter(): RatelimitBucket|undefined {
    return this.client.ratelimiters.getBucket(this.name);
  }
}
