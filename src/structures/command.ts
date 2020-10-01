/* eslint-disable @typescript-eslint/no-unused-vars */
import { User } from 'eris';

import SuggestionsClient from './client';
import { CommandThrottle, CommandThrottling, GuildSchema, Command as CommandClass, SuggestionsMessage } from '../types';

export default abstract class Command implements CommandClass {
  public active: boolean;
  public adminOnly: boolean;
  public aliases: Array<string>;
  public botPermissions: Array<string|number>;
  public category: string;
  public description: string;
  public examples: Array<string>;
  public guarded: boolean;
  public guildOnly: boolean;
  public name: string;
  public ownerOnly: boolean;
  public staffOnly: boolean;
  public subCommands: Array<string>;
  public superOnly: boolean;
  public throttles: Map<string, CommandThrottle>;
  public throttling: CommandThrottling;
  public usages: Array<string>;
  public userPermissions: Array<string|number>;

  protected constructor(public client: SuggestionsClient) {
    this.client = client;
    this.throttles = new Map();
    this.throttling = {
      usages: 2,
      duration: 5
    };
    this.active = true;
    this.aliases = [];
    this.subCommands = [];
  }

  public async run(message: SuggestionsMessage, args: Array<string>, settings?: GuildSchema): Promise<any> {
    throw new Error(`The command ${this.name} does not have the required "run" method!`);
  }

  public throttle(user: User): CommandThrottle {
    if (!this.throttling || this.client.isOwner(user)) return;

    let throttle = this.throttles.get(user.id);
    if (!throttle) {
      throttle = {
        start: Date.now(),
        usages: 0,
        timeout: setTimeout(() => {
          this.throttles.delete(user.id);
        }, this.throttling.duration * 1000)
      };
      this.throttles.set(user.id, throttle);
    }
    return throttle;
  }

}
