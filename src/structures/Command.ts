import { User } from 'eris';

import SuggestionsClient from './Client';
import { CommandThrottle, CommandThrottling, Command as CommandClass } from '../types';
import Context from './Context';
import { Collection } from '@augu/immutable';
import Ratelimit from './Ratelimit';

export default abstract class Command implements CommandClass {
  public active: boolean;
  public adminOnly: boolean|undefined;
  public aliases: Array<string>|undefined;
  public botPermissions: Array<string|number>|undefined;
  public category!: string;
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
  public throttles: Map<string, CommandThrottle>;
  public throttling: CommandThrottling;
  public usages: Array<string>|undefined;
  public userPermissions: Array<string|number>|undefined;

  protected constructor(public client: SuggestionsClient) {
    this.throttles = new Map();
    this.throttling = {
      usages: 2,
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

  public get ratelimiter(): Collection<Ratelimit> {
    return this.client.ratelimiters.getBucket(this.name)!;
  }
}
