const {app, BrowserWindow, desktopCapturer, ipcMain, Menu, dialog} = require("electron");
const {writeFile} = require("fs");
const path = require("path");

if (require("electron-squirrel-startup")) {
    // eslint-disable-line global-require
    app.quit();
}

app.on("ready", async () => {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile(path.join(__dirname, "index.html"));

    mainWindow.webContents.openDevTools();

    ipcMain.on("event-require-video-source-popup", showViewSourcePopup);
    ipcMain.on("event-save-video-request", saveVideoRequests);
    ipcMain.on("event-require-video-open-popup", openVideoRequest);

    function sendSourceToView(source) {
        mainWindow.webContents.send("event-select-video-source", source);
    }

    async function showViewSourcePopup() {
        const videoSources = await getVideoSource();

        const videoOptions = Menu.buildFromTemplate(videoSources.map(item => ({
            label: item.name,
            click: () => sendSourceToView(item)
        })));

        videoOptions.popup();
    }

    async function saveVideoRequests(event, data) {
        const {filePath} = await dialog.showSaveDialog({
            buttonLabel: "Save video",
            defaultPath: `vid-${Date.now()}.webm`
        });

        writeFile(filePath, data.buffer, () => {
        });
    }

    async function openVideoRequest(event, data) {
        const result = await dialog.showOpenDialog({
            filters: [
                {name: "Movies", extensions: ["mkv", "avi", "mp4", "webm"]}
            ]
        });

        if (result.canceled) {
            return;
        }
        mainWindow.webContents.send("event-play-video-request", result.filePaths);
    }

    async function getVideoSource() {
        return await desktopCapturer.getSources({
            types: ["window", "screen"]
        });
    }

});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
