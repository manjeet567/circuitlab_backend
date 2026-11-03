import { describe, it, expect } from 'vitest';
import { BreadboardConnectivityGraph } from '../breadboard/connectivity.js';
import { generateBreadboardHoles } from '../breadboard/breadboard-matrix.js';

describe('Breadboard Connectivity Model', () => {
  const bb = new BreadboardConnectivityGraph({ rows: 30, pitch: 0.25 });

  it('connects holes within the same terminal strip (a through e)', () => {
    // Holes A1 through E1 are in the left terminal strip of row 1
    expect(bb.areConnected('hole_a1', 'hole_b1')).toBe(true);
    expect(bb.areConnected('hole_a1', 'hole_e1')).toBe(true);
    expect(bb.areConnected('hole_c1', 'hole_d1')).toBe(true);
  });

  it('isolates holes across different rows', () => {
    // Row 1 and Row 2 should never be connected internally
    expect(bb.areConnected('hole_a1', 'hole_a2')).toBe(false);
    expect(bb.areConnected('hole_c5', 'hole_c6')).toBe(false);
  });

  it('isolates terminal strips separated by the center trench (e vs f)', () => {
    // Left group is a-e, right group is f-j. Center trench separates them.
    expect(bb.areConnected('hole_e1', 'hole_f1')).toBe(false);
    expect(bb.areConnected('hole_a10', 'hole_j10')).toBe(false);
  });

  it('connects holes along the same power rail', () => {
    // Left ground rail connects all rows 1-30 in standard breadboard
    expect(bb.areConnected('rail_left_neg_1', 'rail_left_neg_15')).toBe(true);
    expect(bb.areConnected('rail_left_neg_1', 'rail_left_neg_30')).toBe(true);

    // Left positive rail connects along rows 1-30
    expect(bb.areConnected('rail_left_pos_2', 'rail_left_pos_20')).toBe(true);
  });

  it('isolates positive rail from negative rail', () => {
    expect(bb.areConnected('rail_left_pos_1', 'rail_left_neg_1')).toBe(false);
    expect(bb.areConnected('rail_right_pos_10', 'rail_right_neg_10')).toBe(false);
  });

  it('isolates left power rails from right power rails', () => {
    expect(bb.areConnected('rail_left_pos_1', 'rail_right_pos_1')).toBe(false);
    expect(bb.areConnected('rail_left_neg_1', 'rail_right_neg_1')).toBe(false);
  });

  it('supports split power rails when enabled', () => {
    const splitBb = new BreadboardConnectivityGraph({ rows: 30, pitch: 0.25, splitRails: true });
    // In row 1-15 (section 1), pins are connected
    expect(splitBb.areConnected('rail_left_pos_1', 'rail_left_pos_10')).toBe(true);
    // Pin in row 1-15 is NOT connected to row 16-30 (section 2)
    expect(splitBb.areConnected('rail_left_pos_1', 'rail_left_pos_20')).toBe(false);
  });

  it('returns valid world-relative positions for all pins', () => {
    const { pins } = generateBreadboardHoles();
    expect(pins.length).toBeGreaterThan(300); // 30 rows * 10 terminal holes + 4 rails * 30 = 420 holes
    for (const pin of pins) {
      expect(pin.position).toHaveLength(3);
      expect(typeof pin.position[0]).toBe('number');
      expect(typeof pin.position[1]).toBe('number');
      expect(typeof pin.position[2]).toBe('number');
    }
  });
});
