export default (step) => new Promise((res) => setTimeout(res, step.payload.delayMs));
