import { Collection } from '@augu/immutable';
import { TextableChannel } from 'eris';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(duration);
dayjs.extend(relativeTime);

import Ratelimit from '../structures/core/Ratelimit';
import SuggestionsClient from '../structures/core/Client';
import { SuggestionsCommand } from '../types';

export default class RatelimitManager extends Collection<RatelimitBucket> {
  readonly #increasingRate: number;

  constructor(public client: SuggestionsClient) {
    super();

    this.#increasingRate = 30;
  }

  public getBucket(command: string): RatelimitBucket|undefined {
    return this.initialize(command);
  }

  public isRatelimited(ratelimit: Ratelimit): boolean {
    if (ratelimit.ignored) {
      this.ignoreOnce(ratelimit);
      return false;
    }

    return ratelimit.finishAt > Date.now();
  }

  public setRatelimited(command: SuggestionsCommand, user: string): void {
    if (this.client.isOwner(user)) return;

    const finishAt = (command.throttles.duration * 1000) + Date.now();
    let ratelimit = this.getRatelimitedUser(command.name, user);

    if (!ratelimit) {
      ratelimit = new Ratelimit(this.client, finishAt, command.throttles.duration * 1000);
      this.setRatelimitedUser(command.name, user, ratelimit);
    }

    if (ratelimit.ignored) {
      this.ignoreOnce(ratelimit);
      return;
    }

    ratelimit.updateRatelimit(finishAt, command.throttles.duration * 1000);
  }

  public handle(command: SuggestionsCommand, user: string, channel: TextableChannel): boolean {
    const ratelimit = this.getRatelimitedUser(command.name, user)!;
    ratelimit.singleUsages++;
    if (ratelimit.singleUsages >= command.throttles.usages) {
      if (ratelimit.singleUsages >= command.throttles.max) ratelimit.increateRatelimit();
      let time = ratelimit.finishAt - Date.now();
      if (time < 1000) time = 1000;
      channel.createMessage(`Slown down! You can use the \`${command.name}\` command again **${dayjs.duration(time).humanize(true)}**.`);
      return true;
    } else {
      return false;
    }
  }

  private initialize(command: string): RatelimitBucket|undefined {
    if (!this.has(command)) this.set(command, new RatelimitBucket());
    return this.get(command);
  }

  private getRatelimitedUser(command: string, user: string): Ratelimit|undefined {
    return this.getBucket(command)?.get(user);
  }

  private setRatelimitedUser(command: string, user: string, ratelimit: Ratelimit): Ratelimit|undefined {
    return this.getBucket(command)?.set(user, ratelimit).get(user);
  }


  private ignoreOnce(ratelimit: Ratelimit): void {
    const invalidate = !ratelimit.ignored;
    ratelimit.ignoreOnce(invalidate);
  }
}

export class RatelimitBucket extends Collection<Ratelimit> {
  constructor() {
    super();
  }
}
