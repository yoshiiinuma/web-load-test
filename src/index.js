
import fs from 'fs';
import readline from 'readline';

import requestFunc from './make-request.js';
import { randomRequest, sequentialRequest } from './bulk-request.js';
import { report } from './report.js';

const DEFAULT_TIMEOUT = 30;
const DEFAULT_RPS = 5;
const DEFAULT_DURATION = 10;

const usage = () => {
  console.log("USAGE: npm run exec -- <FILE> [OPTION]...");
  console.log("USAGE: node dist/index.js <FILE> [OPTION]...");
  console.log("");
  console.log("   FILE: Contains the list of URLs");
  console.log("");
  console.log("   OPTIONS:");
  console.log("   -t or --timeout <SECS>:   Timeouts slow requests; DEFAULT " + DEFAULT_TIMEOUT);
  console.log("   -r or --rps <NUM>:        Specifies the number of requests per second; DEFAULT " + DEFAULT_RPS);
  console.log("   -u or --duration <SECS>:  Specifies the duration of the test; DEFAULT " + DEFAULT_DURATION);
  console.log("   -m or --max-req <NUM>:    Specifies the maxinum number of the requests");
  console.log("   -s or --seq:              Sends a request sequentially to each URL from the given list; default random");
  console.log("   -e or --exclude <WORD>:   Specifies a keyword to filter out links");
  console.log("   -D or --DEBUG:            Prints debug messages");
  console.log("   -h or --help:             Shows this usage");
  console.log("");
}

if (process.argv.length < 3) {
  usage();
  process.exit();
}

const filename = process.argv[2];
var timeout = DEFAULT_TIMEOUT * 1000;
var rps = DEFAULT_RPS;
var duration = DEFAULT_DURATION;
var limit;
var exclude = [];
var debug = false;

var bulkRequest = randomRequest;

if (!fs.existsSync(filename)) {
  console.log('File Not Found: ' + filename + "\n");
  usage();
  process.exit();
}

if (process.argv.length > 3) {
  for (let i = 3; i < process.argv.length; i++) {
    let arg = process.argv[i];
    if (arg === '-t' || arg === '--timeout') {
      timeout = Number(process.argv[i+1]) * 1000;
      i++;
    }
    if (arg === '-r' || arg === '--rps') {
      rps = Number(process.argv[i+1]);
      i++;
    }
    if (arg === '-u' || arg === '--duration') {
      duration = Number(process.argv[i+1]);
      i++;
    }
    if (arg === '-m' || arg === '--max-requests') {
      limit = Number(process.argv[i+1]);
      i++;
    }
    if (arg === '-e' || arg === '--exclude') {
      exclude.push(process.argv[i+1]);
      i++;
    }
    if (arg === '-D' || arg === '--DEBUG') {
      debug = true;
    }
    if (arg === '-s' || arg === '--seq') {
      bulkRequest = sequentialRequest;
    }
    if (arg === '-h' || arg === '--help') {
      usage();
      process.exit();
    }
  }
}

if (!limit) limit = rps * duration;
if (limit > rps * duration) limit = rps * duration;

var options = { rps, duration, limit, timeout, debug };
if (debug) console.log(options);

if (exclude.length > 0) {
  options['regExclude'] = new RegExp('(' + exclude.join('|') + ')');
}

const readLinks = (file) => {
  return new Promise((resolve, reject) => {
    let links = [];
    const rl = readline.createInterface({
      input: fs.createReadStream(filename),
      terminal: false
    });
    rl.on('line', (l) => links.push(l));
    rl.on('close', () => resolve(links));
    rl.on('error', (err) => reject(err));
  });
};

const filter = (links, regExclude) => {
  return new Promise((resolve, reject) => {
    if (!regExclude) return resolve(links);

    let r = [];

    for(let l of links) {
      if (regExclude.test(l)) continue;
      r.push(l);
    }
    return resolve(r);
  });
};

readLinks(filename)
  .then((links) => filter(links, options.regExclude))
  .then((links) => bulkRequest(links, requestFunc, options))
  .then((results) => { report(results) })
  .catch((err) => {
    console.log('-----------------------');
    console.log(err)
    console.log('-----------------------');
  });
