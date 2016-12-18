# Changelog

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
