import { User } from 'eris';

import Suggestion from '../Suggestion';
import { ResultEmoji, StatusUpdates, SuggestionStateData, SuggestionStateType, VoteResult } from '../../../types';

export default abstract class BaseState {
  abstract state: SuggestionStateType;
  abstract executor: User;
  abstract target?: User;
  abstract response?: string;
  abstract results?: Array<ResultEmoji>;
  abstract voted?: Array<VoteResult>;

  protected constructor(public suggestion: Suggestion, data: SuggestionStateData) {}

  get currentState(): SuggestionStateType {
    return this.suggestion.state;
  }

  abstract getData(): Record<string, unknown>;

  abstract post(): Promise<this>;
}
