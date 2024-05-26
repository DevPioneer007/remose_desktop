const { app, BrowserWindow } = require("electron");
const { join } = require("path");
require("electron-reload")(__dirname);

let mainWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 450,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      nodeIntegration: true,
    },
  });

  mainWindow.loadURL(join(__dirname, "index.html"));
  mainWindow.webContents.openDevTools();
  mainWindow.setMenu(null);

  mainWindow.webContents.on("did-finish-load", () => {
    const { screen } = require("electron");
    mainWindow.webContents.send("SEND_DISPLAYS", screen.getAllDisplays());
  });

  require("./controller/screen.controller");
};

app.on("ready", () => {
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on("ready-to-show", () => {
  mainWindow.show();
});
