export default {
    function: ({ modules, ctx }) => {
        const handler = (device) => {
            console.log("NEW USB ATTACHED: ", device);
            ctx.events.emit("usbAttached");
            // RepairUtils.event.emit("usbDetect", null);
        };
        modules.usb.usb.on("attach", handler);

        return () => {
            modules.usb.usb.off("attach", handler);
        };
    },
    dependencies: ["usb"]
};
