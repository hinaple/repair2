export default {
    function: ({ modules }) => {
        console.log(modules);
        modules.usb.usb.on("attach", (device) => {
            console.log("NEW USB ATTACHED: ", device);
            RepairUtils.event.emit("usbDetect", null);
        });
    },
    dependencies: ["usb"],
};
