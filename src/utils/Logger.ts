import chalk from 'chalk';
import { inspect } from 'util';
import * as Sentry from '@sentry/node';
import { Severity } from '@sentry/node';

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

  private static _formMessage(...body: Array<any>): string {
    const data = [];

    for (const m of body) {
      if (typeof m === 'object') data.push(inspect(m));
      else data.push(m);
    }

    return data.join(' ');
  }

  static log(...body: Array<any>): void {
    console.log(`${chalk.bold.white('[ LOG ] ') + Logger._formMessage(...body)}`);
  }

  static success(title: string, ...body: Array<any>): void {
    console.log(chalk.bold.green(`[ SUCCESS ] [ ${title} ] `) + Logger._formMessage(...body));
  }

  static warning(title: string, ...body: Array<any>): void {
    const formedMessage = Logger._formMessage(...body);
    console.warn(chalk.bold.yellow(`[ WARNING ] [ ${title} ] `) + formedMessage);
    Sentry.captureMessage(formedMessage, { level: Severity.Warning });
  }

  static error(title: string, ...body: Array<any>): void {
    const formedMessage = Logger._formMessage(...body);
    console.error(chalk.bold.red(`[ ERROR ] [ ${title} ] `) + formedMessage);
    Sentry.captureException(formedMessage, { level: Severity.Error });
  }

  static debug(title: string, ...body: Array<any>): void {
    console.debug(chalk.bold.magenta(`[ DEBUG ] [ ${title} ] `) + Logger._formMessage(...body));
  }

  static event(event: string, ...body: Array<any>): void {
    console.log(chalk.bold.yellow(`[ EVENT ] [ ${event.toUpperCase()} ] `) + Logger._formMessage(...body));
  }

  static command(command: string, ...body: Array<any>): void {
    console.log(chalk.bold.green(`[ COMMAND ] [ ${command.toUpperCase()} ] `) + Logger._formMessage(...body));
  }

  static ready(...body: Array<any>): void {
    console.log(chalk.bold.blue('[ READY ] ') + Logger._formMessage(...body));
  }
}
