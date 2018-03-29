
/**
 * Retuns currentime in millisecs
 */
export const getNow = () => {
  let now = process.hrtime();
  return now[0] * 1000 + now[1] / 1000000;
}

export const getTimeDiff = (time_in_ms) => {
  return getNow() - time_in_ms;
}

export const toSecs = (ms) => {
  let secs = ms / 1000;
  return secs.toFixed(3);
}

