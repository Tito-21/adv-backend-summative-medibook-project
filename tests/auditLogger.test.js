const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { createAuditLogger } = require('../src/utils/auditLogger');

let tempDir;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'medibook-audit-'));
});

afterEach(async () => {
  jest.restoreAllMocks();
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe('audit logger', () => {
  test('creates the log directory on first use and appends one JSON object per line', async () => {
    const logDir = path.join(tempDir, 'does', 'not', 'exist', 'yet');
    const { logEvent, logFile } = createAuditLogger(logDir);

    await logEvent('APPOINTMENT_BOOKED', { appointment_id: 1 });
    await logEvent('APPOINTMENT_CANCELLED', { appointment_id: 1, refund_amount: 75 });

    const lines = (await fs.readFile(logFile, 'utf8')).trim().split('\n').map(JSON.parse);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ event: 'APPOINTMENT_BOOKED', appointment_id: 1 });
    expect(lines[1]).toMatchObject({ event: 'APPOINTMENT_CANCELLED', refund_amount: 75 });
    expect(new Date(lines[0].timestamp).toString()).not.toBe('Invalid Date');
  });

  test('a write failure is reported but never thrown to the caller', async () => {
    // A regular file where the log directory should be makes mkdir fail.
    const blocker = path.join(tempDir, 'blocked');
    await fs.writeFile(blocker, 'not a directory');
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { logEvent } = createAuditLogger(path.join(blocker, 'logs'));

    await expect(logEvent('APPOINTMENT_BOOKED', { appointment_id: 2 })).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('Audit log write failed'));
  });
});
