import Permissions from './Permissions';

export default class Util {
  public static formatPermission(permission: string): string {
    return Permissions[permission];
  }
}
