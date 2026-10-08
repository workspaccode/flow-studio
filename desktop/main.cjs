const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const net = require('net');
const { spawn } = require('child_process');

let mainWindow = null;
let pythonProcess = null;
let spawnedServer = false;

const ROOT_DIR = path.resolve(__dirname, '..');
const DEFAULT_PORT = parseInt(process.env.FLOW_STUDIO_PORT || '8765', 10);

// Check if a port is available
function checkPortFree(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', (err) => {
        resolve(err.code !== 'EADDRINUSE');
      })
      .once('listening', () => {
        tester.once('close', () => resolve(true)).close();
      })
      .listen(port, '127.0.0.1');
  });
}

// Find a free port starting from startPort
async function findFreePort(startPort) {
  let port = startPort;
  while (port < startPort + 50) {
    if (await checkPortFree(port)) return port;
    port++;
  }
  return startPort;
}

// Ping Flow Studio server endpoint
function pingServer(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/domain/projects`, { timeout: 800 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Wait for server to become responsive
async function waitForServer(port, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    if (await pingServer(port)) return true;
    await new Promise((r) => setTimeout(r, 150));
  }
  return false;
}

// Spawn server.py if not already running
async function ensureServerRunning() {
  const isDefaultActive = await pingServer(DEFAULT_PORT);
  if (isDefaultActive) {
    console.log(`[Flow Studio Desktop] Server already running on port ${DEFAULT_PORT}`);
    return DEFAULT_PORT;
  }

  const isFree = await checkPortFree(DEFAULT_PORT);
  const targetPort = isFree ? DEFAULT_PORT : await findFreePort(DEFAULT_PORT + 1);

  console.log(`[Flow Studio Desktop] Spawning python3 server.py on port ${targetPort}...`);
  pythonProcess = spawn('python3', ['server.py'], {
    cwd: ROOT_DIR,
    env: { ...process.env, FLOW_STUDIO_PORT: String(targetPort) },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  spawnedServer = true;

  pythonProcess.stdout.on('data', (d) => {
    console.log(`[server.py] ${d.toString().trim()}`);
  });

  pythonProcess.stderr.on('data', (d) => {
    console.error(`[server.py err] ${d.toString().trim()}`);
  });

  pythonProcess.on('exit', (code, sig) => {
    console.log(`[server.py] exited with code ${code}, signal ${sig}`);
    pythonProcess = null;
  });

  const ready = await waitForServer(targetPort);
  if (!ready) {
    console.warn(`[Flow Studio Desktop] Warning: Server ping timed out on port ${targetPort}, proceeding anyway.`);
  } else {
    console.log(`[Flow Studio Desktop] Server is ready on http://127.0.0.1:${targetPort}`);
  }

  return targetPort;
}

function cleanupServer() {
  if (pythonProcess && spawnedServer) {
    console.log('[Flow Studio Desktop] Stopping python server...');
    try {
      pythonProcess.kill('SIGTERM');
      setTimeout(() => {
        if (pythonProcess) {
          try { pythonProcess.kill('SIGKILL'); } catch (_) {}
        }
      }, 1500);
    } catch (e) {
      console.error('[Flow Studio Desktop] Error killing server:', e);
    }
    pythonProcess = null;
  }
}

async function createWindow() {
  const port = await ensureServerRunning();

  mainWindow = new BrowserWindow({
    width: 1420,
    height: 920,
    minWidth: 480,
    minHeight: 580,
    backgroundColor: '#f2f5f9',
    title: 'Flow Studio · Lottie',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle external link clicks
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://127.0.0.1') || url.startsWith('http://localhost')) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  await mainWindow.loadURL(`http://127.0.0.1:${port}/#domain`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Single instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(createWindow);

  app.on('window-all-closed', () => {
    cleanupServer();
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on('before-quit', cleanupServer);
  app.on('will-quit', cleanupServer);

  process.on('SIGINT', () => {
    cleanupServer();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanupServer();
    process.exit(0);
  });
}
