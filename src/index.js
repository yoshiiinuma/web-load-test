
import fs from 'fs';
import readline from 'readline';
import rp from 'request-promise';

const usage = () => {
  console.log("USAGE: npm run exec -- <FILE> [OPTION]...");
  console.log("USAGE: node dist/index.js <FILE> [OPTION]...");
  console.log("");
  console.log("   FILE: Contains the list of URLs");
  console.log("   NUMBER-OF-REQUESTS: the number of concurrent requests");
  console.log("   NUMBER-OF-URLS: the number of urls for use");
  console.log("   -t or --timeout <MILLI-SECS>: Stops each request in <MILLI-SECS> after starting it");
  console.log("   -r or --rps <NUM>: Specifies the number of request per second");
  console.log("   -d or --duration <SECS>: Specifies the duration of the test");
  console.log("   -m or --max-req <NUM>: Specifies the maxinum number of the requests");
}

if (process.argv.length < 3) {
  usage();
  process.exit();
}

const filename = process.argv[2];
//const numOfReqs = (process.argv[3]) ? Number(process.argv[3]) : 10;
//const numOfUrls  = (process.argv[4]) ? Number(process.argv[4]) : 10;
const timeout = 30000;
var rps = 20;
var duration = 10;
var limit = 200;

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

const makeRequest = (uri, timeout, results) => {
  
  return new Promise((resolve, reject) => {
    let startTime = process.hrtime(); 
    let statusCode;
    console.log('SENDING: ' + uri);
    rp({ uri, timeout, resolveWithFullResponse: true })
      .then((response) => {
        let latency = process.hrtime(startTime); 
        statusCode = response.statusCode;
        console.log('  DONE: ' + statusCode + ' ' + uri);
        return resolve({ uri, latency, statusCode });
      })
      .catch(err => {
        let latency = process.hrtime(startTime); 
        //results.push({ uri, latency, statusCode })
        if (err.statusCode) {
          statusCode = err.statusCode;
          console.log('  ERROR: ' + statusCode + ' ' + uri);
          //if (statusCode === 503 || statusCode === 504) {
          //  return reject(err);
          //}
          return resolve({ uri, latency, statusCode });
        } else if (err.name === 'RequestError') {
          statusCode = 800;
          console.log('  ' + err.message + ': ' + uri);
          return resolve({ uri, latency, statusCode });
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

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const bulkRequest = async (links, results, timeout, limit, rps) => {
  let requests = [];
  let cnt = 0;
  let loop = true;
  const len = links.length;
  while (loop) {
    let link = links[Math.floor(Math.random() * len)];
    requests.push(makeRequest(link, timeout, results));
    cnt++;
    if (cnt >= limit) loop = false;
    if (loop && cnt > 0 && cnt%rps === 0) {
      console.log('Sleeping');
      await sleep(1000);
    }
  }
  return Promise.all(requests);
};

var results = [];

readLinks(filename)
  //.then((links) => randomSelect(links, numOfUrls))
  .then((links) => bulkRequest(links, results, timeout, limit, rps))
  .then((results) => results.map((r) => console.log(r)))
  .catch((err) => {
    console.log('-----------------------');
    console.log(err)
    console.log('-----------------------');
  });
