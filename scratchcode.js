class A {
  constructor(){ console.log('a'); }
}
class B extends A {
  constructor(){ super(); console.log('b'); }
}
class C extends B {
  constructor(){ super(); console.log('c'); }
}
class D extends C {
  constructor(){ super(); console.log('d'); }
}

new D();
