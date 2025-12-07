/**
 * Get the current screen width
 * @returns {number|undefined} The window inner width, or undefined if window is not available
 */
export function getScreenWidth() {
  if (typeof window !== `undefined`) {
    return window.innerWidth;
  }
}

/**
 * Check if the screen is wide (>= 1024px)
 * @returns {boolean|undefined} True if screen is wide, false otherwise, or undefined if window is not available
 */
export function isWideScreen() {
  if (typeof window !== `undefined`) {
    const windowWidth = window.innerWidth;
    const mediaQueryL = 1024;

    return windowWidth >= mediaQueryL;
  }
}

/**
 * Throttle handler execution by delaying it
 * @param {Object} timeouts - Object storing timeout references
 * @param {string} name - Name/key for this specific timeout
 * @param {number} delay - Delay in milliseconds
 * @param {Function} handler - Function to execute after delay
 */
export function timeoutThrottlerHandler(timeouts, name, delay, handler) {
  if (!timeouts[name]) {
    timeouts[name] = setTimeout(() => {
      timeouts[name] = null;
      handler();
    }, delay);
  }
}

/**
 * Get current date in YYYY-MM-DD format
 * @returns {string} Current date formatted as YYYY-MM-DD
 */
export function currDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = ("0" + (1 + today.getMonth())).slice(-2);
  const day = ("0" + today.getDate()).slice(-2);
  return year + "-" + month + "-" + day;
}
