import * as Sentry from '@sentry/node';
import { CaptureConsole, RewriteFrames } from '@sentry/integrations';
import { LaunchModule } from '@nedbot/sharder';
import { setDefaults } from 'wumpfetch';
import { BotActivityType, Status } from 'eris';
import { IPCMessage } from '@nedbot/sharder/dist/types/struct/IPC';

import SuggestionsClient from './Client';
import { version } from '../../../package.json';
import Logger from '../../utils/Logger';
import config from '../../config';

interface MessageData extends IPCMessage {
  status?: Status
  name?: string;
  type?: BotActivityType;
}

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLERATE!),
  release: version,
  environment: process.env.NODE_ENV,
  maxBreadcrumbs: 30,
  integrations: [
    new RewriteFrames({
      root: (<any>global).__rootdir__
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

export default class extends LaunchModule<SuggestionsClient> {
  launch(): void {
    this.ipc.register('changeStatus', (data: MessageData) => {
      this.client.editStatus(data!.status!, {
        name: data.name!,
        type: data.type!,
        url: data.url
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
