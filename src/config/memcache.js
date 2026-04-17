const memjs = require('memjs');
const config = require('./env');

let memcacheClient;
let usingInMemoryFallback = false;

const createInMemoryClient = () => {
  const store = new Map();

  const getEntry = (key) => {
    const entry = store.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      store.delete(key);
      return null;
    }

    return entry;
  };

  return {
    get(key, callback) {
      try {
        const entry = getEntry(key);
        callback(null, entry ? entry.value : null);
      } catch (error) {
        callback(error);
      }
    },
    set(key, value, options = {}, callback) {
      try {
        const expiresAt = options.expires ? Date.now() + options.expires * 1000 : null;
        store.set(key, { value, expiresAt });
        callback(null, true);
      } catch (error) {
        callback(error);
      }
    },
    delete(key, callback) {
      try {
        const existed = store.delete(key);
        callback(null, existed);
      } catch (error) {
        callback(error);
      }
    },
    quit() {},
  };
};

const setAsync = (client, key, value, options = {}) =>
  new Promise((resolve, reject) => {
    client.set(key, value, options, (err, success) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(success);
    });
  });

const initMemcache = async () => {
  try {
    memcacheClient = memjs.Client.create(config.memcache.servers);
    await setAsync(memcacheClient, '__memcache_health__', 'ok', { expires: 5 });
    usingInMemoryFallback = false;
    console.log('✓ Memcached connected');
  } catch (error) {
    if (config.memcache.required) {
      console.error('✗ Memcached connection failed:', error.message);
      process.exit(1);
    }

    memcacheClient = createInMemoryClient();
    usingInMemoryFallback = true;
    console.warn('⚠ Memcached unavailable, using in-memory fallback:', error.message);
  }
};

const getMemcacheClient = () => {
  if (!memcacheClient) {
    throw new Error('Memcached client is not initialized');
  }

  return memcacheClient;
};

module.exports = {
  initMemcache,
  getMemcacheClient,
  isUsingInMemoryFallback: () => usingInMemoryFallback,
};
