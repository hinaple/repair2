# Execution Model

The play execution model is data-driven. Entries, nodes, steps, and outputs stored in project data decide what runs. Plugin context APIs should extend this model, not bypass it accidentally.

## Startup Intent

Play starts by entering startup entries after app data is initialized.

Startup order is compatibility-sensitive because existing projects may rely on variables, shortcuts, runtime plugins, and entry state being initialized in the current order. Do not move startup execution casually.

## Prototype Binding

Several shared project classes receive play behavior through prototype binding in the play entry path. This is a legacy/runtime adapter pattern:

- shared classes keep project data shape
- play attaches execution behavior
- editor can use the same classes without running play behavior

When changing execution, inspect both the shared class and the play adapter. Do not move execution behavior into shared classes without checking editor impact.

## Entries And Outputs

Entries are external triggers into the project graph. They include startup, shortcuts, communication, and repair project events.

Outputs connect one node to another by id. Missing or disabled targets should stop cleanly rather than throwing.

The intent is that project flow failures do not crash play; they either no-op or report through the appropriate visible path.

## Steps And Actions

Steps resolve through the existing step action table. Existing step payloads are compatibility-critical.

Action families include components, preloads, audio, communication, delay, variable updates, custom reset, plugin execution, project event emit, script, and log.

New runtime context APIs should not change how existing step data resolves. If an action registry is added later, it must preserve the current step action resolution path for old projects.

## Waiting And Reset

Async steps are tracked so reset can release waiting execution. This is important for interactive projects because resets must stop pending delays or plugin work rather than leaving hidden execution behind.

Custom reset coordinates multiple runtime subsystems:

- audio
- variables
- components
- waiting steps
- preloads
- entries

New long-running runtime features should integrate with the same reset/lifecycle thinking.

## Project Events

Repair project events are part of project execution. Emitting a repair event can activate entry nodes.

Plugin context defaults to this path because plugins often need to trigger or listen to project events. Plugin-only communication should use scoped plugin events instead of repair events.

## Script And Plugin Failures

User scripts and plugins are extension points, so failures should be contained.

Direction:

- plugin-facing failures go through plugin reporting
- expected plugin misuse should not throw through play
- legacy script behavior should not be changed without a separate decision

## Compatibility Guidance

- Preserve startup entry behavior.
- Preserve existing step payload meanings.
- Preserve reset behavior for waiting steps.
- Keep project events distinct from plugin-only communication by using event scopes.
- When adding new execution extension points, prefer adapters around existing actions over rewriting the execution model.
