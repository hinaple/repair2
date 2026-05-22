# Codex Notes

## Runtime-with-main SDK documentation note

When documenting runtime plugins with a main entry, describe the activation order and renderer call behavior:

- Main `activate()` runs before renderer `activate()`.
- If main `activate()` calls a renderer method through `renderer.someMethod()`, the call is queued until renderer activation finishes.
- Plugin authors should not assume renderer method calls from main `activate()` run immediately.
- Renderer method calls from main `activate()` can be delayed while the renderer runtime is still loading and initializing.
- Renderer methods that depend on renderer-side initialization should be designed with this delayed execution behavior in mind.
