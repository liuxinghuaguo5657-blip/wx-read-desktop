import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { app, BrowserWindow, BrowserView, clipboard, ipcMain } from 'electron';

import { CONFIG } from './config';

dotenv.config();

const logFilePath = path.join(__dirname, '..', 'debug.log');

// 清空日志文件
fs.writeFileSync(logFilePath, `=== wx-read-desktop debug log ===\nStarted: ${new Date().toISOString()}\n\n`);

ipcMain.handle('wxrd-log', (_event, message: string) => {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(logFilePath, logLine);
});

ipcMain.handle('wxrd-copy', (_event, text: string) => {
  clipboard.writeText(typeof text === 'string' ? text : '');
});

// 原生点击事件 - 绕过 Vue 的 isTrusted 检查
ipcMain.handle('wxrd-native-click', (event, x: number, y: number) => {
  const webContents = event.sender;
  // 发送原生鼠标事件序列
  webContents.sendInputEvent({ type: 'mouseDown', x, y, button: 'left', clickCount: 1 });
  webContents.sendInputEvent({ type: 'mouseUp', x, y, button: 'left', clickCount: 1 });
});

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    title: `wx-read-desktop ${process.env.npm_package_version}`,

    height: CONFIG.WINDOW.HEIGHT,
    width: CONFIG.WINDOW.WIDTH,

    autoHideMenuBar: process.env.NODE_ENV === 'dev' ? false : true,

    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadURL(CONFIG.WINDOW.INITIAL_URL);

  // Open the DevTools.
  process.env.NODE_ENV === 'dev' && mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
