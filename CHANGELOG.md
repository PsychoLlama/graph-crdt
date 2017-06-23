# Changelog

`graph-crdt` uses [this changelog style](http://keepachangelog.com/en/0.3.0/), and versions after `0.1.0` follow [semver](http://semver.org/).

## Unreleased
### Added
- New `List` type.

### Removed
- JSDoc. It doesn't play nice with babel.

## v0.7.0
### Added
- New `Node#snapshot` method.

## v0.6.2
### Fixed
- Removed `Graph` and `Node` globals.

## v0.6.1
### Added
- New documentation using JSDoc.

## v0.6.0
### Added
- New `Node#setMetadata` method.

## v0.5.0
### Added
- New `Node#overlap` method.
- New `Graph#overlap` method.

## v0.4.0
### Added
- New `Node#rebase` method.
- New `Graph#rebase` method.

## v0.3.1
### Fixed
- Prematurely resolved update merges caused by a `break` statement in the merge loop. Caused some updates to never fully merge.

## v0.3.0
### Changed
- Replaced wall clocks with logical clocks.

### Removed
- Deferred updates are gone! They don't make sense with Lamport time.
- `Node#compare` is gone.

## v0.2.0
### Changed
- Renamed `Graph#read` to `Graph#value`.

### Added
- New `Graph#new` method, primarily for subclasses.

## v0.1.0
### Added
- `Node#new` method, creates a new instance of the same type using the same configuration (such as `uid`).

### Changed
- `Node#read` has been renamed to `Node#value`.

### Removed
- `Node#clone` has been replaced in favor of `Node#new`, which does not copy properties.
- `Graph#add` has been removed in favor of `Graph#merge`.

## v0.0.5
### Added
- New `Node#clone` method which creates a copy of the node.

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
