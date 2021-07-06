// main.js

// Modules to control application life and create native browser window
const { app, ipcMain, BrowserWindow, dialog } = require('electron')
const path = require('path')
const fs = require('fs');

let mainWindow

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 600,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    }
  })

  // Open the DevTools.
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools()
  }

  // and load the index.html of the app.
  // mainWindow.loadFile('src/index.html')
  mainWindow.loadURL('file://' + __dirname + '/index.html');
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  if (process.argv.length >= 1) {
    mainWindow.webContents.on('did-finish-load', () => {
      let filename = process.argv[1]

      try {
        const path = filename
        const buff = fs.readFileSync(path)
    
        data = {
          status: true,
          path: path,
          buff: buff
        }
      }
      catch(error) {
        data = {
          status: false,
          message: error.message
        }
      }

      mainWindow.webContents.send('asynchronous-message', data)
    })
  }
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
ipcMain.handle('file-open', async (event) => {
  const paths = dialog.showOpenDialogSync(mainWindow, {
    buttonLabel: '開く',
    filters: [
      { name: 'raw', extensions: ['dat', 'bin'] },
    ],
    properties:[
      'openFile',
      'createDirectory',
    ]
  });

  if (paths == undefined) {
    return ({status: undefined})
  }

  try {
    const path = paths[0];
    const buff = fs.readFileSync(path);

    return {
      status: true,
      path: path,
      buff: buff
    }
  }
  catch(error) {
    return {
      status: false,
      message: error.message
    }
  }
})