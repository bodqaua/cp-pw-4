const {ipcRenderer} = require("electron");
const {dialog} = require("electron");

class ScreenRecorder {
    source = null;
    video;
    mediaRecorder;
    recordedChunks = [];
    options = {mimeType: "video/webm; codecs=vp9"};

    constructor() {
        this.subscribeToDocument();
        this.subscribeToIPC();
    }


    subscribeToDocument() {
        this.video = document.getElementById("video");
        this.videoSelectButton = document.getElementById("videoSelectButton");
        this.startButton = document.getElementById("startButton");
        this.stopButton = document.getElementById("stopButton");
        this.openButton = document.getElementById("openButton");

        this.videoSelectButton.addEventListener("click", this.selectVideoSource.bind(this));
        this.startButton.addEventListener("click", this.startVideoHandler.bind(this));
        this.stopButton.addEventListener("click", this.stopVideoHandler.bind(this));
        this.openButton.addEventListener("click", this.openVideoHandler.bind(this));
    }

    subscribeToIPC() {
        ipcRenderer.on("event-select-video-source", this.setVideoSource.bind(this));
        ipcRenderer.on("event-play-video-request", this.playVideoHandler.bind(this));
    }

    setVideoSource(event, data) {
        if (!data) {
            return;
        }

        this.source = data;
        this.videoSelectButton.innerText = data.name;
    }

    selectVideoSource() {
        ipcRenderer.send("event-require-video-source-popup", {});
    }

    openVideoHandler() {
        ipcRenderer.send("event-require-video-open-popup", {});
    }

    playVideoHandler(event, path) {
        this.video.src = path;
        this.video.play();
    }

    async startVideoHandler() {
        if (!this.source) {
            return;
        }

        const constraints = {
            audio: false,
            video: {
                mandatory: {
                    chromeMediaSource: "desktop",
                    chromeMediaSourceId: this.source.id
                }
            }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.video.srcObject = stream;
        this.video.play();


        this.mediaRecorder = new MediaRecorder(stream, this.options);

        this.mediaRecorder.ondataavailable = this.handleDataAvailable.bind(this);
        this.mediaRecorder.onstop = this.saveVideoHandler.bind(this);
        this.mediaRecorder.start();

        this.startButton.innerText = "Recording...";
        this.startButton.setAttribute("disabled", "true");
        this.stopButton.removeAttribute("disabled");
    }

    handleDataAvailable(e) {
        this.recordedChunks.push(e.data);
    }

    stopVideoHandler() {
        this.mediaRecorder.stop();
    }

    async saveVideoHandler(e) {
        const blob = new Blob(this.recordedChunks, {
            type: "video/webm; codecs=vp9"
        });

        this.stopButton.setAttribute("disabled", "true");

        this.startButton.innerText = "Start";
        this.startButton.removeAttribute("disabled");

        const buffer = Buffer.from(await blob.arrayBuffer());

        ipcRenderer.send("event-save-video-request", {buffer});
    }
}

const recorder = new ScreenRecorder();

