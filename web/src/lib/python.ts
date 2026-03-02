/**
 * python.ts - Utility for calling the Python bridge script from Next.js API routes.
 *
 * Sends a JSON payload to bridge.py via stdin and reads JSON back from stdout.
 * The bridge lives at <project-root>/storage/bridge.py (one directory above web/).
 */

import { execFile } from 'child_process';
import path from 'path';

// ---------------------------------------------------------------------------
// Python executable resolution
// ---------------------------------------------------------------------------

function resolvePython(): string {
  if (process.env.PYTHON_PATH) return process.env.PYTHON_PATH;
  // On Windows, 'py' (the Python Launcher) is the most reliable default.
  // On Unix, 'python3' is standard.
  return process.platform === 'win32' ? 'py' : 'python3';
}

// The Python project root is the parent of the Next.js web/ directory.
const PROJECT_ROOT = path.join(process.cwd(), '..');
const BRIDGE_SCRIPT = path.join(PROJECT_ROOT, 'storage', 'bridge.py');

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface PythonBridgeOptions {
  /** Timeout in milliseconds.  Defaults to 600 000 ms (10 minutes). */
  timeoutMs?: number;
}

/**
 * Run the Python bridge script with `payload` written to its stdin.
 * Returns the parsed JSON object that the script writes to stdout.
 *
 * @throws {Error} with the script's stderr output if the process exits non-zero
 *                 or if stdout cannot be parsed as JSON.
 */
export async function runPythonBridge<T = unknown>(
  payload: Record<string, unknown>,
  options: PythonBridgeOptions = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 600_000;
  const python = resolvePython();
  const input = JSON.stringify(payload);

  return new Promise<T>((resolve, reject) => {
    const child = execFile(
      python,
      [BRIDGE_SCRIPT],
      { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          const detail = stderr?.trim() || error.message;
          reject(new Error(`Python bridge failed: ${detail}`));
          return;
        }

        const raw = stdout.trim();
        if (!raw) {
          reject(new Error('Python bridge returned empty output'));
          return;
        }

        try {
          resolve(JSON.parse(raw) as T);
        } catch {
          reject(
            new Error(
              `Python bridge output is not valid JSON: ${raw.slice(0, 200)}`,
            ),
          );
        }
      },
    );

    // Write the payload to the child's stdin then close the stream so the
    // script sees EOF and starts processing.
    child.stdin?.write(input);
    child.stdin?.end();
  });
}

/**
 * Spawn the Python bridge in the background (fire-and-forget).
 * Returns immediately with the child process; the caller is responsible for
 * listening to the 'close' event if it needs the result.
 *
 * Used by the scan route so it can return 202 before the long pipeline finishes.
 */
export function spawnPythonBridge(payload: Record<string, unknown>) {
  const { spawn } = require('child_process') as typeof import('child_process');
  const python = resolvePython();
  const input = JSON.stringify(payload);

  const child = spawn(python, [BRIDGE_SCRIPT], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  child.stdin.write(input);
  child.stdin.end();

  return child;
}
