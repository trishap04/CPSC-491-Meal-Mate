(function attachMealMateNetwork(global) {
  const DEFAULT_RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

  function wait(ms) {
    return new Promise(resolve => {
      global.setTimeout(resolve, ms);
    });
  }

  function getBackoffDelay(attempt, baseDelayMs, maxDelayMs) {
    const exponentialDelay = baseDelayMs * (2 ** attempt);
    return Math.min(exponentialDelay, maxDelayMs);
  }

  async function fetchWithRetry(url, options = {}) {
    const {
      retries = 2,
      retryDelayMs = 500,
      maxDelayMs = 4000,
      retryMethods = ['GET', 'HEAD', 'OPTIONS', 'POST'],
      retryStatusCodes = DEFAULT_RETRYABLE_STATUS_CODES,
      ...fetchOptions
    } = options;

    const method = (fetchOptions.method || 'GET').toUpperCase();
    const canRetryMethod = retryMethods.includes(method);
    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const response = await global.fetch(url, fetchOptions);

        if (!response.ok && canRetryMethod && retryStatusCodes.has(response.status) && attempt < retries) {
          await wait(getBackoffDelay(attempt, retryDelayMs, maxDelayMs));
          continue;
        }

        return response;
      } catch (error) {
        lastError = error;
        if (!canRetryMethod || attempt >= retries) {
          throw error;
        }

        await wait(getBackoffDelay(attempt, retryDelayMs, maxDelayMs));
      }
    }

    throw lastError || new Error('Network request failed.');
  }

  class ResilientWebSocket {
    constructor(url, options = {}) {
      this.url = url;
      this.options = {
        maxReconnectAttempts: 5,
        reconnectDelayMs: 1000,
        maxDelayMs: 10000,
        protocols: undefined,
        ...options,
      };
      this.reconnectAttempts = 0;
      this.manuallyClosed = false;
      this.socket = null;

      this.onopen = () => {};
      this.onmessage = () => {};
      this.onclose = () => {};
      this.onerror = () => {};
    }

    connect() {
      this.manuallyClosed = false;
      this.socket = new WebSocket(this.url, this.options.protocols);

      this.socket.addEventListener('open', event => {
        this.reconnectAttempts = 0;
        this.onopen(event);
      });

      this.socket.addEventListener('message', event => {
        this.onmessage(event);
      });

      this.socket.addEventListener('error', event => {
        this.onerror(event);
      });

      this.socket.addEventListener('close', event => {
        this.onclose(event);
        if (!this.manuallyClosed) {
          this.scheduleReconnect();
        }
      });

      return this.socket;
    }

    scheduleReconnect() {
      if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
        return;
      }

      const delay = getBackoffDelay(
        this.reconnectAttempts,
        this.options.reconnectDelayMs,
        this.options.maxDelayMs
      );
      this.reconnectAttempts += 1;

      global.setTimeout(() => {
        this.connect();
      }, delay);
    }

    send(payload) {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(payload);
      }
    }

    close(code, reason) {
      this.manuallyClosed = true;
      if (this.socket) {
        this.socket.close(code, reason);
      }
    }
  }

  global.MealMateNetwork = {
    fetchWithRetry,
    wait,
    ResilientWebSocket,
  };
})(window);
