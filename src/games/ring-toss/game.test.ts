import { describe, expect, it } from 'vitest';
import {
  FLIGHT_TIME,
  NECK_RADIUS,
  RINGS_PER_ROUND,
  SWAY,
  THROWER,
  bottleAt,
  createState,
  step,
  swayOffset,
  throwRing,
} from './game';

/** Throws at (x, y) with no sway, and lets the ring land. */
function throwAndLand(state: ReturnType<typeof createState>, x: number, y: number) {
  state.time = 0;
  throwRing(state, x, y);
  step(state, FLIGHT_TIME);
}

describe('ring toss', () => {
  it('starts with a full set of rings, a grid of bottles and no score', () => {
    const state = createState();
    expect(state.ringsLeft).toBe(RINGS_PER_ROUND);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.bottles).toHaveLength(15);
  });

  it('uses one ring per throw', () => {
    const state = createState();
    expect(throwRing(state, 400, 200)).toBe(true);
    expect(state.ringsLeft).toBe(RINGS_PER_ROUND - 1);
    expect(state.flying).not.toBeNull();
  });

  it('throws one ring at a time', () => {
    const state = createState();
    throwRing(state, 400, 200);
    expect(throwRing(state, 400, 200)).toBe(false);
    expect(state.ringsLeft).toBe(RINGS_PER_ROUND - 1);
  });

  it('cannot throw once the rings run out', () => {
    const state = createState();
    state.ringsLeft = 0;
    expect(throwRing(state, 400, 200)).toBe(false);
    expect(state.flying).toBeNull();
  });

  it('never throws backwards, even when aimed below the thrower', () => {
    const state = createState();
    throwRing(state, THROWER.x, THROWER.y + 50);
    expect(state.flying!.toY).toBeLessThan(THROWER.y);
  });

  it('scores a ring that lands on a bottle neck', () => {
    const state = createState();
    const bottle = state.bottles[0];
    throwAndLand(state, bottle.x + NECK_RADIUS - 1, bottle.y);
    expect(state.score).toBe(bottle.points);
    expect(state.landed).toEqual([{ x: bottle.x, y: bottle.y, ringer: true }]);
  });

  it('scores nothing for a ring that misses every neck', () => {
    const state = createState();
    throwAndLand(state, 5, 450);
    expect(state.score).toBe(0);
    expect(state.landed[0].ringer).toBe(false);
  });

  it('only scores once the ring lands', () => {
    const state = createState();
    const bottle = state.bottles[0];
    state.time = 0;
    throwRing(state, bottle.x, bottle.y);
    step(state, FLIGHT_TIME / 2);
    expect(state.score).toBe(0);
    step(state, FLIGHT_TIME / 2);
    expect(state.score).toBe(bottle.points);
  });

  it('scores bottles further back higher', () => {
    const state = createState();
    const back = state.bottles.reduce((a, b) => (b.y < a.y ? b : a));
    const front = state.bottles.reduce((a, b) => (b.y > a.y ? b : a));
    expect(back.points).toBeGreaterThan(front.points);
  });

  it('ends the round when the last ring has landed', () => {
    const state = createState();
    for (let i = 0; i < RINGS_PER_ROUND; i++) {
      expect(state.phase).toBe('playing');
      throwAndLand(state, 5, 450);
    }
    expect(state.ringsLeft).toBe(0);
    expect(state.phase).toBe('over');
  });

  it('keeps playing while the last ring is still in the air', () => {
    const state = createState();
    state.ringsLeft = 1;
    throwRing(state, 400, 200);
    step(state, FLIGHT_TIME / 2);
    expect(state.phase).toBe('playing');
  });

  it('sways the throw no further than SWAY to either side', () => {
    expect(swayOffset(0)).toBe(0);
    for (let t = 0; t < 10; t += 0.1) {
      expect(Math.abs(swayOffset(t))).toBeLessThanOrEqual(SWAY);
    }
  });

  it('finds the bottle under a neck and none between bottles', () => {
    const state = createState();
    const [first, second] = state.bottles;
    expect(bottleAt(state, first.x, first.y)).toBe(first);
    expect(bottleAt(state, (first.x + second.x) / 2, first.y)).toBeUndefined();
  });
});
