/* eslint-disable @typescript-eslint/no-unused-vars */
import { Permission, User, Message } from 'eris';

import SuggestionsClient from './client';
import { CommandThrottle, CommandThrottling } from '../types';

export default class Command {
  active: boolean;
  adminOnly: boolean;
  aliases: Array<string>;
  botPermissions: Array<string|number>;
  category: string;
  description: string;
  examples: Array<string>;
  guarded: boolean;
  guildOnly: boolean;
  name: string;
  ownerOnly: boolean;
  staffOnly: boolean;
  subCommands: Array<string>;
  superOnly: boolean;
  throttles: Map<string, CommandThrottle>;
  throttling: CommandThrottling;
  usage: Array<string>;
  userPermissions: Array<string|number>;

  constructor(public client: SuggestionsClient) {
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

  run(message: Message, args: Array<string>, settings: any): Promise<void> {
    throw new Error(`The command ${this.name} does not have the required "run" method!`);
  }

  throttle(user: User): CommandThrottle {
    if (!this.throttling) return;

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
