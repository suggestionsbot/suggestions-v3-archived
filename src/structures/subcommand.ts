import ExStaff from './client';
import Command from './command';

export default class SubCommand extends Command {
  public parent: string;
  public arg: string;
  public friendly: string;

  constructor(client: ExStaff) {
    super(client);
  }
}
