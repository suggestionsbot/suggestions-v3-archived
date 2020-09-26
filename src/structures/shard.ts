import { Base } from 'eris-sharder';

import SuggestionsClient from './client';

export default class ShardClient extends Base {
  private _client: SuggestionsClient;

  constructor(public bot: boolean) {
    super(bot);

    this._client = new SuggestionsClient(process.env.DISCORD_TOKEN);
    this._client.start();
  }

  public launch(): any {
    this._client.base = this;

    this.ipc.register('changeStatus', status => {
      this._client.editStatus(status.status, {
        name: status.name,
        type: status.type,
        url: status.url
      });
    });
  }
}
