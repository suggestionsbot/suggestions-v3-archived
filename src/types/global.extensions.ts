type Dictionary<V = any> = Record<string, V>;

interface String {
  toProperCase(): string;
}

interface Array<T> {
  random(): T;
  isEmpty(arr?: Array<T>): boolean
}

Object.defineProperty(String.prototype, 'toProperCase', {
  value: function() {
    return this.replace(/([^\W_]+[^\s-]*) */g, function(txt: string) {return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
  }
});

Object.defineProperty(Array.prototype, 'random', {
  value: function() {
    return this[Math.floor(Math.random() * this.length)];
  }
});

Object.defineProperty(Array, 'isEmpty', {
  value: function(arr: Array<any>) {
    return !(arr.length);
  }
});

Object.defineProperty(Array.prototype, 'isEmpty', {
  value: function() {
    return !(this.length);
  }
});

