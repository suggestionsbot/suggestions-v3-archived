import SuggestionsClient from './Client';
import { CommandThrottling, Command as CommandClass, CommandCategory } from '../types';
import Context from './Context';
import { RatelimitBucket } from '../managers/RatelimitManager';

export default abstract class Command implements CommandClass {
  public active: boolean;
  public adminOnly: boolean|undefined;
  public aliases: Array<string>|undefined;
  public botPermissions: Array<string|number>|undefined;
  public category!: CommandCategory;
  public checks: Array<string>|undefined;
  public description!: string;
  public examples: Array<string>|undefined;
  public guarded: boolean;
  public guildOnly: boolean;
  public name!: string;
  public ownerOnly: boolean|undefined;
  public staffOnly: boolean|undefined;
  public subCommands: Array<string>;
  public superOnly: boolean|undefined;
  public supportOnly: boolean|undefined;
  public throttles: CommandThrottling;
  public usages: Array<string>|undefined;
  public userPermissions: Array<string|number>|undefined;

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

  public async run(ctx: Context): Promise<any> {
    throw new Error(`The command ${this.name} does not have the required "run" method!`);
  }

  public get ratelimiter(): RatelimitBucket|undefined {
    return this.client.ratelimiters.getBucket(this.name);
  }
}
