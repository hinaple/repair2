export function customLog(content) {
    console.log(
        `%cLOG%c${(content.includes("\n") ? "\n" : "") + content}`,
        "font-family: system-ui; color: #fff; font-weight: bold;" +
            "display: inline-block; background-color: #140959; padding: 3px 15px; border-radius: 3px; margin-right: 5px;",
        ""
    );
}
