import { Message, User } from 'eris';

import BaseState from './BaseState';
import {
  ResultEmoji,
  SuggestionChannelType,
  SuggestionStateData,
  SuggestionStateType,
  VoteResult
} from '../../../types';
import Suggestion from '../Suggestion';
import SuggestionEmbeds from '../../../utils/SuggestionEmbeds';
import Util from '../../../utils/Util';

export default class ApprovedState extends BaseState {
  readonly state: SuggestionStateType;
  readonly message: Message;
  executor: User;
  target?: User;
  response?: string;
  results?: Array<ResultEmoji>;
  voted?: Array<VoteResult>;

  constructor(suggestion: Suggestion, message: Message, data: SuggestionStateData) {
    super(suggestion, data);

    this.state = SuggestionStateType.APPROVED;
    this.executor = data.executor;
    this.message = message;
    if (data.target) this.target = data.target;
    if (data.response) this.response = data.response;
    if (data.results) this.results = data.results;
    if (data.voted) this.voted = data.voted;
  }

  get postable(): boolean {
    return (
      !!this.suggestion &&
      !!this.results &&
      !!this.voted &&
      !!this.message
    );
  }

  getData(): Record<string, unknown> {
    return {
      state: this.state,
      statusUpdate: {
        state: this.state,
        reason: this.response,
        time: Date.now(),
        updatedBy: this.executor.id
      },
      results: this.results,
      voted: this.voted
    };
  }

  async post(): Promise<this> {
    if (!this.postable) throw new Error('ApprovedSuggestionNotPostable');

    const logsChannel = await this.suggestion.client.suggestionChannels.fetchChannel(this.suggestion.guild,
      null, SuggestionChannelType.LOGS);

    const embed = SuggestionEmbeds.approvedSuggestion({
      author: this.suggestion.author,
      channel: this.suggestion.channel,
      executor: this.executor,
      guild: this.suggestion.guild,
      id: this.suggestion.id(true),
      message: this.message,
      nickname: Util.userCanDisplayNickname({
        client: this.suggestion.client,
        guild: this.suggestion.guild,
        profile: this.suggestion.userProfile,
        settings: this.suggestion.guildSettings
      }),
      reason: this.response,
      results: this.results!,
      suggestion: this.suggestion.suggestion!
    });

    const message = await logsChannel!.channel.createMessage({ embed });
    this.suggestion.setSuggestionMessage(message);

    return new Promise(resolve => {
      resolve(this);
    });
  }
}
