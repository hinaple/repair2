export default {
    attributes: ["startOpacity"],
    function: ({ attributes }) => [{ opacity: attributes.startOpacity }, { opacity: 1 }]
};
