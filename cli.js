#!/usr/bin/env node
import fs from 'node:fs';
import { mkdir, access } from 'node:fs/promises';
import { argv, cwd} from 'node:process';
import { dirname, extname, join as pathJoin, resolve as pathResolve } from 'node:path';

import haggis from 'haggis';
import { transform, extractClasses } from './index.js';

const template = {
  help: false,
  classExtractionMode: true, // instead of transforming the file, transform code and then save Classes as separate files
  excludeIntermediateClasses: true,
  sourceFiles: [],
  destinationDirectory: "dist",
};

const config = {
  strict: true, // property name must be present in the object
  initial: 'sourceFiles', // what to use as the default name for positional, if you say 'source' you won't need to use -s
  }

const helpMe = (argv.length === 2);
if(helpMe){
  console.log(`ignorant: try 'ignorant --help' for more information`);
  process.exit(1)
}

// arg options parser
const options = haggis(template, config, argv);


if(options.help){
  console.log(`Usage: ignorant <files...> -d <path> [options...]`)
  const intros = []
  for(const name in template){
    const isBool = (typeof template[name] === 'boolean');
    let tag = ``;
    if((typeof template[name] === 'boolean')){
      tag = ``
    }else if(Array.isArray(template[name])){
      tag = ` <${lastWord(name)}...>`;
    }else{
      tag = ` <${lastWord(name)}>`;
    }
    const intro = ` -${name[0]}, --${name}${tag}`;
    const description = camelToSentence(name);
    intros.push([intro, description]);
  }
  const width = intros.map(([a])=>a.length).reduce((a,c)=>c>a?c:a,0)+1;
  for(const [intro, description] of intros){
    const spacer = ' '.repeat(width-intro.length);
    console.log(intro + spacer + description);
  }
  process.exit(1)
}

const operations = [];

for (const file of options.sourceFiles){
  const inputFile = pathJoin(cwd(), file);
  const outputDir = pathJoin(pathResolve(options.destinationDirectory));
  const outputFile = pathJoin(pathResolve(options.destinationDirectory), file);
  operations.push({
    outputDir,
    inputFile,
    outputFile,
  });
}

if(options.classExtractionMode){
  // class extraction
  for (const {inputFile, outputDir} of operations){
    await ensureDir(outputDir);
    const code = fs.readFileSync(inputFile, 'utf-8');
    // standard transformation
    const transformed = await transform(code);
    // but then we split
    const extractedClasses = extractClasses(transformed);
    // save
    for(const {className, content} of extractedClasses) {
      const outputFile = pathJoin(pathResolve(outputDir, className + '.js'));
      fs.writeFileSync(outputFile, content);
    }

  }
}else{
  // no class extraction
  for (const {inputFile, outputFile} of operations){
    await ensureDir(outputFile);
    const code = fs.readFileSync(inputFile, 'utf-8');
    const transformed = await transform(code);
    fs.writeFileSync(outputFile, transformed);
  }
}

async function ensureDir(pathInput) {
  try {
    // Check if the directory or file path exists
    await access(pathInput);
  } catch {
    // If it doesn't exist, ensure the directory structure is created
    const hasExtension = extname(pathInput) !== '';
    // Run dirname only when an extension is present
    const dirPath = hasExtension ? dirname(pathInput) : pathInput;
    await mkdir(dirPath, { recursive: true });
  }
}
function camelToSentence(str) {
  // Insert a space before each uppercase letter (except the first character)
  const spaced = str.replace(/([a-z])([A-Z])/g, '$1 $2');
  // Lower‑case the whole string, then capitalize the first character
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}
function lastWord(str=""){
  const spaced = str.replace(/([a-z])([A-Z])/g, '$1 $2');
  const words = spaced.split(' ');
  return words[words.length-1].toLowerCase();
}
