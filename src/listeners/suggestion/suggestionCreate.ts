import Event from '../../structures/core/Event';
import SuggestionsClient from '../../structures/core/Client';
import Suggestion from '../../structures/suggestions/Suggestion';
import Logger from '../../utils/Logger';

export default class extends Event {
  constructor(client: SuggestionsClient, name: string) {
    super(client, name);
  }

  public async run(suggestion: Suggestion): Promise<any> {
    Logger.event('SUGGESTION_CREATE', `the suggestion content: ${suggestion.suggestion}`);
  }
}
