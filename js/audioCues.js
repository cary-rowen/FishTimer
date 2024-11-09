export const AudioCueTypes = {
    START_FOCUS: 'start_focus',
    START_SHORT_BREAK: 'start_short_break',
    START_LONG_BREAK: 'start_long_break',
    COMPLETE_CYCLE: 'complete_cycle',
};

export const audioCues = {
    [AudioCueTypes.START_FOCUS]: 'audio/start_focus.wav',
    [AudioCueTypes.START_SHORT_BREAK]: 'audio/start_short_break.wav',
    [AudioCueTypes.START_LONG_BREAK]: 'audio/start_long_break.wav',
    [AudioCueTypes.COMPLETE_CYCLE]: 'audio/complete_cycle.wav',
};

let currentAudio = null;

export function playAudioCue(name) {
    return new Promise((resolve, reject) => {
        const audioPath = audioCues[name];
        if (!audioPath) {
            return reject(new Error(`Audio cue "${name}" not found.`));
        }

        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        }

        const audio = new Audio(audioPath);
        currentAudio = audio;

        audio.play()
            .then(resolve)
            .catch(reject);

        audio.onended = () => {
            currentAudio = null;
        };

        audio.onerror = () => {
            currentAudio = null;
            reject(new Error(`Error playing audio: ${name}`));
        };
    });
}
