#!/usr/bin/env node

class One {
  constructor() {
    console.log("line #2 | Mary Had a Little Lamb");
  }
  print() {
    console.log("line #6 | had");
  }
}
class Two extends One {
  constructor() {
    console.log("line #1 | ----------------------");
    super();
  }
  print() {
    super.print();
    console.log("line #7 | a little");
  }
}
class Three extends Two {
  constructor() {
    super();
    console.log("line #3 | by Sarah Josepha Hale ");
  }

  print() {
    console.log("line #5 | Mary");
    super.print();
  }
}
class Mary extends Three {
  constructor() {
    super();
    console.log("line #4 | ----------------------");
    this.print();
  }
  print() {
    super.print();
    console.log("line #8 | lamb...");
  }
}

const poem = new Mary();
