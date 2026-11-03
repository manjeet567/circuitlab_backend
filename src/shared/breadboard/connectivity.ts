import { generateBreadboardHoles, BreadboardHole, BreadboardSpec } from './breadboard-matrix.js';

export class BreadboardConnectivityGraph {
  private pins: BreadboardHole[];
  private groupMap: Map<string, string[]>;
  private pinToGroup: Map<string, string>;

  constructor(spec?: BreadboardSpec) {
    const generated = generateBreadboardHoles(spec);
    this.pins = generated.pins;
    this.groupMap = generated.groupMap;
    this.pinToGroup = generated.pinToGroup;
  }

  public getGroupId(pinId: string): string | undefined {
    return this.pinToGroup.get(pinId);
  }

  public areConnected(pinIdA: string, pinIdB: string): boolean {
    if (pinIdA === pinIdB) return true;
    const groupA = this.pinToGroup.get(pinIdA);
    const groupB = this.pinToGroup.get(pinIdB);
    if (!groupA || !groupB) return false;
    return groupA === groupB;
  }

  public getConnectedHoles(pinId: string): string[] {
    const group = this.pinToGroup.get(pinId);
    if (!group) return [];
    return this.groupMap.get(group) || [];
  }

  public getPin(pinId: string): BreadboardHole | undefined {
    return this.pins.find((p) => p.id === pinId);
  }

  public getAllPins(): BreadboardHole[] {
    return this.pins;
  }
}
