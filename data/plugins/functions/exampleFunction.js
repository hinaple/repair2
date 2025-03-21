export default {
    attributes: ["name"],
    function: ({ attributes }) => {
        console.log(`Hello, ${attributes.name}!`);
        return true;
    }
};
