import { Collection } from '@augu/immutable';
import { TextableChannel } from 'eris';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(duration);
dayjs.extend(relativeTime);

import Ratelimit from '../structures/Ratelimit';
import SuggestionsClient from '../structures/Client';
import { SuggestionsCommand } from '../types';

export default class RatelimitManager extends Collection<Collection<Ratelimit>> {
  private readonly _increasingRate: number;

  constructor(public client: SuggestionsClient) {
    super();

    this._increasingRate = 30;
  }

  public getBucket(command: string): Collection<Ratelimit> {
    return this._initialize(command);
  }

  public isRatelimited(command: string, user: string): boolean {
    const ratelimit = this._getRatelimitedUser(command, user);
    if (!ratelimit) return false;

    if (ratelimit.ignored) {
      this._ignoreOnce(command, user);
      return false;
    }

    return ratelimit.finishAt > Date.now();
  }

  public setRatelimited(command: SuggestionsCommand, user: string): void {
    if (this.client.isOwner(user)) return;

    const finishAt = (command.throttling!.duration * 1000) + Date.now();
    let ratelimit = this._getRatelimitedUser(command.name, user);

    if (!ratelimit) {
      ratelimit = new Ratelimit(finishAt, command.throttling!.duration * 1000);
      this._setRatelimitedUser(command.name, user, ratelimit);
    }

    if (ratelimit.ignored) {
      this._ignoreOnce(command.name, user);
      return;
    }

    ratelimit.updateRatelimit(finishAt, command.throttling!.duration * 1000);
  }

  public handle(command: SuggestionsCommand, user: string, channel: TextableChannel): void {
    const ratelimit = this._getRatelimitedUser(command.name, user)!;
    ratelimit.singleUsages++;
    if (ratelimit.singleUsages >= command.throttling!.usages) ratelimit.increateRatelimit();
    let time = ratelimit.finishAt - Date.now();
    if (time < 1000) time = 1000;
    channel.createMessage(`You can use the \`${command.name}\` command **${dayjs.duration(time).humanize(true)}**.`);
  }

  private _initialize(command: string): Collection<Ratelimit> {
    if (!this.has(command)) this.set(command, new Collection());
    return this.get(command)!;
  }

  private _getRatelimitedUser(command: string, user: string): Ratelimit|undefined {
    return this.getBucket(command).get(user);
  }

  private _setRatelimitedUser(command: string, user: string, ratelimit: Ratelimit): Ratelimit {
    return this.getBucket(command).set(user, ratelimit).get(user)!;
  }


  private _ignoreOnce(command: string, user: string): void {
    const ratelimit = this._getRatelimitedUser(command, user)!;
    const invalidate = !ratelimit.ignored;
    ratelimit.ignoreOnce(invalidate);
  }

}
