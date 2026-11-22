const fs = require('fs/promises');
const path = require('path');
const config = require('../config/env');

/**
 * Creates an audit logger that appends one JSON object per line to
 * <logDir>/audit.log using non-blocking fs calls.
 *
 * logEvent() never throws or rejects: a logging failure is reported on the
 * console but must never fail the user's request. writeEvent() does reject,
 * for the worker, which retries a job whose log write failed.
 */
function createAuditLogger(logDir) {
  const logFile = path.join(logDir, 'audit.log');
  let dirReady = null;

  function ensureLogDir() {
    // Create logs/ on first use; retry next time if creation failed.
    dirReady ??= fs.mkdir(logDir, { recursive: true }).catch((error) => {
      dirReady = null;
      throw error;
    });
    return dirReady;
  }

  /** Appends one event. Rejects on failure (used by the worker so jobs can retry). */
  async function writeEvent(event, details = {}) {
    const line = `${JSON.stringify({ timestamp: new Date().toISOString(), event, ...details })}\n`;
    await ensureLogDir();
    await fs.appendFile(logFile, line, 'utf8');
  }

  /** Appends one event and never rejects (used in request handling). */
  async function logEvent(event, details = {}) {
    try {
      await writeEvent(event, details);
    } catch (error) {
      console.error(`Audit log write failed (${event}): ${error.message}`);
    }
  }

  return { logEvent, writeEvent, logFile };
}

module.exports = { createAuditLogger, ...createAuditLogger(config.logDir) };
