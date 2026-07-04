import { getRef } from "../project/refs";

const MIN_VOL = 0.000001;

const ctx = new AudioContext();

const audioChannels: Map<string, RepairAudio> = new Map();

class RepairAudio {
    private volume: number = 1;
    private loop: boolean = false;
    private audio?: HTMLAudioElement;
    private source?: MediaElementAudioSourceNode;
    private gainNode?: GainNode;
    stopped: boolean = false;

    constructor(resourceId: string, volume = 100, loop = false) {
        const resource = getRef("resources", resourceId);
        if (!resource) {
            this.stopped = true;
            return;
        }

        this.volume = (volume ?? 100) / 100;
        this.loop = loop;

        this.audio = new Audio(resource.path);
        this.audio.autoplay = true;
        this.audio.loop = this.loop;

        this.source = ctx.createMediaElementSource(this.audio);

        this.gainNode = ctx.createGain();
        this.gainNode.gain.value = this.volume;

        this.source.connect(this.gainNode);
        this.gainNode.connect(ctx.destination);
    }

    play() {
        if (this.stopped) return;

        this.audio?.play();
    }

    pause() {
        if (this.stopped) return;

        this.audio?.pause();
    }

    changeVolume(volume: number, duration = 0) {
        if (this.stopped) return;

        const vol = Math.max(MIN_VOL, (volume ?? 1) / 100);
        if (!this.gainNode) {
            this.volume = vol;
            return;
        }

        this.gainNode.gain.setValueAtTime(this.volume, ctx.currentTime);
        this.volume = vol;
        this.gainNode.gain.exponentialRampToValueAtTime(this.volume, ctx.currentTime + duration);
    }

    stop() {
        if (this.stopped || !this.audio) return;
        this.stopped = true;

        this.audio.pause();
        this.source!.disconnect();
        this.gainNode!.disconnect();

        delete this.audio;
        delete this.source;
        delete this.gainNode;
    }
}

export function playAudio(channel: string, resourceId: string, volume = 100, loop = false) {
    if (!channel) channel = "default";

    audioChannels.get(channel)?.stop();
    audioChannels.set(channel, new RepairAudio(resourceId, volume, loop));
}
export function pauseAudio(channel: string) {
    if (!channel) channel = "default";
    audioChannels.get(channel)?.pause();
}
export function resumeAudio(channel: string) {
    if (!channel) channel = "default";
    audioChannels.get(channel)?.play();
}
export function changeAudioVolume(channel: string, volume = 100, duration = 0) {
    if (!channel) channel = "default";
    audioChannels.get(channel)?.changeVolume(volume, duration);
}
export function resetAudio() {
    audioChannels.forEach((audio) => audio.stop());
    audioChannels.clear();
}
