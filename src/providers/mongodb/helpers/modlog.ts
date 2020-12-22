import MongoDB from '../';
import { ModLogSchema, SuggestionGuild } from '../../../types';
import ModLogModel from '../models/modlog';
import Util from '../../../utils/Util';
import ModLog from '../../../structures/moderation/ModLog';
import { DocumentQuery } from 'mongoose';

export default class ModLogHelpers {
  constructor(public database: MongoDB) {}

  private static queryModLog(query: string): Array<Record<string, unknown>> {
    return [
      { id: query.length !== 7 ? query : new RegExp(query, 'i') },
      { message: query }
    ];
  }

  public static getModLogID(ctx: ModLogSchema, long = false): string {
    if (long) return ctx.id;
    else return ctx.id.slice(33, 40);
  }

  public getModLogs(guild: SuggestionGuild): DocumentQuery<Array<ModLogSchema>, ModLogSchema, Record<string, unknown>> {
    return ModLogModel.find({ guild: Util.getGuildID(guild) });
  }

  public async getModLog(guildID: string, query: string, guild: boolean = true): Promise<ModLog|null> {
    const fetched = await ModLogModel.findOne({ $or: ModLogHelpers.queryModLog(query) });
    if (!fetched) throw new Error('ModLogNotFound');

    if (guild && (fetched.guild !== guildID)) throw new Error('GuildScope');

    if (fetched) return new ModLog(this.database.client).setData(fetched);
    else return null;
  }

  public createModLog(modlog: Record<string, unknown>): Promise<ModLogSchema> {
    const schema = new ModLogModel(modlog);
    return schema.save();
  }

  public async deleteModLog(query: string): Promise<boolean> {
    const deleted = await ModLogModel.deleteOne({ $or: ModLogHelpers.queryModLog(query) });
    return !!deleted.ok;
  }

  public async deleteAlLModLogs(guild: SuggestionGuild): Promise<boolean> {
    const deleted = await ModLogModel.deleteMany({ guild: Util.getGuildID(guild) });
    return !!deleted.ok;
  }
}
