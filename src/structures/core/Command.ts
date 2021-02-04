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
    this.guarded = true;
    this.guildOnly = true;
  }

  abstract run(ctx: Context): any;

  get ratelimiter(): RatelimitBucket|undefined {
    return this.client.ratelimiters.getBucket(this.name);
  }
}
