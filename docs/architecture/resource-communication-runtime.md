# Resource And Communication Runtime

Resources, preloads, audio, communication, shortcuts, and store access are runtime services around project data. Their ownership should stay clear because plugins will increasingly use them through context APIs.

## Resource Intent

Resources are project data entries that point to files under the project asset directory. Runtime code should use resource helpers instead of reconstructing asset paths manually.

The play resource runtime is responsible for:

- deriving runtime media type from resource data
- creating image/video DOM elements
- managing preload DOM/state
- notifying runtime monitor about preload changes

It is not responsible for importing files into the project. File selection and asset copying remain editor/main responsibilities.

## Plugin Resource API Direction

Plugin-facing resource access should be title-based because plugin developers usually know resource aliases or file titles, not uuids.

The context resource API should wrap existing runtime capability:

- list resource handles
- get a resource handle by title
- create an image/video element
- resolve an asset path
- add/remove/query preload state

It should not expose raw project resource mutation.

## Preload Intent

Preload state is runtime state. It is useful for performance and for editor runtime monitoring, but it is not saved as project data.

When preload behavior changes, keep runtime monitor notifications intact so editor UI can stay in sync.

## Audio Intent

Audio is channel-based runtime state. The important behavior is that a channel represents the current sound assigned to that channel, and playing a new sound on the same channel replaces the old one.

Plugins should eventually use a context/audio adapter if audio control becomes plugin-facing. Until then, preserve step action and `RepairUtils` compatibility.

## Communication Intent

Native socket and serial work belongs to the main process. Play sends commands to main and receives incoming data back.

Incoming communication has two effects:

- it activates relevant project entries
- it emits repair project events such as socket/serial

This is project flow, not plugin-only messaging. Plugins that want to observe communication can listen to repair events; plugins that want private communication should use plugin event scopes or services.

`ctx.communication.socketSend` and `ctx.communication.serialSend` wrap the existing send helpers. They do not change incoming communication behavior.

## Shortcuts

Shortcuts are entry-driven project triggers. They are initialized from project data in play and fed by main-process global key events.

Shortcut behavior is tied to focus and configured key timing. Do not fold shortcut handling into generic plugin events unless compatibility is explicitly redesigned.

## Store Access

Store access is main-owned through IPC. Play-side helpers provide convenience, but persistent app storage should continue to be owned by main.

`ctx.store` uses the same main-owned IPC path as `RepairUtils.store`. It should remain a thin adapter over that ownership boundary rather than direct renderer storage.

## Compatibility Guidance

- Use resource helpers for asset paths and media element creation.
- Keep resource import/copy ownership in editor/main.
- Keep preload monitor notifications.
- Keep socket/serial ownership in main.
- Do not confuse communication-triggered repair events with plugin-only events.
- Keep `RepairUtils` behavior compatible unless a change is explicitly accepted and reported.
