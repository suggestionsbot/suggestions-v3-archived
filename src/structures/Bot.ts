import * as Sentry from '@sentry/node';
import { CaptureConsole, RewriteFrames } from '@sentry/integrations';
import { Base } from 'eris-sharder';
import { setDefaults } from 'wumpfetch';

import SuggestionsClient from './Client';
import { version } from '../../package.json';
import Logger from '../utils/Logger';
import config from '../config';
import { StatusEvent } from '../types';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLERATE!),
  release: version,
  environment: process.env.NODE_ENV,
  maxBreadcrumbs: 30,
  integrations: [
    new RewriteFrames({
      root: global.__rootdir__
    }),
    new CaptureConsole({
      levels: ['error']
    })
  ]
});

setDefaults({
  headers: {
    'User-Agent': `Suggestions/DiscordBot (v${version}, ${config.github})`
  }
});

export default class Bot extends Base {
  public client: SuggestionsClient;

  constructor(public bot: boolean) {
    super(bot);

    this.client = new SuggestionsClient(process.env.DISCORD_TOKEN!);
    this.client.start();
  }

  public launch(): any {
    this.client.base = this;

    this.ipc.register('changeStatus', (status: StatusEvent) => {
      this.client.editStatus(status.status, {
        name: status.name,
        type: status.type,
        url: status.url
      });
    });

    process.on('message', async data => {
      try {
        if (data.name === 'shardStats') {
          if (this.client.redis.instance) await this.client.redis.helpers.updateStats(data.data);
        }
      } catch (e) {
        Logger.error('SHARD CLASS', e);
      }
    });
  }
}
