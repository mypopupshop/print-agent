# Print Agent - Project Summary

Silent print agent for Windows POS systems. Runs as a background Electron app with system tray, providing a REST API for printing receipts, labels, and A4 documents.

## Quick Reference

| Component | Location | Purpose |
|-----------|----------|---------|
| Entry Point | `src/main/index.js` | Electron main process, app lifecycle |
| API Server | `src/api/server.js` | Express REST API (default port: 6319) |
| Routes | `src/api/routes/` | Print, label, status endpoints |
| Printer Pool | `src/services/printer-pool.js` | Singleton managing all printer connections |
| Print Queue | `src/services/queue/print-queue.js` | Async job processing with retry |
| Job Tracker | `src/services/queue/job-tracker.js` | In-memory job status tracking |
| Config | `config/config.json` | Runtime configuration |

## Directory Structure

```
src/
├── api/
│   ├── middleware/          # logger, validator, error-handler
│   ├── routes/              # print.js, label.js, printers.js
│   └── server.js            # Express app setup
├── config/
│   └── config-loader.js     # Joi-validated config loading
├── main/
│   ├── index.js             # Electron entry point
│   └── tray.js              # System tray management
├── services/
│   ├── printers/
│   │   ├── base-printer.js      # Abstract base class
│   │   ├── escpos-printer.js    # ESC/POS thermal printers
│   │   ├── tspl-printer.js      # TSPL/ZPL label printers
│   │   ├── pdf-printer.js       # PDF/HTML to A4 printer
│   │   └── raw-print-helper.js  # PowerShell Win32 API wrapper
│   ├── queue/
│   │   ├── print-queue.js       # Async queue with retry
│   │   └── job-tracker.js       # Job status storage
│   └── templates/
│       └── label-templates.js   # TSPL template system
└── utils/
    └── logger.js                # Winston logging
```

## API Endpoints

### Print Operations
- `POST /print/receipt` - ESC/POS thermal printing (base64 or raw commands)
- `POST /print/label` - TSPL/ZPL label printing
- `POST /print/a4` - PDF/HTML/URL to A4 printer

### Label Templates
- `GET /label/templates` - List available templates
- `GET /label/templates/:name` - Get template details
- `POST /label` - Print using template with data

### Status
- `GET /printers` - List configured printers with status
- `GET /status` - System status and queue stats
- `GET /jobs` - Print job history
- `GET /health` - Health check

## Printer Types

| Type | Class | Protocol | Print Method |
|------|-------|----------|--------------|
| `epson` | ESCPOSPrinter | ESC/POS | raw-print-helper (PowerShell + C# P/Invoke) |
| `tsc` | TSPLPrinter | TSPL/ZPL | raw-print-helper (PowerShell + C# P/Invoke) |
| `a4` | PDFPrinter | PDF | Puppeteer + pdf-to-printer |

## Print Job Flow

1. HTTP request → API route validates input
2. Job enqueued (non-blocking, immediate response with jobId)
3. Queue processes sequentially (concurrency: 1)
4. Printer retrieved from pool (auto-reconnect if offline)
5. Print executed via appropriate printer class
6. On failure: retry up to 3 times with exponential backoff (2s, 4s, 8s)
7. Job status tracked in memory (last 1000 jobs)

## Configuration Schema

```json
{
  "epson": "PRINTER_NAME",       // Windows printer name for receipts
  "tsc": "PRINTER_NAME",         // Windows printer name for labels
  "a4": "PRINTER_NAME",          // Windows printer name for A4
  "port": 6319,                  // API server port
  "logLevel": "info",            // Winston log level
  "retryAttempts": 3,            // Max retry attempts
  "retryDelay": 2000,            // Base retry delay (ms)
  "queueConcurrency": 1,
  "pdf": {
    "staticHtmlTimeout": 3000,
    "externalResourceTimeout": 10000,
    "urlTimeout": 15000
  }
}
```

## Key Patterns

- **Singleton Pattern**: PrinterPool, PrintQueue, JobTracker, Logger
- **Abstract Base Class**: BasePrinter extended by all printer implementations
- **Non-blocking API**: Jobs enqueued and return immediately
- **Automatic Retry**: Exponential backoff on print failures
- **Local-only Access**: CORS restricts to localhost and LAN IPs

## Error Codes

`PRINTER_OFFLINE`, `PRINTER_NOT_FOUND`, `PRINTER_NOT_CONFIGURED`, `PRINT_FAILED`, `INVALID_DATA`, `INVALID_TYPE`, `INVALID_REQUEST`, `INTERNAL_ERROR`, `CONFIG_ERROR`, `ACCESS_DENIED`, `QUEUE_FULL`, `JOB_NOT_FOUND`

## Dependencies

- **Electron** (v28): Desktop app framework
- **Express** (v4.18): REST API
- **Puppeteer** (v21.6): HTML→PDF conversion
- **pdf-to-printer** (v5.6): Windows print spooler
- **escpos** (v3.0.0-alpha.6): ESC/POS protocol
- **Winston** (v3.11): Logging with daily rotation
- **Joi** (v17.11): Request validation
- **nanoid** (v3.3): Job ID generation
- **auto-launch** (v5.0): System startup registration

## Startup Sequence

1. Electron ready → `initialize()`
2. Load and validate config
3. Initialize printer pool (connect all printers)
4. Initialize print queue
5. Start Express server on configured port
6. Create system tray icon
7. Register auto-launch on boot

## Common Tasks

### Adding a new printer type
1. Create class extending `BasePrinter` in `src/services/printers/`
2. Implement `connect()`, `disconnect()`, `print()`, `checkStatus()`
3. Add to printer pool initialization in `printer-pool.js`
4. Add config validation in `config-loader.js`
5. Add route handler in `src/api/routes/print.js`

### Adding a new API endpoint
1. Add route in appropriate file under `src/api/routes/`
2. Add Joi validation schema if needed
3. Register route in `server.js` if new file

### Debugging print issues
1. Check `logs/print-agent-YYYY-MM-DD.log` for job status
2. Check `logs/error.log` for failures
3. Use `GET /jobs` to see recent job history
4. Use `GET /printers` to check printer online status
