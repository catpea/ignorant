export class Animal {
  sneak(){
    console.log('shwooshes');
  }
  speak(){
    console.log('Makes noise');
  }
}
export class Cat extends Animal {
  speak(){
    console.log('Meows');
  }
}
