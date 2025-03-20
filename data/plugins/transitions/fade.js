export default {
    attributes: ["startOpacity"],
    from: ({ attributes }) => ({
        opacity: attributes.startOpacity
    }),
    to: ({ attributes }) => ({
        opacity: 1
    })
};
