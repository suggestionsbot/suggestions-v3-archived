type Dictionary<V = any> = Record<string, V>;

interface String {
  toProperCase(): string;
}

interface Array<T> {
  random(): T;
}

String.prototype.toProperCase = function() {
  return this.replace(/([^\W_]+[^\s-]*) */g, function(txt) {return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

Array.prototype.random = function() {
  return this[Math.floor(Math.random() * this.length)];
};
