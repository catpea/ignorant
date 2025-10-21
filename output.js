import fs from "fs"

function test() {
  console.log("works great!")
}

export function test1() {
  console.log("works great!")
}

export default class Pulse {
  static Access = Symbol("I.am.Signal")
  static Value = Symbol("Signal.setValue")
  #value
  #options
  #disposables = new Set()
  #subscribers = new Set()
  constructor(value, options) {
    this.#value = value
    this.#options = options
  }
  get options() {
    return this.#options
  }
  get value() {
    return this.get()
  }
  set value(v) {
    this.set(v)
  }
  get raw() {
    return this.#value
  }
  set raw(newValue) {
    this.#value = newValue
  }
  get subscribers() {
    return this.#subscribers
  }
  get() {
    return this.#value
  }
  set(newValue) {
    if (Object.is(newValue, this.#value)) return
    this.#value = newValue
    this.notify(this.#value)
  }
  subscribe(subscriber) {
    const hasValue = this.#value !== null && this.#value !== undefined
    if (hasValue) subscriber(this.#value)
    const response = super.subscribe(subscriber)
    return response
  }
  dispose() {
    super.dispose()
  }
  collect(...input) {
    input
      .flat(Infinity)
      .forEach((disposable) =>
        this.#disposables.add(
          disposable.dispose ? disposable : { dispose: disposable },
        ),
      )
  }
  notify(value) {
    for (const subscriber of this.#subscribers) subscriber(value)
  }
}
