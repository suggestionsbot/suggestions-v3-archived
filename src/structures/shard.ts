import * as Sentry from '@sentry/node';
import { CaptureConsole, RewriteFrames } from '@sentry/integrations';
import { Base } from 'eris-sharder';
import dotenv from 'dotenv';
dotenv.config();

import SuggestionsClient from './client';
import { version } from '../../package.json';
import Logger from '../utils/Logger';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLERATE),
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

export default class ShardClient extends Base {
  private _client: SuggestionsClient;

  constructor(public bot: boolean) {
    super(bot);

    this._client = new SuggestionsClient(process.env.DISCORD_TOKEN);
    this._client.start();
  }

  public launch(): any {
    this._client.base = this;
    this._client.sentry = Sentry;

    this.ipc.register('changeStatus', status => {
      this._client.editStatus(status.status, {
        name: status.name,
        type: status.type,
        url: status.url
      });
    });

    process.on('message', async data => {
      try {
        if (data.name === 'shardStats') {
          if (this._client.redis.redis) await this._client.redis.helpers.updateStats(data.data);
        }
      } catch (e) {
        Logger.error('SHARD CLASS', e);
      }
    });
  }
}
