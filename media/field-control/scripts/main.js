const vscode = acquireVsCodeApi();

let timerStateEnum = Object.freeze({
    stopped: "stopped",
    autonomous: "autonomous",
    autonomousSkills: "autonomousSkills",
    driver: "driver",
    disabled: "disabled",
    stopWatch: "stopWatch"
});
Object.freeze(this.TimerState);

// Finite State Machine for the Timer
class Timer {
    constructor() {
        this.time = 0;
        this.state = timerStateEnum.stopped;
        this.interval = undefined;
        this.lastState = timerStateEnum.stopped;
    }

    startMatch() {
        this.time = 15;
        this.updateDisplay();
        this.setState(timerStateEnum.autonomous);
        this.interval = setInterval(() => { this.update(); }, 1000);
    }

    startSkills(isAutonomous) {
        this.time = 60;
        console.log("start skills");
        this.setState(isAutonomous ? timerStateEnum.autonomousSkills : timerStateEnum.driver);
        console.log("start skills");
        this.updateDisplay();
        console.log(this.state);
        this.interval = setInterval(() => { this.update(); }, 1000);
    }

    setState(state) {
        console.log("hello");
        this.state = state;
        console.log(state);
        if (state === timerStateEnum.autonomous) {
            autonomous();
        }
        else if (state === timerStateEnum.autonomousSkills) {
            autonomous();
        }
        else if (state === timerStateEnum.driver) {
            driver();
        }
        else if (state === timerStateEnum.disabled) {
            disable();
        }
    }

    update() {
        this.time--;
        if (this.time <= 0) {
            console.log(this.time, this.state);
            if (this.state === timerStateEnum.autonomous) {
                this.time = 105;
                this.setState(timerStateEnum.driver);
                this.pause();
                document.getElementById("matchResume").style.display = 'block';
                document.getElementById("matchPause").style.display = 'none';
            }
            else if (this.state === timerStateEnum.driver || this.state === timerStateEnum.autonomousSkills) {
                this.stop();
                return;
            }
        }
        this.updateDisplay();
    }

    pause() {
        clearInterval(this.interval);
        this.interval = undefined;
        this.lastState = this.state;
        this.setState(timerStateEnum.disabled);
    }

    resume() {
        this.interval = setInterval(() => { this.update(); }, 1000);
        this.setState(this.lastState);
    }

    stop() {
        clearInterval(this.interval);
        this.interval = undefined;
        this.time = 0;
        this.updateDisplay();

        this.setState(timerStateEnum.disabled);

        document.getElementById("matchStart").style.display = 'block';
        document.getElementById("matchReset").style.display = 'none';
        document.getElementById("matchPause").style.display = 'none';
        document.getElementById("matchResume").style.display = 'none';

    }

    updateDisplay() {
        const minutes = Math.floor(this.time / 60);
        const seconds = this.time % 60;
        const timeString = (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
        document.getElementById('timer').innerHTML = timeString;
    }

    getState() {
        return this.state;
    }
}

const timer = new Timer();

function connectController() {
    vscode.postMessage({
        command: 'connect',
    });
}
function disconnectController() {
    vscode.postMessage({
        command: 'disconnect',
    });
}
function autonomous() {
    console.log('autonomous');
    vscode.postMessage({
        command: 'setMode',
        mode: 'autonomous',
    });
}
function driver() {
    console.log('driver');
    vscode.postMessage({
        command: 'setMode',
        mode: 'driver',
    });
}
function disable() {
    console.log('disable');
    vscode.postMessage({
        command: 'setMode',
        mode: 'disabled',
    });
}

window.addEventListener('message', event => {

    const message = event.data; // The JSON data our extension sent

    switch (message.command) {
        case 'onConnected':
            document.getElementById('connect').style.display = 'none';
            document.getElementById('disconnect').style.display = 'block';
            document.getElementById('autonomous').disabled = false;
            document.getElementById('driver').disabled = false;
            document.getElementById('disabled').disabled = false;
            document.getElementById('matchStart').disabled = false;
            document.getElementById('matchPause').disabled = false;
            document.getElementById('matchReset').disabled = false;
            document.getElementById('matchResume').disabled = false;
            break;
        case 'onDisconnected':
            document.getElementById('connect').style.display = 'block';
            document.getElementById('disconnect').style.display = 'none';
            document.getElementById('autonomous').disabled = true;
            document.getElementById('driver').disabled = true;
            document.getElementById('disabled').disabled = true;
            document.getElementById('matchStart').disabled = true;
            document.getElementById('matchReset').disabled = false;
            document.getElementById('matchPause').disabled = true;
            document.getElementById('matchResume').disabled = true;
            break;
    }
});

window.addEventListener('load', (event) => {
    document.querySelectorAll('div[id="matchType"] a').forEach(function (element) {

        element.addEventListener('click', function (e) {
            console.log(e.target);
            let clicked = e.target.style.color === 'rgb(255, 52, 52)';
            document.querySelectorAll('div[id="matchType"] a').forEach(function (button) {
                button.style.color = 'inherit';
            });
            if (clicked === false) {
                e.target.style.color = 'rgb(255, 52, 52)';
                switch (e.target.text) {
                    case 'Programming Skills':
                        timer.startSkills(true);
                        timer.pause();
                        break;
                    case 'Driver Skills':
                        timer.startSkills(false);
                        timer.pause();
                        break;
                    case 'Regular Match':
                        timer.startMatch();
                        timer.pause();
                        break;
                }
            }
            disable();
        });
    });

    document.getElementById("matchStart").addEventListener("click", () => {
        document.querySelectorAll('div[id="matchType"] a').forEach(function (element) {
            if (element.style.color === 'rgb(255, 52, 52)') {
                console.log(element.text);
                let timerElement = document.getElementById("timer");
                switch (element.text) {
                    case 'Programming Skills':
                        timer.startSkills(true);
                        break;
                    case 'Driver Skills':
                        timer.startSkills(false);
                        break;
                    case 'Regular Match':
                        timer.startMatch();
                        break;
                }
                document.getElementById("matchStart").style.display = 'none';
                document.getElementById("matchReset").style.display = 'block';
                document.getElementById("matchPause").style.display = 'block';
            }
        });
    });

    document.getElementById("matchReset").addEventListener("click", () => {
        timer.stop();
    });
    document.getElementById("matchPause").addEventListener("click", () => {
        timer.pause();

        document.getElementById("matchPause").style.display = 'none';
        document.getElementById("matchResume").style.display = 'block';
    });
    document.getElementById("matchResume").addEventListener("click", () => {
        timer.resume();

        document.getElementById("matchResume").style.display = 'none';
        document.getElementById("matchPause").style.display = 'block';
    });

    document.getElementById("autonomous").addEventListener("click", () => {
        timer.stop();
        autonomous();
    });
    document.getElementById("driver").addEventListener("click", () => {
        timer.stop();
        driver();
    });
    document.getElementById("disabled").addEventListener("click", () => {
        timer.stop();
        disable();
    });
});

