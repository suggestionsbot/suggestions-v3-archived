import ExStaff from './Client';
import Command from './Command';

import { SubCommand as SubCommandClass } from '../../types';

export default abstract class SubCommand extends Command implements SubCommandClass {
  public parent!: string;
  public arg!: string;
  public friendly!: string;

  protected constructor(client: ExStaff) {
    super(client);
  }
}
