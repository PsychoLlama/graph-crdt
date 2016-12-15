# Distributed Graph Engine
[![Travis branch](https://img.shields.io/travis/PsychoLlama/graph-crdt/master.svg?style=flat-square)](https://travis-ci.org/PsychoLlama/graph-crdt)

> graph-crdt is a **work in progress** with frequent breaking changes.

Designed for serializing arbitrary data structures, making offline edits, and seamlessly merging changes back in. All data is observable and event driven.

# What for?
This graph library aims to ease the complexity of merging offline edits, especially when node IDs aren't known in advance.

# How does it work?
Truly offline systems **cannot** rely on any form of collaboration. They must (at some point) assume the editor is in complete isolation, such as a smartphone that lost cell service, or a server who's network is unreachable.

You have a few options:
- **Block writes**<br />
Probably the worst experience, block all writes until the network heals. This is essentially the same as losing socket connection to your database (Rethink, Neo4j, Redis, MySQL, etc.)

- **Defer the updates**<br />
You allow writes on the offline machine, wait for the network to heal, then publish them. If not handled perfectly, you're susceptible to merge hell on an active production environment.

- **Use a CRDT**<br />
CRDTs ([Commutative Replicated Data Types](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type)) are similar to the option above, but come with additional guarantees: regardless of the order which updates are received in, every machine will arrive at the exact same result *every time*, and if implemented correctly, make merge conflicts impossible.

This library opts for the latter, implementing a delta state graph CRDT. However, as great as they may seem, there are some cons (some specific to this library):

- You need more data.<br />
 Merges need a state integer on each field.

- There is no "true" delete.<br />
 You can remove the value, but some metadata has to stay around.

- It only plays nice with other CRDTs.<br />
 To merge two states, both must have the CRDT metadata (though this library allows you to upgrade nearly any data).

## Features
- Commutative, idempotent, conflict-resolved `Node` unions.
- Delta emission on `Node` unions.
- Time travel (track and selectively apply deltas).

## Roadmap
1. Delta emission on `Graph` unions.
2. Node field tombstones.
3. Immutable metadata API.
