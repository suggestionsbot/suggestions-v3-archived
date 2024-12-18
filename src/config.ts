import { BotConfig, GuildSchema, SuggestionChannel, UserSchema, VoteEmoji } from './types';

const isProduction = (): boolean => process.env.NODE_ENV === 'production';
const id = isProduction() ? '474051954998509571' : '476928510573805568';

const config: BotConfig = {
  prefixes: [','],
  owners: ['158063324699951104'],
  discord: 'https://discord.gg/ntXkRan',
  website: 'https://suggestions.gg',
  docs: 'https://docs.suggestions.gg',
  invite: `https://discord.com/oauth2/authorize?client_id=${id}&scope=bot&permissions=355392`,
  github: 'https://github.com/suggestionsbot/suggestions',
  colors: {
    main: 0xdd9323,
    suggestion: {
      pending: 0xdd9323,
      approved: 0x00e640,
      rejected: 0xd63031,
      considered: 0xfdcb6e,
      implemented: 0x74b9ff
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
    { name: 'top.gg', link: `https://top.gg/bot/${id}`, voted: true },
    { name: 'discord.bots.gg', link: `https://discord.bots.gg/bots/${id}`, voted: false },
    { name: 'discordbotlist.com', link: `https://discordbotlist.com/bots/${id}`, voted: true },
    { name: 'botlist.space', link: `https://botlist.space/bot/${id}`, voted: true },
    { name: 'discordapps.dev', link: `https://discordapps.dev/en-GB/bots/${id}`, voted: true },
    { name: 'botsforddiscord.com', link: `https://botsfordiscord.com/bots/${id}`, voted: true }
  ],
  superSecretUsers: [
    '214719690855940109', // Lukasz
    '245385436669804547', // Kyle
    '158063324699951104' // Anthony
  ],
  permissions: {
    regular: 355392,
    logs: 84992,
    staff: 85056,
    actionlogs: 84992,
    review: 84992
  },
  defaults: {
    guild: <GuildSchema>{
      prefixes: [','],
      channels: [<SuggestionChannel>{
        id: 'suggestions',
        type: 'suggestions'
      }],
      locale: 'en_US',
      emojis: [<VoteEmoji>{
        emojis: ['578409088157876255', '578409123876438027'],
        system: true
      }]
    },
    user: <UserSchema>{
      locale: 'en_US',
      showNickname: false
    }
  },
  // Developer, Leadership, Moderators, Trusted
  supportRoles: isProduction()
    ? ['601235098012090378', '603803993562677258', '601235098502823947', '629883041946533893']
    : ['737533859926638642', '786005367922360400', '778368987472986113', '778368989369860158'],
  boosterRole: isProduction() ? '703785795483336766' : '790780156406267904',
  channels: {
    serverLogs: isProduction() ? '602332466476482616' : '787824459305844809',
  }
};

export default config;
