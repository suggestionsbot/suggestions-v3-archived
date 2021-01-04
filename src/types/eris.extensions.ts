import Eris from 'eris';

import { SuggestionsCommand } from './';

declare module 'eris' {
  interface User {
    tag: string;
    createMessage(content: Eris.MessageContent, file?: Eris.MessageFile): Promise<Eris.Message>
  }

  interface Message {
    command?: SuggestionsCommand;
    guild?: Eris.Guild;
    prefix?: string;
  }

  interface Member {
    displayName: string;
    hasPermission: boolean;
  }

  interface Guild {
    me: Eris.Member;
  }
}

Object.defineProperty(Eris.User.prototype, 'tag', {
  get: function() {
    return `${this.username}#${this.discriminator}`;
  }
});

Object.defineProperty(Eris.User.prototype, 'createMessage', {
  value: function(
    content: Eris.MessageContent,
    file?: Eris.MessageFile) {
    return new Promise((resolve, reject) => {
      this.getDMChannel().then((channel: Eris.PrivateChannel) => {
        channel.createMessage(content, file).then(resolve).catch(reject);
      }).catch(reject);
    });
  }
});

Object.defineProperty(Eris.Message.prototype, 'guild', {
  get: function () {
    return this.channel.guild;
  }
});

Object.defineProperty(Eris.Member.prototype, 'displayName', {
  get: function() {
    return this.nick || this.username;
  }
});

Object.defineProperty(Eris.Member.prototype, 'hasPermission', {
  value: function(this: Eris.Member, perm: string) {
    return this.permissions.has(perm);
  }
});

Object.defineProperty(Eris.Guild.prototype, 'me', {
  get: function() {
    return this.members.get(this.shard.client.user.id);
  }
});
