import ExStaff from './Client';
import Command from './Command';

import { SubCommand as SubCommandClass } from '../../types';

export default abstract class SubCommand extends Command implements SubCommandClass {
  parent!: string;
  arg!: string;

  protected constructor(client: ExStaff) {
    super(client);
  }

  get friendly(): string {
    return this.name.replace(/-/g, ' ');
  }
}
