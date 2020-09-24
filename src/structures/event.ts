/* eslint-disable @typescript-eslint/no-unused-vars */
import SuggestionsClient from './client';
import { Event as IEvent, EventOptions } from '../types';

export default abstract class Event implements IEvent {
  public type: string;
  public emitter: SuggestionsClient|string;

  protected constructor(public client?: SuggestionsClient, public name?: string, public options: EventOptions = {}) {
    this.client = client;
    this.name = name;
    this.type = options.once ? 'once' : 'on';
    this.emitter = (typeof options.emitter === 'string' ? this.client[options.emitter] : options.emitter) || this.client;
  }

  public async run(...args: Array<any>): Promise<any> {
    throw new Error(`The run method has not been implemented in ${this.name}`);
  }
}
