//thx to https://stackoverflow.com/questions/46264417/videojs-html5-video-js-how-to-boost-volume-above-maximum

export default function amplifyVideo(vidEl: HTMLVideoElement, gain: number) {
  const context = new window.AudioContext(),
    result = {
      context: context,
      source: context.createMediaElementSource(vidEl),
      gain: context.createGain(),
      media: vidEl,
      amplify: (gain: number) => {
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
export type Amplifier = ReturnType<typeof amplifyVideo>;
