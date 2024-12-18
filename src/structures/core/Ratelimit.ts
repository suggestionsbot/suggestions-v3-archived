import SuggestionsClient from './Client';
import RatelimitManager from '../../managers/RatelimitManager';

export default class Ratelimit {
  ignored: boolean;
  current: boolean;
  singleUsages: number;
  public totalUsages: number;

  constructor(public client: SuggestionsClient, public finishAt: number, public increasingRate: number) {
    this.ignored = false;
    this.current = false;
    this.singleUsages = 0;
    this.totalUsages = 0;
  }

  get manager(): RatelimitManager {
    return this.client.ratelimiters;
  }

  ignoreOnce(ignored: boolean): void {
    this.ignored = ignored;
  }

  increateRatelimit(): void {
    this.finishAt += this.increasingRate * this.singleUsages;
    if (!this.current) {
      this.totalUsages++;
      this.current = true;
    }
  }

  updateRatelimit(finishAt: number, increasingRate: number): void {
    this.finishAt = finishAt;
    this.increasingRate = increasingRate;
    this.singleUsages = 0;
    this.current = false;
    if (this.totalUsages !== 0) this.finishAt += increasingRate * this.totalUsages;
  }
}
