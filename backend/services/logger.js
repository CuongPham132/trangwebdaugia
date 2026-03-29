function toMetaString(meta = {}) {
  const entries = Object.entries(meta).filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (!entries.length) return '';

  const parts = entries.map(([key, value]) => `${key}=${String(value).replace(/\s+/g, '_')}`);
  return ` | ${parts.join(' | ')}`;
}

function ts() {
  return new Date().toISOString();
}

function info(message, meta = {}) {
  console.log(`[${ts()}] ℹ️ ${message}${toMetaString(meta)}`);
}

function success(message, meta = {}) {
  console.log(`[${ts()}] ✅ ${message}${toMetaString(meta)}`);
}

function warn(message, meta = {}) {
  console.warn(`[${ts()}] ⚠️ ${message}${toMetaString(meta)}`);
}

function error(message, meta = {}) {
  console.error(`[${ts()}] ❌ ${message}${toMetaString(meta)}`);
}

module.exports = {
  info,
  success,
  warn,
  error,
};
