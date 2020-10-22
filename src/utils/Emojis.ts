import { InternalVoteEmoji } from '../types';

const emojis: Array<InternalVoteEmoji> = [
  {
    id: 0,
    name: 'defaultEmojis',
    fullName: 'Defaults',
    emojis: ['756633653668479117', '756633653286797443'],
    custom: true
  },
  {
    id: 1,
    name: 'oldDefaults',
    fullName: 'Old Defaults',
    emojis: ['✅', '❌'],
    custom: false
  },
  {
    id: 2,
    name: 'thumbsEmojis',
    fullName: 'Thumbs',
    emojis: ['👍', '👎'],
    custom: false
  },
  {
    id: 3,
    name: 'arrowsEmojis',
    fullName: 'Arrows',
    emojis: ['⬆', '⬇'],
    custom: false
  },
  {
    id: 4,
    name: 'greenEmojis',
    fullName: 'Green',
    emojis: ['✅', '❎'],
    custom: false
  },
  {
    id: 5,
    name: 'fancyEmojis',
    fullName: 'Fancy',
    emojis: ['555537247881920521', '555537277200367627'],
    custom: true
  }
];

export default emojis;
