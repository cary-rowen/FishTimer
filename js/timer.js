export class Timer {
    constructor() {
        this.interval = null;
        this.timeLeft = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.updateDisplay = () => {};
        this.onComplete = () => {};
    }

    start(sessionName, durationInMinutes) {
        this.timeLeft = durationInMinutes * 60;
        this.isRunning = true;
        this.isPaused = false;
        this.updateDisplay(this.timeLeft);

        this.interval = setInterval(() => {
            if (!this.isPaused) {
                this.timeLeft--;
                this.updateDisplay(this.timeLeft);

                if (this.timeLeft <= 0) {
                    this.stopInterval();
                    this.isRunning = false;
                    this.onComplete();
                }
            }
        }, 1000);
    }

    pause() {
        this.isPaused = !this.isPaused;
    }

    stop() {
        this.stopInterval();
        this.isRunning = false;
        this.isPaused = false;
    }

    stopInterval() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}
