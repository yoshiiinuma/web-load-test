
import rp from 'request-promise';
import { getNow, getTimeDiff, toSecs } from './measure.js';

const DEFAULT_TIMEOUT = 30;

export default (opts = {}) => {
  const timeout = opts.timeout || DEFAULT_TIMEOUT;
  const debug = ('debug' in opts) ? opts.debug : false;
  let seq = 0;

  return (uri) => {
    seq++;
    return new Promise((resolve, reject) => {
      let reqId = seq;
      let startTime = getNow();
      let statusCode;
      if (debug) console.log('SENDING: ' + reqId + ' '  + uri);
      rp({ uri, timeout, resolveWithFullResponse: true })
        .then((response) => {
          let latency = getTimeDiff(startTime);
          statusCode = response.statusCode;
          if (debug) console.log('  DONE: ' + statusCode + ' ' + toSecs(latency) + ' ' + reqId + ' ' + uri);
          return resolve({ reqId, uri, latency, statusCode });
        })
        .catch(err => {
          let latency = getTimeDiff(startTime);
          if (err.statusCode) {
            statusCode = err.statusCode;
            //if (debug) console.log('  ERROR: ' + statusCode + ' ' + toSecs(latency) + ' ' + reqId + ' '  + uri);
            console.log('  ERROR: ' + statusCode + ' ' + toSecs(latency) + ' ' + reqId + ' '  + uri);
            //if (statusCode === 503 || statusCode === 504) {
            //  return reject(err);
            //}
            //return resolve({ reqId, uri, latency, statusCode });
            return resolve({ reqId, uri, latency, statusCode, error: err.message });
          } else if (err.name === 'RequestError') {
            statusCode = 800;
            console.log('  ' + err.message + ': ' + toSecs(latency) + ' ' + reqId + ' '  + uri);
            return resolve({ reqId, uri, latency, statusCode, error: err.message });
          } else {
            statusCode = 999;
            console.log('=======================');
            console.log(err);
            console.log(Object.keys(err));
            console.log('=======================');
            console.log('  FATAL: 999 ' + toSecs(latency) + ' ' + reqId + ' '  + uri);
            return resolve({ reqId, uri, latency, statusCode, error: err.message });
            //return reject(err);
          }
        });
    });
  };
};

