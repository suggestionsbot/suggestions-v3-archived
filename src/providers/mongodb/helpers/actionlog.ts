import { DocumentQuery } from 'mongoose';

import MongoDB from '../';
import { ActionLogSchema, SuggestionGuild } from '../../../types';
import ActionLogModel from '../models/actionlog';
import Util from '../../../utils/Util';
import ActionLog from '../../../structures/actions/ActionLog';

export default class ActionLogHelpers {
  constructor(public database: MongoDB) {}

  private static queryActionLog(query: string): Array<Record<string, unknown>> {
    return [
      { id: query.length !== 7 ? query : new RegExp(query, 'i') },
      { message: query }
    ];
  }

  public static getActionLogID(ctx: ActionLogSchema, long = false): string {
    if (long) return ctx.id;
    else return ctx.id.slice(33, 40);
  }

  public getActionLogs(guild: SuggestionGuild): DocumentQuery<Array<ActionLogSchema>, ActionLogSchema, Record<string, any>> {
    return ActionLogModel.find({ guild: Util.getGuildID(guild) });
  }

  public async getActionLog(query: string): Promise<ActionLog|undefined> {
    const fetched = await ActionLogModel.findOne({ $or: ActionLogHelpers.queryActionLog(query) });
    if (!fetched) throw new Error('ActionLogNotFound');

    if (fetched) return new ActionLog(this.database.client).setData(fetched);
    else return;
  }

  public createActionLog(modlog: Record<string, unknown>): Promise<ActionLogSchema> {
    const schema = new ActionLogModel(modlog);
    return schema.save();
  }

  public async deleteActionLog(query: string): Promise<boolean> {
    const deleted = await ActionLogModel.deleteOne({ $or: ActionLogHelpers.queryActionLog(query) });
    return !!deleted.ok;
  }

  public async deleteAllActionLogs(guild: SuggestionGuild): Promise<boolean> {
    const deleted = await ActionLogModel.deleteMany({ guild: Util.getGuildID(guild) });
    return !!deleted.ok;
  }
}
