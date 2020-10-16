import SuggestionChannel from '../structures/SuggestionChannel';
import { Collection } from '@augu/immutable';
import SuggestionsClient from '../structures/Client';

export default class ChannelManager extends Collection<SuggestionChannel> {
  constructor(public client: SuggestionsClient) {
    super();
  }
}
