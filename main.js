
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#f8fafc',
    title: "Controle Financeiro Ricardo"
  });

  mainWindow.loadFile('index.html');
}

// Caminho do Banco de Dados: C:/Users/USUARIO/Downloads/financeiro_ricardo_db.json
const getDbPath = () => path.join(app.getPath('downloads'), 'financeiro_ricardo_db.json');

// Manipuladores de IPC para o Banco de Dados
ipcMain.handle('db-read', async () => {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) {
    return { transactions: [], auth: null, config: {} };
  }
  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Erro ao ler banco de dados:", err);
    return { transactions: [], auth: null, config: {} };
  }
});

ipcMain.handle('db-write', async (event, data) => {
  const dbPath = getDbPath();
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error("Erro ao escrever banco de dados:", err);
    return false;
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
