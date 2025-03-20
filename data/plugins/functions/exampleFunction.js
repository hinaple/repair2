export default {
    attributes: ["name"],
    function: ({ attributes }) => {
        return `Hello, ${attributes.name}!`;
    }
};
