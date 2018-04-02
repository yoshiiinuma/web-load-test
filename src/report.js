import FastPriorityQueue from 'fastpriorityqueue';
import { getNow, getTimeDiff, toSecs } from './measure.js';

const initSummaryData = (name) => {
  const title = name;
  let totalCnt = 0;
  let totalLatency = 0;
  let max = 0;
  let min = Number.MAX_SAFE_INTEGER;
  let slow = new FastPriorityQueue((a, b) => { return a.latency > b.latency });
  let err = {};

  return {
    push: (r) => {
      let cur = r.latency;
      totalCnt++;
      totalLatency += cur;
      if (cur < min) {
        min = cur;
      }
      if (cur > max) {
        max = cur;
      }
      slow.add(r);
      if (r.error) {
        if (!(r.error in err)) {
          err[r.error] = 0;
        }
        err[r.error] += 1;
      }
    },
    showSlow: (limit = 10) => {
      let cnt = 0;
      if (limit > slow.size) limit = slow.size;

      console.log('---< Slow Requests >----------------------------------------------------------');
      while (!slow.isEmpty() && cnt < limit) {
        let r = slow.poll();
        console.log(toSecs(r.latency) + ' secs: ' + r.uri);
        cnt++;
      }
    },
    showErrorTypes: () => {
      console.log('---< Error Types >------------------------------------------------------------');
      for(const [etype, ecnt] of Object.entries(err)) {
        console.log(etype + ': ' + ecnt);
      }
    },
    show: () => {
      if (totalCnt === 0) return;
      console.log('---< ' + title + ' >----------------------------------------------------------');
      console.log('  Total Requests: ' + totalCnt);
      console.log('     Latency Ave: ' + toSecs(totalLatency / totalCnt));
      console.log('     Latency Max: ' + toSecs(max));
      console.log('     Latency Min: ' + toSecs(min));
    }
  };
};

export const report = (results) => {
  let all = initSummaryData('Total');
  let ok = initSummaryData('200');
  let e3xx = initSummaryData('3xx');
  let e4xx = initSummaryData('404');
  let e5xx = initSummaryData('503/504');
  let e800 = initSummaryData('Timeout');
  let e999 = initSummaryData('Fatal');
  let other = initSummaryData('Other');

  results.map((r) => {
    //console.log(r);
    all.push(r);
    if (r.statusCode) {
      if (r.statusCode === 200) {
        ok.push(r);
      } else if (r.statusCode === 301 || r.statusCode === 302 || r.statusCode === 304) {
        e3xx.push(r);
      } else if (r.statusCode === 404) {
        e4xx.push(r);
      } else if (r.statusCode === 503 || r.statusCode === 504) {
        e5xx.push(r);
      } else if (r.statusCode === 800) {
        e800.push(r);
      } else if (r.statusCode === 999) {
        e999.push(r);
      } else {
        other.push(r);
      }
    } else {
      other.push(r);
    }

  });
  all.show();
  ok.show();
  e3xx.show();
  e4xx.show();
  e5xx.show();
  e800.show();
  e999.show();
  other.show();
  all.showSlow();
  all.showErrorTypes();
}
