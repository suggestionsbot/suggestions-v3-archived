import ExStaff from './Client';
import Command from './Command';

import { SubCommand as SubCommandClass } from '../../types';

export default abstract class SubCommand extends Command implements SubCommandClass {
  parent!: string;
  arg!: string;
  friendly!: string;

  protected constructor(client: ExStaff) {
    super(client);
  }
}
