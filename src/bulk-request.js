
const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const randomRequest = async (links, makeRequest, opts = {}) => {
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
      console.log('Current Requests: ' + cnt);
      await sleep(1000);
    }
  }
  console.log('Total Requests: ' + cnt);
  return Promise.all(requests);
};

export const sequentialRequest = async (links, makeRequest, opts = {}) => {
  let limit = opts.limit || 30;
  const rps = opts.rps || 1;
  const debug = ('debug' in opts) ? opts.debug : false;
  const len = links.length;

  let requests = [];
  let loop = true;
  let cnt = 0;

  if (len < limit) limit = len;

  while (loop) {
    let link = links[cnt];
    requests.push(makeRequest(link));
    cnt++;
    if (cnt >= limit) loop = false;
    if (loop && cnt > 0 && cnt%rps === 0) {
      console.log('Current Requests: ' + cnt);
      await sleep(1000);
    }
  }
  console.log('Total Requests: ' + cnt);
  return Promise.all(requests);
};

