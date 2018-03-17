/*
    Create an n-demensional array
    @param length whne 2 is a 2d array
    Source: https://stackoverflow.com/a/966938
*/
function createArray(length) {
  let arr = new Array(length || 0),
    i = length;

  if (arguments.length > 1) {
    let args = Array.prototype.slice.call(arguments, 1);
    while (i--) arr[length - 1 - i] = createArray.apply(this, args);
  }

  return arr;

}
  
  /** Only write t0 console when loggable param is true to preevent console log memory issue in browser */
  function ilog(message, loggable) {
    if (loggable) {
      console.log(message);
    }
  }