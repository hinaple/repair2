import { getAppData } from "./appdata";

const audioChannels = {};

class RepairAudio {
    constructor(resourceId, volume = 100, loop = false) {
        this.resource = getAppData().findResourceById(resourceId);
        if (!this.resource) return;

        this.volume = (volume ?? 100) / 100;
        this.loop = loop;

        this.context = new AudioContext();

        this.audio = new Audio(this.resource.src);
        this.audio.autoplay = true;
        this.audio.loop = this.loop;

        this.source = this.context.createMediaElementSource(this.audio);

        this.gainNode = this.context.createGain();
        this.gainNode.gain.value = this.volume;

        this.source.connect(this.gainNode);
        this.gainNode.connect(this.context.destination);
    }

    play() {
        this.audio.play();
    }

    pause() {
        this.audio.pause();
    }

    changeVolume(volume, duration = 0) {
        this.gainNode.gain.setValueAtTime(this.volume, this.context.currentTime);
        this.volume = (volume ?? 1) / 100;
        this.gainNode.gain.exponentialRampToValueAtTime(
            this.volume,
            this.context.currentTime + duration
        );
    }

    stop() {
        this.audio.pause();
        this.context.close();
    }
}

export function playAudio(channel, resourceId, volume = 100, loop = false) {
    if (!channel) channel = "default";

    if (audioChannels[channel]) audioChannels[channel].stop();

    audioChannels[channel] = new RepairAudio(resourceId, volume, loop);
}
export function pauseAudio(channel) {
    if (!channel) channel = "default";
    if (audioChannels[channel]) audioChannels[channel].pause();
}
export function resumeAudio(channel) {
    if (!channel) channel = "default";
    if (audioChannels[channel]) audioChannels[channel].play();
}
export function changeAudioVolume(channel, volume = 100, duration = 0) {
    if (!channel) channel = "default";
    if (audioChannels[channel]) audioChannels[channel].changeVolume(volume, duration);
}
