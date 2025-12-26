const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const logger = require('../../utils/logger');

/**
 * Send raw bytes to Windows printer using .NET PrintDocument
 * This bypasses the Windows print spooler formatting
 */
async function sendRawToPrinter(printerName, data) {
  const tempDataFile = path.join(os.tmpdir(), `raw-print-${Date.now()}.prn`);
  const tempScriptFile = path.join(os.tmpdir(), `raw-print-${Date.now()}.ps1`);

  try {
    // Write data to temp file
    await fs.writeFile(tempDataFile, data);

    // Create PowerShell script file
    const psScript = `
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Printing

$printerName = '${printerName.replace(/'/g, "''")}'
$filePath = '${tempDataFile.replace(/\\/g, '\\\\').replace(/'/g, "''")}'

# Read file as bytes
$bytes = [System.IO.File]::ReadAllBytes($filePath)

# Use RawPrinterHelper class
Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrinterHelper {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

    public static bool SendBytesToPrinter(string szPrinterName, byte[] pBytes) {
        IntPtr hPrinter = new IntPtr(0);
        DOCINFOA di = new DOCINFOA();
        bool bSuccess = false;

        di.pDocName = "RAW Print Job";
        di.pDataType = "RAW";

        if (OpenPrinter(szPrinterName.Normalize(), out hPrinter, IntPtr.Zero)) {
            if (StartDocPrinter(hPrinter, 1, di)) {
                if (StartPagePrinter(hPrinter)) {
                    IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(pBytes.Length);
                    Marshal.Copy(pBytes, 0, pUnmanagedBytes, pBytes.Length);
                    int dwWritten = 0;
                    bSuccess = WritePrinter(hPrinter, pUnmanagedBytes, pBytes.Length, out dwWritten);
                    Marshal.FreeCoTaskMem(pUnmanagedBytes);
                    EndPagePrinter(hPrinter);
                }
                EndDocPrinter(hPrinter);
            }
            ClosePrinter(hPrinter);
        }

        if (!bSuccess) {
            int error = Marshal.GetLastWin32Error();
            throw new Exception("Failed to print. Error code: " + error);
        }

        return bSuccess;
    }
}
"@

try {
    $result = [RawPrinterHelper]::SendBytesToPrinter($printerName, $bytes)
    if ($result) {
        Write-Host "SUCCESS"
        exit 0
    } else {
        Write-Host "FAILED"
        exit 1
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
    exit 1
}
`;

    // Write PowerShell script to file
    await fs.writeFile(tempScriptFile, psScript, 'utf8');

    // Execute PowerShell script file
    try {
      const output = execSync(
        `powershell.exe -ExecutionPolicy Bypass -File "${tempScriptFile}"`,
        { encoding: 'utf8', timeout: 30000 }
      );

      logger.debug(`Raw print output: ${output}`);

      if (output.trim().includes('SUCCESS')) {
        logger.debug(`Raw print successful to ${printerName}`);
      } else {
        throw new Error(`Raw print failed: ${output}`);
      }
    } finally {
      // Cleanup temp files
      await fs.unlink(tempDataFile).catch(() => {});
      await fs.unlink(tempScriptFile).catch(() => {});
    }
  } catch (error) {
    // Cleanup on error
    await fs.unlink(tempDataFile).catch(() => {});
    await fs.unlink(tempScriptFile).catch(() => {});

    logger.error(`Raw print error: ${error.message}`);
    throw error;
  }
}

module.exports = { sendRawToPrinter };
