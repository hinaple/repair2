# Project Data Schema

This document records project data compatibility intent. It is not a full JSON Schema. The exact field-level shape is defined by model constructors and `storeData` methods.

## Compatibility Intent

Project data must remain forward-tolerant and backward-tolerant where possible:

- old projects should load through constructor defaults
- new fields should be optional
- existing field meanings should not change
- runtime-only state should not accidentally become saved project data

The `.repair` format archives the project directory. Compatibility is therefore about both `data.json` semantics and project directory layout such as assets, plugins, and styles.

## Top-Level Data

The saved project data is centered around:

- `config`
- `nodes`
- `variables`
- `resources`
- editor-only view state such as `viewport`

Older default data may omit fields that newer editor saves include. Constructors should continue to provide safe defaults.

## Config

Config owns play window behavior and editor/runtime options. New config fields are especially compatibility-sensitive because play reads config during startup.

Current direction:

- runtime plugin config is optional
- old screen config migration paths should remain
- new play/runtime options should default to existing behavior when absent

Never require an old project to add a config field before it can open.

## Resources

Resource data stores identity and path/alias information. File type is derived at runtime from the path extension.

Resource runtime state such as preload status should not be saved into resource data. It belongs to play runtime and monitoring.

## Variables

Variable data stores the default value. Play creates runtime variable state from project variables at load time.

Runtime variable values are not project data unless a future feature explicitly saves them.

Plugins should usually use variable names through context, but the project schema continues to use ids for stored references.

## Nodes And Steps

Nodes and steps are the execution graph. Their stored payloads are compatibility-critical.

The step action table in play interprets existing step data. Avoid changing stored payload meanings. If a new action capability is needed, add it as a new optional payload shape or new action type rather than redefining an existing one.

## Components And Elements

Components are currently stored inside component creation step payloads. A component has its own id, optional alias, visibility, style/layout, frame plugin pointer, transitions, and element list.

Runtime component APIs should respect the stored identity model:

- uuid is the stable stored identity
- alias is the human-facing runtime reference when present
- `aliasOrId` behavior is part of compatibility

Invisible components should remain component objects at runtime even when not mounted in DOM.

## PluginPointer

Plugin pointer data stores plugin name and payloads. The owning model decides the plugin directory/type.

Because older plugin pointers do not store their own type, new plugin type work should not require pointer data to contain a type field.

## Runtime Plugin Config

Runtime plugin configuration is optional project config. A project with no runtime plugin config should behave like an older project.

When present, config should identify runtime plugins by name and optional payloads/attributes. Missing or disabled entries should be ignored safely.

## Guidance

- Add fields with defaults.
- Keep old payload meanings.
- Keep runtime state out of saved data unless explicitly designed.
- Keep plugin directory compatibility.
- Prefer adapters in play/runtime code over schema changes when adding plugin control APIs.
