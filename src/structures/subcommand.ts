import ExStaff from './client';
import Command from './command';

export default abstract class SubCommand extends Command {
  public parent: string;
  public arg: string;
  public friendly: string;

  protected constructor(client: ExStaff) {
    super(client);
  }
}
