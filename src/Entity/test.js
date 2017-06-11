/* eslint-env mocha */
import expect from 'expect';
import Entity from './index';

describe('Entity', () => {
  let entity, update;

  beforeEach(() => {
    entity = new Entity();
    update = new Entity();
  });

  describe('new()', () => {
    it('creates a new entity', () => {
      const result = entity.new();

      expect(result).toBeAn(Entity);
    });

    it('uses the same ID', () => {
      const result = entity.new();

      expect(String(result)).toBe(String(entity));
    });
  });

  describe('delta()', () => {
    it('returns a delta object', () => {
      const delta = entity.delta(update);

      expect(delta).toBeAn(Object);
      expect(delta.update).toBeAn(Entity);
      expect(delta.history).toBeAn(Entity);
    });

    it('uses `.new()` to construct delta objects', () => {
      class SubClass extends Entity {
        new = () => new SubClass();
      }

      const entity = new SubClass();
      const update = new SubClass();

      const delta = entity.delta(update);

      expect(delta.update).toBeA(SubClass);
      expect(delta.history).toBeA(SubClass);
    });

    it('contains all the new fields', () => {
      const metadata = update[Entity.object].new = { value: 'new', state: 1 };

      const delta = entity.delta(update);

      expect(delta.update.toJSON()).toContain({ new: metadata });
    });

    it('contains all the outdated fields', () => {
      entity[Entity.object].field = { value: 'old', state: 1 };
      update[Entity.object].field = { value: 'new', state: 2 };

      const delta = entity.delta(update);

      expect(delta.history.meta('field')).toBe(entity.meta('field'));
    });

    it('does not add items to history if they were not already defined', () => {
      update[Entity.object].field = { value: 'new', state: 1 };

      const delta = entity.delta(update);

      expect(delta.history[Entity.object].field).toBe(undefined);
    });

    it('adds old updates to history', () => {
      entity[Entity.object].field = { value: 'new', state: 2 };
      update[Entity.object].field = { value: 'old', state: 1 };

      const delta = entity.delta(update);

      expect(delta.history.meta('field')).toBe(update.meta('field'));
    });

    it('chooses the larger value in a conflict', () => {
      entity[Entity.object].field = { value: 'a', state: 1 };
      update[Entity.object].field = { value: 'b', state: 1 };

      const delta = entity.delta(update);

      expect(delta.update.meta('field')).toBe(update.meta('field'));
    });

    it('does not add an update if the current value wins a conflict', () => {
      update[Entity.object].field = { value: 'a', state: 1 };
      entity[Entity.object].field = { value: 'b', state: 1 };

      const delta = entity.delta(update);

      expect(delta.update.meta('field')).toBe(null);
    });

    it('does not show an update nothing has changed', () => {
      update[Entity.object].field = { value: 'a', state: 1 };
      entity[Entity.object].field = { value: 'a', state: 1 };

      const delta = entity.delta(update);

      expect(delta.update.meta('field')).toBe(null);
      expect(delta.history.meta('field')).toBe(null);
    });
  });
});
