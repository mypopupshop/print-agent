const { app } = require('electron');
const { execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const logger = require('../utils/logger');

const execFileAsync = promisify(execFile);

const TASK_NAME = 'PrintAgent';

function runPowerShell(script) {
  return execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
    { windowsHide: true }
  );
}

// PowerShell single-quoted strings only need '' to escape a single quote.
function psQuote(value) {
  return String(value).replace(/'/g, "''");
}

async function getRegisteredTaskPath() {
  try {
    const { stdout } = await runPowerShell(
      `(Get-ScheduledTask -TaskName '${psQuote(TASK_NAME)}' -ErrorAction Stop).Actions[0].Execute`
    );
    const trimmed = stdout.trim();
    return trimmed || null;
  } catch {
    return null;
  }
}

async function registerAutoStart() {
  if (process.platform !== 'win32') {
    logger.info('Auto-start: not Windows, skipping');
    return false;
  }

  // Don't pollute the user's Task Scheduler with a path to dev electron.exe.
  if (!app.isPackaged) {
    logger.info('Auto-start: dev mode, skipping registration');
    return false;
  }

  const exePath = process.execPath;
  const workingDir = path.dirname(exePath);

  try {
    const existing = await getRegisteredTaskPath();
    if (existing && existing.toLowerCase() === exePath.toLowerCase()) {
      logger.info(`Auto-start: already registered (${exePath})`);
      return true;
    }

    if (existing) {
      logger.info(`Auto-start: path changed (${existing} -> ${exePath}), re-registering`);
    } else {
      logger.info(`Auto-start: registering scheduled task '${TASK_NAME}' for ${exePath}`);
    }

    const script = [
      `$action = New-ScheduledTaskAction -Execute '${psQuote(exePath)}' -WorkingDirectory '${psQuote(workingDir)}'`,
      `$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME`,
      `$settings = New-ScheduledTaskSettingsSet -Hidden -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Seconds 0) -MultipleInstances IgnoreNew -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)`,
      `$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited`,
      `Register-ScheduledTask -TaskName '${psQuote(TASK_NAME)}' -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null`
    ].join('; ');

    await runPowerShell(script);
    logger.info('Auto-start: registered successfully');
    return true;
  } catch (error) {
    logger.error('Auto-start: failed to register', {
      error: error.message,
      stderr: error.stderr && error.stderr.toString()
    });
    return false;
  }
}

async function disableAutoStart() {
  if (process.platform !== 'win32') return false;
  try {
    await runPowerShell(
      `Unregister-ScheduledTask -TaskName '${psQuote(TASK_NAME)}' -Confirm:$false -ErrorAction Stop`
    );
    logger.info('Auto-start: scheduled task removed');
    return true;
  } catch (error) {
    logger.error('Auto-start: failed to disable', {
      error: error.message,
      stderr: error.stderr && error.stderr.toString()
    });
    return false;
  }
}

async function isAutoStartEnabled() {
  if (process.platform !== 'win32') return false;
  return (await getRegisteredTaskPath()) !== null;
}

module.exports = {
  registerAutoStart,
  disableAutoStart,
  isAutoStartEnabled
};
