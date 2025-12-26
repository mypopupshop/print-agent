# Print Agent

Silent Print Agent - A background Windows application that provides a local REST API for printing to thermal receipt printers, label printers, and A4 printers from browser-based POS systems.

## Features

- **Background Service**: Runs silently in the system tray
- **REST API**: Local HTTP API on `http://localhost:6319`
- **Silent Printing**: No user dialogs or confirmations
- **Multiple Printer Types**:
  - ESC/POS thermal receipt printers (Epson)
  - TSPL/ZPL label printers (TSC)
  - A4 PDF/HTML printers (Canon)
- **Print Queue**: Asynchronous job processing with retry logic
- **Auto-start**: Launches automatically on system boot
- **Persistent Connections**: Printer connections remain active for fast printing

## System Requirements

- **OS**: Windows 10/11 (64-bit)
- **RAM**: 512MB minimum
- **Disk**: 200MB free space
- **Node.js**: 18+ (for development)

## Installation

### Pre-built Installer

1. Download the latest `PrintAgent-Setup.exe` from releases
2. Run the installer
3. Configure printer names in `config/config.json`
4. Restart the application

### From Source

```bash
# Clone repository
git clone <repository-url>
cd print-agent

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build installer
npm run build
```

## Configuration

Edit `config/config.json` to configure printer names:

```json
{
  "epson": "EPSON_TM_M30",
  "tsc": "TSC_TTP_244",
  "a4": "Canon_LBP2900",
  "port": 6319,
  "logLevel": "info",
  "retryAttempts": 3,
  "retryDelay": 2000,
  "queueConcurrency": 1
}
```

**Printer Names**: Use exact names as shown in Windows Devices and Printers.

## API Endpoints

### POST /print/receipt

Print ESC/POS commands to thermal receipt printer.

**Request:**
```json
{
  "data": "base64_encoded_escpos_commands"
}
```

**Response:**
```json
{
  "status": "ok",
  "jobId": "1703012345678-abc123def"
}
```

### POST /print/label

Print TSPL/ZPL commands to label printer.

**Request:**
```json
{
  "data": "SIZE 40 mm, 30 mm\nTEXT 40,40,\"3\",0,1,1,\"#123\"\nPRINT 1"
}
```

**Response:**
```json
{
  "status": "ok",
  "jobId": "1703012345678-xyz789"
}
```

### POST /print/a4

Print PDF or HTML to A4 printer.

**PDF Request:**
```json
{
  "type": "pdf",
  "content": "base64_encoded_pdf_data"
}
```

**HTML Request:**
```json
{
  "type": "html",
  "content": "<html><body><h1>Invoice #123</h1></body></html>",
  "options": {
    "format": "A4",
    "orientation": "portrait"
  }
}
```

### GET /printers

Get list of configured printers and their status.

**Response:**
```json
{
  "status": "ok",
  "printers": [
    {
      "type": "epson",
      "name": "EPSON_TM_M30",
      "online": true,
      "lastUsed": 1703012345678
    },
    {
      "type": "tsc",
      "name": "TSC_TTP_244",
      "online": false,
      "lastUsed": null
    }
  ],
  "queue": {
    "pending": 0,
    "active": 0,
    "stats": {
      "total": 150,
      "completed": 148,
      "failed": 2
    }
  }
}
```

### GET /status

Get detailed system status including uptime and queue statistics.

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "uptime": 3600,
  "timestamp": 1703012345678
}
```

## Usage Examples

### JavaScript (Fetch API)

```javascript
// Print receipt
const response = await fetch('http://localhost:6319/print/receipt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    data: btoa("ESC/POS commands here")
  })
});

const result = await response.json();
console.log('Job ID:', result.jobId);
```

### cURL

```bash
# Print label
curl -X POST http://localhost:6319/print/label \
  -H "Content-Type: application/json" \
  -d '{"data":"SIZE 40 mm, 30 mm\nTEXT 40,40,\"3\",0,1,1,\"Label\"\nPRINT 1"}'

# Get printer status
curl http://localhost:6319/printers
```

### Python

```python
import requests
import base64

# Print PDF
with open('invoice.pdf', 'rb') as f:
    pdf_data = base64.b64encode(f.read()).decode()

response = requests.post('http://localhost:6319/print/a4', json={
    'type': 'pdf',
    'content': pdf_data
})

print(f"Job ID: {response.json()['jobId']}")
```

## Architecture

```
Electron Main Process
  ├─ System Tray
  ├─ Auto-start Manager
  └─ Config Loader
        ↓
Express REST API Server (localhost:6319)
        ↓
Print Queue Manager (async queue + retry logic)
        ↓
Printer Pool (persistent connections)
  ├─ ESC/POS Printer (Epson)
  ├─ TSPL Printer (TSC)
  └─ PDF Printer (Canon A4)
        ↓
Windows USB/Printer Drivers
```

## Performance

- **API Response**: <50ms (non-blocking)
- **Print Execution**: <300ms (target)
- **Queue**: Processes one job at a time sequentially
- **Retry Logic**: Exponential backoff (2s, 4s, 8s)

## Troubleshooting

### Printer Shows Offline

1. Check USB connection
2. Verify printer is powered on
3. Check printer name in config.json matches Windows name exactly
4. Right-click tray icon → Restart Service

### Port Already in Use

Change port in `config/config.json` and restart.

### Logs Location

Logs are stored in `logs/` directory:
- `print-agent-YYYY-MM-DD.log` - Daily logs
- `error.log` - Error logs only

### Common Errors

| Error Code | Meaning | Solution |
|------------|---------|----------|
| `PRINTER_OFFLINE` | Printer not connected | Check USB connection |
| `PRINTER_NOT_FOUND` | Printer name invalid | Update config.json |
| `PRINT_FAILED` | Print job failed | Check printer driver |
| `PORT_IN_USE` | Port 6319 occupied | Change port in config |

## Development

```bash
# Run in development mode with auto-reload
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Build for Windows
npm run build
```

## System Tray Menu

- **Status**: Shows if service is running
- **API URL**: Click to open in browser
- **Printers**: Shows online/offline status
- **Queue**: Shows pending/completed jobs
- **Open Config Folder**: Opens config directory
- **Open Logs Folder**: Opens logs directory
- **Restart Service**: Restarts the application
- **Exit**: Quits the application

## Security

- **Localhost Only**: API only accepts connections from localhost
- **No Authentication**: Local-only access, no auth required
- **Input Validation**: All API inputs validated with Joi schemas
- **Payload Limits**: 10MB maximum (for base64 PDFs)

## License

MIT

## Support

For issues, please create a GitHub issue with:
- Error logs from `logs/error.log`
- Windows version
- Printer model
- Steps to reproduce

---

Made with ❤️ for POS printing
