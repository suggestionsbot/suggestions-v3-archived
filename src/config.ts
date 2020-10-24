import { BotConfig, VoteEmoji } from './types';

const config: BotConfig = {
  prefixes: [','],
  owners: ['158063324699951104'],
  discord: 'https://discord.gg/ntXkRan',
  website: 'https://suggestions.gg',
  docs: 'https://docs.suggestions.gg',
  invite: `https://discord.com/oauth2/authorize?client_id=${
    process.env.NODE_ENV === 'production' ? '474051954998509571' : '476928510573805568'
  }&scope=bot&permissions=355392`,
  github: 'https://github.com/suggestionsbot/suggestions',
  colors: {
    main: 0xdd9323,
    suggestion: {
      approved: 0x00e640,
      rejected: 0xcf000f
    },
    guild: {
      created: 0x2ecc71,
      deleted: 0xff4500
    }
  },
  emojis: {
    success: 'nerdSuccess',
    error: 'nerdError'
  },
  voteSites: [
    { name: 'top.gg', link: 'https://top.gg/bot/474051954998509571', voted: true },
    { name: 'discord.bots.gg', link: 'https://discord.bots.gg/bots/474051954998509571', voted: false },
    { name: 'discordbotlist.com', link: 'https://discordbotlist.com/bots/474051954998509571', voted: true },
    { name: 'botlist.space', link: 'https://botlist.space/bot/474051954998509571', voted: true },
    { name: 'discordapps.dev', link: 'https://discordapps.dev/en-GB/bots/474051954998509571', voted: true },
    { name: 'botsforddiscord.com', link: 'https://botsfordiscord.com/bots/474051954998509571', voted: true }
  ],
  patreon: 'https://patreon.com/acollierr17',
  superSecretUsers: [
    '214719690855940109', // Lukasz
    '245385436669804547', // Kyle
    '158063324699951104' // Anthony
  ],
  permissions: {
    regular: 355392,
    logs: 84992,
    staff: 85056,
  },
  defaults: {
    prefixes: [','],
    channels: {
      channel: 'suggestions',
      type: 'suggestions'
    },
    locale: 'en_US',
    emojis: [<VoteEmoji>{
      name: 'defaultEmojis',
      fullName: 'Defaults',
      emojis: ['578409088157876255', '578409123876438027'],
      default: true
    }]
  }
};

export default config;
