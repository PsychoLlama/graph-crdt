# Distributed Graph Engine
[![Travis branch](https://img.shields.io/travis/PsychoLlama/graph-crdt/master.svg?style=flat-square)](https://travis-ci.org/PsychoLlama/graph-crdt)

Designed for serializing arbitrary data structures, making offline edits, and seamlessly merging changes back in. All data is observable and event driven.

For the technical, `graph-crdt` is a modified version of a [LWW-E-Set](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type#LWW-Element-Set_(Last-Write-Wins-Element-Set)) with inline garbage collection using [lamport clocks](https://en.wikipedia.org/wiki/Lamport_timestamps) and JavaScript's [lexicographic comparison](https://en.wikipedia.org/wiki/Lexicographical_order) on deterministically serialized JSON for the predetermined conflict resolution bias.

# Maintenance notice
If it isn't obvious from the lack of recent commits, `graph-crdt` is **unmaintained**.

I'm still pursuing the concepts through [the mytosis framework](https://github.com/PsychoLlama/mytosis) along with more ambitious ideas, but development has kinda paused there too. I hit some project burnout.

# What for?
This graph library aims to ease the complexity of synchronizing complex and interconnected state between peers, without assuming centralized authority.

# How does it work?
Truly offline systems **cannot** rely on any form of collaboration. They must (at some point) assume the editor is in complete isolation, such as a smartphone that lost cell service, or a server who's network is unreachable.

You have a few options:
- **Block writes**<br />
Probably the worst experience, block all writes until the network heals. This is essentially the same as losing socket connection to your database (Rethink, Neo4j, Redis, MySQL, etc.)

- **Defer the updates**<br />
You allow writes on the offline machine, wait for the network to heal, then publish them. If not handled perfectly, you're susceptible to merge hell on an active production environment.

- **Use a CRDT**<br />
CRDTs ([Convergent Replicated Data Types](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type)) are similar to the option above, but come with additional guarantees: regardless of the order which updates are received in, every machine will arrive at the exact same result *every time*, and if implemented correctly, make merge conflicts impossible.

> `graph-crdt` uses Lamport time to track state mutation and resolves concurrent edit conflicts using a deterministic sorting algorithm.

This library opts for the latter, implementing a delta graph CvRDT. However, as great as they may seem, there are some cons (some specific to this library):

- You need more data.<br />
 Merges need a state integer on each field.

- There is no "true" delete.<br />
 You can remove the value, but some metadata has to stay around.

- It only plays nice with other CRDTs.<br />
 To merge two states, both must have the CRDT metadata (though this library allows you to upgrade nearly any data).

## Features
- Commutative, idempotent, conflict-resolved `Node` unions.
- Delta emission on `Node` and `Graph` unions.
- Time travel (track and selectively apply deltas).

## [Documentation](https://psychollama.github.io/graph-crdt/)
All the API docs [can be found here](https://psychollama.github.io/graph-crdt/).

## Roadmap
1. Node field tombstones.
2. Graph member tombstones.
3. Custom conflict resolvers.
4. A new data structure (this one is a surprise).

## Disclaimer
Although I have working experience with decentralized systems (at [GunDB](//gundb.io)), I'm still a n00b. This library is my best understanding of CvRDTs and how they operate. I'm open to most suggestions.
