import { PinDefinition } from '../types/component.js';

export interface BreadboardHole extends PinDefinition {
  groupId: string;
  row?: number;
  col?: string;
  railType?: 'pos' | 'neg';
  railSide?: 'left' | 'right';
}

export interface BreadboardSpec {
  rows: number; // default 30
  pitch: number; // default 0.25
  splitRails?: boolean; // if true, power rails are split at row 15
}

/**
 * Generates all pin definitions for a solderless breadboard,
 * along with their electrical connectivity groups and 3D local coordinates.
 */
export function generateBreadboardHoles(spec: BreadboardSpec = { rows: 30, pitch: 0.25, splitRails: false }): {
  pins: BreadboardHole[];
  groupMap: Map<string, string[]>; // groupId -> array of pin IDs
  pinToGroup: Map<string, string>; // pinId -> groupId
} {
  const { rows, pitch, splitRails } = spec;
  const pins: BreadboardHole[] = [];
  const groupMap = new Map<string, string[]>();
  const pinToGroup = new Map<string, string>();

  function registerPin(pin: BreadboardHole) {
    pins.push(pin);
    pinToGroup.set(pin.id, pin.groupId);
    const existing = groupMap.get(pin.groupId) || [];
    existing.push(pin.id);
    groupMap.set(pin.groupId, existing);
  }

  const zCenter = (rows + 1) / 2;
  const colsLeft = ['a', 'b', 'c', 'd', 'e'];
  const colsRight = ['f', 'g', 'h', 'i', 'j'];

  // 1. Generate Terminal Strip Holes (Rows 1 to 30)
  for (let r = 1; r <= rows; r++) {
    const z = (r - zCenter) * pitch;

    // Left terminal strip group: row_{r}_left
    const leftGroupId = `row_${r}_left`;
    colsLeft.forEach((col, idx) => {
      const x = -1.25 + idx * pitch;
      const pinId = `hole_${col}${r}`;
      registerPin({
        id: pinId,
        name: `${col.toUpperCase()}${r}`,
        type: 'passive',
        position: [x, 0.1, z],
        groupId: leftGroupId,
        row: r,
        col,
        description: `Terminal strip row ${r}, col ${col.toUpperCase()} (connected to a-e)`,
      });
    });

    // Right terminal strip group: row_{r}_right (separated by center trench!)
    const rightGroupId = `row_${r}_right`;
    colsRight.forEach((col, idx) => {
      const x = 0.25 + idx * pitch;
      const pinId = `hole_${col}${r}`;
      registerPin({
        id: pinId,
        name: `${col.toUpperCase()}${r}`,
        type: 'passive',
        position: [x, 0.1, z],
        groupId: rightGroupId,
        row: r,
        col,
        description: `Terminal strip row ${r}, col ${col.toUpperCase()} (connected to f-j)`,
      });
    });
  }

  // 2. Generate Power Rails (+ and - on left and right)
  for (let r = 1; r <= rows; r++) {
    const z = (r - zCenter) * pitch;
    const isSecondHalf = splitRails && r > rows / 2;
    const splitSuffix = splitRails ? (isSecondHalf ? '_section2' : '_section1') : '';

    // Left Negative Rail (-)
    const leftNegGroup = `rail_left_neg${splitSuffix}`;
    registerPin({
      id: `rail_left_neg_${r}`,
      name: `- (L${r})`,
      type: 'ground',
      position: [-2.2, 0.1, z],
      groupId: leftNegGroup,
      row: r,
      railType: 'neg',
      railSide: 'left',
      description: `Left ground (-) bus rail`,
    });

    // Left Positive Rail (+)
    const leftPosGroup = `rail_left_pos${splitSuffix}`;
    registerPin({
      id: `rail_left_pos_${r}`,
      name: `+ (L${r})`,
      type: 'power',
      position: [-1.8, 0.1, z],
      groupId: leftPosGroup,
      row: r,
      railType: 'pos',
      railSide: 'left',
      description: `Left positive (+) bus rail`,
    });

    // Right Positive Rail (+)
    const rightPosGroup = `rail_right_pos${splitSuffix}`;
    registerPin({
      id: `rail_right_pos_${r}`,
      name: `+ (R${r})`,
      type: 'power',
      position: [1.8, 0.1, z],
      groupId: rightPosGroup,
      row: r,
      railType: 'pos',
      railSide: 'right',
      description: `Right positive (+) bus rail`,
    });

    // Right Negative Rail (-)
    const rightNegGroup = `rail_right_neg${splitSuffix}`;
    registerPin({
      id: `rail_right_neg_${r}`,
      name: `- (R${r})`,
      type: 'ground',
      position: [2.2, 0.1, z],
      groupId: rightNegGroup,
      row: r,
      railType: 'neg',
      railSide: 'right',
      description: `Right ground (-) bus rail`,
    });
  }

  return { pins, groupMap, pinToGroup };
}
