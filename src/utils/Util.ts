import Permissions from './Permissions';
import { Guild, Member, User } from 'eris';
import { SuggestionGuild, SuggestionUser } from '../types';

export default class Util {
  public static formatPermission(permission: string): string {
    return Permissions[permission];
  }

  public static formatUserTag(user: User): string {
    return `${user.username}#${user.discriminator}`;
  }

  public static getGuildID(guild: SuggestionGuild): string {
    return guild instanceof Guild ? guild.id : guild;
  }

  public static getUserID(user: SuggestionUser): string {
    let data: string;
    if (user instanceof User) data = user.id;
    if (user instanceof Member) data = user.id;
    if (typeof user === 'string') data = user;

    return data;
  }
}
