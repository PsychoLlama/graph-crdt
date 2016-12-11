import { describe, it } from 'mocha';
import expect from 'expect';
import time from './index';

describe('The time function', function () {

  // Just in case there's a race condition.
  this.retries(1);

  it('should return the current time', () => {
    const now = new Date().getTime();

    // Approximate, avoids race conditions.
    expect(time())
     .toBeLessThan(now + 3)
     .toBeGreaterThan(now - 3);
  });

  it('should increment slightly when called twice immediately', () => {
    const result = time() + time() + time();
    expect(result % 1).toNotBe(0);
  });

});
