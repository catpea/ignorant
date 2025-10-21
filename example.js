import fs from 'fs';

function test (){
  console.log('works great!')
}

export function test1 (){
  console.log('works great!')
}

class Symbols {
   static Access = Symbol('I.am.Signal');
   static Value  = Symbol('Signal.setValue');
}

class Collections extends Symbols {
  #disposables = new Set();
  collect(...input) {
    input.flat(Infinity).forEach((disposable) => this.#disposables.add(disposable.dispose ? disposable : { dispose: disposable }));
  }
  dispose() {
    this.#disposables.forEach((disposable) => disposable.dispose());
    this.#disposables.clear(); // execute and clear disposables
  }
}

class Subscriptions extends Collections {
  #subscribers = new Set();
  get subscribers(){
    return this.#subscribers;
  }
  subscribe(subscriber) {
    this.#subscribers.add(subscriber);
    return () => this.#subscribers.delete(subscriber); // IMPORTANT FEATURE: return unsubscribe function, execute this to stop getting notifications.
  }
  notify(value) {
    for (const subscriber of this.#subscribers) subscriber(value);
  }
  dispose() {
    super.dispose();
    this.#subscribers.clear();
  }
}

export default class Pulse extends Subscriptions {
  #value;
  #options;

  constructor(value, options) {
    super();
    this.#value = value;
    this.#options = options;
  }

  get options() {
    return this.#options;
  }

  get value() {
    return this.get();
  }

  set value(v) {
    this.set(v);
  }

  // raw is used for assignament and unrestricted access
  get raw() {
    return this.#value;
  }
  set raw(newValue) {
    this.#value = newValue;
  }

  get() {
    return this.#value;
  }

  set(newValue) {
    if (Object.is(newValue, this.#value)) return;
    this.#value = newValue;
    this.notify(this.#value);
  }
  subscribe(subscriber) {
    const hasValue = this.#value !== null && this.#value !== undefined;
    if (hasValue) subscriber(this.#value);
    const response = super.subscribe(subscriber);
    return response;
  }
  dispose() {
    super.dispose();
  }

}
