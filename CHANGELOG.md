# Changelog

## v0.0.4
### Added
- New `conflict` event on Node instances (only happens when a conflict overwrites the current value).

### Changed
- `Node#compare` returns `"conflict"` on conflicts, instead of attempting to interpret them as `"update"` or `"history"`.

## v0.0.3
### Changed
- Node `historical` event renamed to `history`.

### Added
- New `Node#schedule` method schedules deferred updates.

### Fixed
- Calling `Node#merge` wouldn't merge the incoming node's deferred updates.

## v0.0.2
### Fixed
- Graph members are no longer globally mutated (allows graph time travel).

## v0.0.1
### Added
- `Node` class
- `Graph` class
- Merge capabilities
- `update`, `historical`, `deferred` events.
