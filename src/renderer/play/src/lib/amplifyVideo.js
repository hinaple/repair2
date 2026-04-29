//thx to https://stackoverflow.com/questions/46264417/videojs-html5-video-js-how-to-boost-volume-above-maximum

export default function amplifyVideo(vidEl, gain) {
    const context = new (window.AudioContext || window.webkitAudioContext)(),
        result = {
            context: context,
            source: context.createMediaElementSource(vidEl),
            gain: context.createGain(),
            media: vidEl,
            amplify: (gain) => {
                result.gain.gain.value = gain;
            },
            getAmpLevel: () => {
                return result.gain.gain.value;
            }
        };
    result.source.connect(result.gain);
    result.gain.connect(context.destination);
    result.amplify(gain);
    return result;
}
