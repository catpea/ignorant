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

class Pulse extends Subscriptions {
  #value;
  #options;

  constructor(value, options) {
    super();
    this.#value = value;
    this.#options = options;
  }

  get value() {
    return this.get();
  }

  set value(v) {
    this.set(v);
  }

  // raw is used for assignament and unrestricted access

  get() {
    return this.#value;
  }

  set(newValue) {
    if (Object.is(newValue, this.#value)) return;
    this.#value = newValue;
    this.notify(this.#value);
  }

  subscribe(subscriber) {
    //OVERLOADS
    const hasValue = this.#value !== null && this.#value !== undefined;
    if (hasValue) subscriber(this.#value);
    const response = super.subscribe(subscriber);
    return response;
  }

  dispose() {
    super.dispose();
  }

}

class Signal extends Subscriptions {
  map(fn){
    console.log('this would map the signal with a user funcion and return a new signal')
  }
  filter(fn){
    console.log('this would map the signal with a user funcion and return a new signal')
  }
}
