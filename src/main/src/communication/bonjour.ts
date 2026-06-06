import { Bonjour } from "bonjour-service";

let bonjour: Bonjour | null = null;
let stopFinding: (() => void) | null = null;

export function findService(type: string, name: string) {
    return new Promise((res, rej) => {
        if (!bonjour) bonjour = new Bonjour();
        if (stopFinding) stopFinding();
        const browser = bonjour.find({ type }, (service) => {
            if (service.addresses && service.name === name) {
                res(service.addresses.map((ip) => `http://${ip}:${service.port}`));
                browser.stop();
                stopFinding = null;
            }
        });
        stopFinding = () => {
            browser.stop();
            rej();
            stopFinding = null;
        };
    });
}
