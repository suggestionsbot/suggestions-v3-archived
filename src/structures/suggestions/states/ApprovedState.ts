import { User } from 'eris';

import BaseState from './BaseState';
import { ResultEmoji, StatusUpdates, SuggestionStateData, SuggestionStateType, VoteResult } from '../../../types';
import Suggestion from '../Suggestion';

export default class ApprovedState extends BaseState {
  readonly state: SuggestionStateType;
  executor: User;
  target?: User;
  response?: string;
  results?: Array<ResultEmoji>;
  voted?: Array<VoteResult>;

  constructor(suggestion: Suggestion, data: SuggestionStateData) {
    super(suggestion, data);

    this.state = 'APPROVED';
    this.executor = data.executor;
    if (data.target) this.target = data.target;
    if (data.response) this.response = data.response;
    if (data.results) this.results = data.results;
    if (data.voted) this.voted = data.voted;
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
    return new Promise((resolve) => resolve(this));
  }
}
