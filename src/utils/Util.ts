export default class Util {
  public static formatPermission(permission: string): string {
    const result = permission.split(/(?=[A-Z])/).join(' ');

    return result.charAt(0).toUpperCase() + result.slice(1);
  }
}
