
import fs from 'fs';
import readline from 'readline';
import rp from 'request-promise';

const DEFAULT_TIMEOUT = 30;
const DEFAULT_RPS = 5;
const DEFAULT_DURATION = 10;

const usage = () => {
  console.log("USAGE: npm run exec -- <FILE> [OPTION]...");
  console.log("USAGE: node dist/index.js <FILE> [OPTION]...");
  console.log("");
  console.log("   FILE: Contains the list of URLs");
  console.log("   OPTIONS:");
  console.log("   -t or --timeout <SECS>:   Timeouts slow requests; DEFAULT " + DEFAULT_TIMEOUT);
  console.log("   -r or --rps <NUM>:        Specifies the number of requests per second; DEFAULT " + DEFAULT_RPS);
  console.log("   -u or --duration <SECS>:  Specifies the duration of the test; DEFAULT " + DEFAULT_DURATION);
  console.log("   -m or --max-req <NUM>:    Specifies the maxinum number of the requests");
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
var limit = DEFAULT_RPS * DEFAULT_DURATION;
var debug = true;

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
    if (arg === '-D' || arg === '--DEBUG') {
      debug = true;
    }
    if (arg === '-h' || arg === '--help') {
      usage();
      process.exit();
    }
  }
}

if (limit > rps * duration) limit = rps * duration;

var options = { rps, duration, limit, timeout, debug };
if (debug) console.log(options);

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

const randomSelect = (links, limit) => {
  return new Promise((resolve, reject) => {
    let len = links.length;
    if (limit >= len) return resolve(links);

    let i = len;
    const min = len - limit;
    while (i > min) {
      let j = Math.floor(Math.random() * i); 
      i--;
      let temp =  links[i];
      links[i] = links[j];
      links[j] = temp;
    }
    return resolve(links.slice(min));
  });
};

const makeRequest = ((opts = {}) => {
  const timeout = opts.timeout || DEFAULT_TIMEOUT;
  const debug = ('debug' in opts) ? opts.debug : false;
  let seq = 0;

  return (uri) => {
    seq++;
    return new Promise((resolve, reject) => {
      let reqId = seq;
      let startTime = process.hrtime(); 
      let statusCode;
      if (debug) console.log('SENDING: ' + reqId + ' '  + uri);
      rp({ uri, timeout, resolveWithFullResponse: true })
        .then((response) => {
          let latency = process.hrtime(startTime); 
          statusCode = response.statusCode;
          if (debug) console.log('  DONE: ' + statusCode + ' ' + reqId + ' ' + uri);
          return resolve({ reqId, uri, latency, statusCode });
        })
        .catch(err => {
          let latency = process.hrtime(startTime); 
          if (err.statusCode) {
            statusCode = err.statusCode;
            if (debug) console.log('  ERROR: ' + statusCode + ' ' + reqId + ' '  + uri);
            //if (statusCode === 503 || statusCode === 504) {
            //  return reject(err);
            //}
            return resolve({ reqId, uri, latency, statusCode });
          } else if (err.name === 'RequestError') {
            statusCode = 800;
            console.log('  ' + err.message + ': ' + reqId + ' '  + uri);
            return resolve({ reqId, uri, latency, statusCode });
          } else {
            statusCode = 999;
            console.log('=======================');
            console.log(err);
            console.log(Object.keys(err));
            console.log('=======================');
            //return reject(err);
          }
        });
    });
  };
})(options);

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const bulkRequest = async (links, opts = {}) => {
  const limit = opts.limit || 30;
  const rps = opts.rps || 1;
  const debug = ('debug' in opts) ? opts.debug : false;
  const len = links.length;

  let requests = [];
  let loop = true;
  let cnt = 0;

  while (loop) {
    let link = links[Math.floor(Math.random() * len)];
    requests.push(makeRequest(link));
    cnt++;
    if (cnt >= limit) loop = false;
    if (loop && cnt > 0 && cnt%rps === 0) {
      await sleep(1000);
    }
  }
  console.log('LOOP EXIT: ' + cnt);
  return Promise.all(requests);
};

/**
 * Returns:
 *    1 if a > b
 *   -1 if a < b
 *    0 if a == b
 */
const compareHrtime = (a, b) => {
  if (a[0] === b[0]) {
    if (a[1] === b[1]) return 0; 
    if (a[1] > b[1]) {
      return 1;
    } else {
      return -1;
    }
  } else if (a[0] > b[0]) {
    return 1;
  } else {
    return -1;
  }
}


const toSecs = (a) => {
  let secs = a[0];
  let ms = Math.floor(a[1] / 1000000);
  secs += ms / 1000;

  //return secs;
  return strHrtime(a) + ' => ' + secs;
}

const strHrtime = (a) => {
  let ms = Math.floor(a[1] / 1000000);

  return '[' + a[0] + ', ' + a[1] + ']';
}

const addHrtime = (a, b) => {
  let secs = a[0] + b[0];
  let ns = a[1] + b[1];
  let carry = ns - (ns % 1000000000);
  ns = ns - carry;
  secs += carry / 1000000000;

  return [secs, ns];
}

const divideHrtime = (hr, n) => {
  let secs = hr[0] / n;
  let ns = hr[1];
  let ms = secs % 1;

  secs = secs - ms;
  ms = ms * 1000000;
  ms = ms - (ms % 1);
  ns = ns + ms * 1000;
  ns = ns / n;
  ns = ns - (ns % 1);

  return [secs, ns];
}

const initSummary = () => {
  let totalCnt = 0;
  let totalLatency = [0, 0];
  let max = [0, 0];
  let min = [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER];

  return {
    push: (r) => {
      let cur = r.latency;
      totalCnt++;
      totalLatency = addHrtime(totalLatency, cur);
      if (compareHrtime(min, cur) > 0) {
        min = cur;
      }
      if (compareHrtime(max, cur) < 0) {
        max = cur;
      }
    },
    show: () => {
       console.log('Total Requests: ' + totalCnt);
       console.log('   Latency Ave: ' + toSecs(divideHrtime(totalLatency, totalCnt)));
       console.log('   Latency Max: ' + toSecs(max));
       console.log('   Latency Min: ' + toSecs(min));
    }
  };
};

const report = (results) => {
  let all = initSummary();

  console.log('-- Printing Results ------------------------------------------------------');
  results.map((r) => {
    console.log(r);
    all.push(r);

  });
  console.log('-- Printing Summary ------------------------------------------------------');
  all.show();
}

readLinks(filename)
  //.then((links) => randomSelect(links, numOfUrls))
  .then((links) => bulkRequest(links, options))
  .then((results) => { report(results) })
  .catch((err) => {
    console.log('-----------------------');
    console.log(err)
    console.log('-----------------------');
  });
