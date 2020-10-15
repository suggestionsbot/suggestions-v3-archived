/* eslint-disable @typescript-eslint/no-unused-vars */
import SuggestionsClient from './Client';
import { Event as EventClass, EventOptions } from '../types';

export default abstract class Event implements EventClass {
  protected constructor(public client: SuggestionsClient, public name: string, public options: EventOptions = {}) {}

  public async run(...args: Array<any>): Promise<any> {
    throw new Error(`The run method has not been implemented in ${this.name}`);
  }
}
