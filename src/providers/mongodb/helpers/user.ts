import { SuggestionUser, UserSchema } from '../../../types';
import UserModel from '../models/user';
import MongoDB from '../';
import Util from '../../../utils/Util';
import Logger from '../../../utils/Logger';

export default class UserHelpers {
  constructor(public database: MongoDB) {}

  async getUser(user: SuggestionUser, cached: boolean = true, newProfile?: boolean, guild?: string): Promise<UserSchema> {
    const userID = Util.getUserID(user);
    let data;
    const defaultData = <UserSchema><unknown>{
      ...this.database.client.config.defaults.user,
      user: userID,
      default: true
    };

    const inCache = cached && await this.database.redis.helpers.getCachedUser(user);
    if (inCache) data = inCache;
    else {
      const fetched = await UserModel.findOne({ user: userID });
      if (newProfile && !fetched) return this.createUser(user, guild && { guilds: [{ id: guild }] });
      if (!fetched) return defaultData;
      await this.database.redis.helpers.setCachedUser(user, fetched);
      data = fetched;
    }

    return <UserSchema>data;
  }

  async createUser(user: SuggestionUser, newData = {}): Promise<UserSchema> {
    const userID = Util.getUserID(user);
    const schema = new UserModel(Object.assign({ user: userID }, newData));

    const data = await schema.save();
    await this.database.redis.helpers.setCachedUser(user, data);

    Logger.log(`User profile saved for user ${userID}`);
    return data;
  }

  async deleteUser(user: SuggestionUser): Promise<boolean> {
    const deleted = await UserModel.deleteOne({ user: Util.getUserID(user) });
    await this.database.redis.helpers.clearCachedUser(user);
    return !!deleted.ok;
  }
}
