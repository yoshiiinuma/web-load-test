
import fs from 'fs';
import readline from 'readline';
import rp from 'request-promise';

function usage() {
  console.log("USAGE: npm run exec -- <FILE>");
  console.log("USAGE: node dist/index.js <FILE>");
}

if (process.argv.length < 3) {
  usage();
  process.exit();
}

var filename = process.argv[2];

var getLinks = (file) => {
  var links = [];
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: fs.createReadStream(filename),
      terminal: false
    });
    rl.on('line', (l) => links.push(l));
    rl.on('close', () => resolve(links));
    rl.on('error', (err) => reject(err));
  });
};


getLinks(filename)
  .then((links) => console.log(links))
  .catch((err) => console.log(err));
