import SuggestionsClient from '../core/Client';
import Context from './Context';

export default abstract class Condition {
  protected constructor(public client: SuggestionsClient, public name: string) {}

  public async run(ctx: Context): Promise<any> {
    throw new Error(`The check ${this.name} does not have the required "run" method!`);
  }
}
