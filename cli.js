#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { argv, cwd} from 'node:process';

import haggis from 'haggis';
import { transform } from './index.js';

const template = {
  excludeIntermediate: true,
  source: [],
  destination: ".",
};

const options = {
  strict: true, // property name must be present in the object
  initial: 'source', // what to use as the default name for positional, if you say 'source' you won't need to use -s
  }

const result = haggis(template, options, argv);

for (const file of result.source){
  const inputFile = path.join(cwd(), file);
  const outputFile = path.join(path.resolve(result.destination), file);

  if( fs.accessSync(outputFile, fs.constants.F_OK)){
    throw new Error('File already exists, not overwriting:', outputFile);
  }

  const code = fs.readFileSync(inputFile, 'utf-8');
  const transformed = await transform(code);
  console.log(outputFile, transformed);
  // fs.writeFileSync(outputFile, transformed);

}

function writeFile(filename, data) {
    const filePath = path.join(__dirname, filename);

    // Check if the file already exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (!err) {
            console.error('File already exists, not overwriting:', filename);
            return; // Exit if file exists
        }

        // If the file does not exist, create a write stream
        const writeStream = fs.createWriteStream(filePath);

        writeStream.on('error', (error) => {
            console.error('Error writing to file:', error);
        });

        writeStream.write(data, (err) => {
            if (err) {
                console.error('Error during write:', err);
            } else {
                console.log('Data written to:', filename);
            }
        });

        writeStream.end();
    });
}
