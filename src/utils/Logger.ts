import chalk from 'chalk';
import * as util from 'util';

export default class Logger {
  private static _forcePadding(padding: number): string {
    return (padding < 10 ? '0' : '') + padding;
  }

  private static _getCurrentTime(): string {
    const now    = new Date();
    const day    = Logger._forcePadding(now.getDate());
    const month  = Logger._forcePadding(now.getMonth() + 1);
    const year   = Logger._forcePadding(now.getFullYear());
    const hour   = Logger._forcePadding(now.getHours());
    const minute = Logger._forcePadding(now.getMinutes());
    const second = Logger._forcePadding(now.getSeconds());

    return `${month}.${day}.${year} ${hour}:${minute}:${second}`;
  }

  public static log(...body: Array<any>): void {
    console.log(chalk.bold.white(`[ ${Logger._getCurrentTime()} ]`), ...body);
  }

  public static success(title: string, ...body: Array<any>): void {
    console.log(chalk.bold.green(`[ ${Logger._getCurrentTime()} ] [ $${title} ]`), ...body);
  }

  public static warning(title: string, ...body: Array<any>): void {
    console.log(chalk.bold.yellow(`[ ${this._getCurrentTime()} ] [ ${title} ]`), ...body);
  }

  public static error(title: string, ...body: Array<any>): void {
    console.log(chalk.bold.red(`[ ${this._getCurrentTime()} ] [ ${title} ]`), ...body);
  }

  public static debug(title: string, ...body: Array<any>): void {
    console.log(chalk.bold.magenta(`[ ${this._getCurrentTime()} ] [ ${title} ]`), ...body);
  }

  public static event(event: string, ...body: Array<any>): void {
    console.log(chalk.bold.yellow(`[ ${this._getCurrentTime()} ] [ EVENT:${event.toUpperCase()} ]`), ...body);
  }

  public static command(command: string, ...body: Array<any>): void {
    console.log(chalk.bold.green(`[ ${this._getCurrentTime()} ] [ COMMAND:${command.toUpperCase()} ]`), ...body);
  }

  public static ready(...body: Array<any>): void {
    console.log(chalk.bold.blue(`[ ${this._getCurrentTime()} ] [ READY ]`), ...body);
  }
}
