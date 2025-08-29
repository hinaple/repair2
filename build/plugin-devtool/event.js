const EvtMap = {};

export function addListener(channel, callback) {
    EvtMap[channel] = callback;
    return () => {
        delete EvtMap[channel];
    };
}

const eventChannel = document.getElementById("event-channel");
const eventData = document.getElementById("event-data");
const eventDispatch = document.getElementById("event-dispatch");
function dispatch(channel, data) {
    EvtMap[channel]?.(data);
}
eventDispatch.addEventListener("click", dispatch);
function detectEnterToDispatch(evt) {
    if (evt.key === "Enter" && !evt.shiftKey) {
        evt.preventDefault();
        dispatch();
    }
}
eventChannel.addEventListener("keydown", detectEnterToDispatch);
eventData.addEventListener("keydown", detectEnterToDispatch);
