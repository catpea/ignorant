export function arraysEqual(a, b){
 return a.length === b.length && a.every((element, index) => element === b[index]);
};
export function print(...args){
  console.log(...args);
}
export function printInfo(...string){
  console.log(`\x1b[34m${string.join(' ')}\x1b[0m`);
}
export function printSuccess(...string){
  console.log(`\x1b[32m${string.join(' ')}\x1b[0m`);
}
export function printError(...string){
  console.log(`\x1b[31m${string.join(' ')}\x1b[0m`);
}
export function printDivider(string){
  console.log(`=== ${string} ===\n`);
}
export function printCode(string){
  console.log(`${string.trim()}\n`);
}

export function printJavaScript(string){
  console.log('```JavaScript\n', `${string.trim()}\n`, '```\n');
}
