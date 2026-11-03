import { PlacedComponent, Wire } from '../types/component.js';
import { BreadboardConnectivityGraph } from '../breadboard/connectivity.js';
import { COMPONENT_METADATA } from '../constants/components.js';

export interface PinKey {
  componentId: string;
  pinId: string;
}

export function pinKey(componentId: string, pinId: string): string {
  return `${componentId}:${pinId}`;
}

export function parsePinKey(key: string): PinKey {
  const [componentId, pinId] = key.split(':');
  return { componentId, pinId };
}

export interface ResolvedNet {
  id: string;
  pins: PinKey[];
  hasVCC: boolean;
  hasGND: boolean;
  gpioPins: { componentId: string; pinId: string; gpioNumber: number }[];
}

export class CircuitGraph {
  private components: Map<string, PlacedComponent> = new Map();
  private wires: Wire[] = [];
  private breadboardGraph: BreadboardConnectivityGraph;

  constructor(components: PlacedComponent[] = [], wires: Wire[] = []) {
    this.breadboardGraph = new BreadboardConnectivityGraph();
    this.updateGraph(components, wires);
  }

  public updateGraph(components: PlacedComponent[], wires: Wire[]) {
    this.components.clear();
    for (const comp of components) {
      this.components.set(comp.id, comp);
    }
    this.wires = wires;
  }

  public getComponent(id: string): PlacedComponent | undefined {
    return this.components.get(id);
  }

  public getAllComponents(): PlacedComponent[] {
    return Array.from(this.components.values());
  }

  public getAllWires(): Wire[] {
    return this.wires;
  }

  /**
   * Resolves all electrical nets in the circuit, taking into account
   * wires and breadboard internal connections.
   */
  public computeNets(): ResolvedNet[] {
    const parent: Map<string, string> = new Map();

    function find(i: string): string {
      const p = parent.get(i);
      if (!p || p === i) {
        parent.set(i, i);
        return i;
      }
      const root = find(p);
      parent.set(i, root);
      return root;
    }

    function union(i: string, j: string) {
      const rootI = find(i);
      const rootJ = find(j);
      if (rootI !== rootJ) {
        parent.set(rootI, rootJ);
      }
    }

    // 1. Add all pins from placed components into disjoint set
    for (const comp of this.components.values()) {
      if (comp.type === 'breadboard') {
        const bbPins = this.breadboardGraph.getAllPins();
        for (const pin of bbPins) {
          const k = pinKey(comp.id, pin.id);
          parent.set(k, k);
        }
      } else {
        const meta = COMPONENT_METADATA[comp.type];
        if (meta) {
          for (const pin of meta.pins) {
            const k = pinKey(comp.id, pin.id);
            parent.set(k, k);
          }
        }
      }
    }

    // 2. Connect breadboard internal holes within the same group
    for (const comp of this.components.values()) {
      if (comp.type === 'breadboard') {
        const bbPins = this.breadboardGraph.getAllPins();
        const groups: Map<string, string[]> = new Map();
        for (const pin of bbPins) {
          const arr = groups.get(pin.groupId) || [];
          arr.push(pinKey(comp.id, pin.id));
          groups.set(pin.groupId, arr);
        }
        for (const pinKeysInGroup of groups.values()) {
          const leader = pinKeysInGroup[0];
          for (let i = 1; i < pinKeysInGroup.length; i++) {
            union(leader, pinKeysInGroup[i]);
          }
        }
      }
    }

    // 3. Connect pins with wires
    for (const wire of this.wires) {
      const fromKey = pinKey(wire.from.componentId, wire.from.pinId);
      const toKey = pinKey(wire.to.componentId, wire.to.pinId);
      union(fromKey, toKey);
    }

    // 4. Group by root leader
    const netClusters: Map<string, PinKey[]> = new Map();
    for (const key of parent.keys()) {
      const root = find(key);
      const list = netClusters.get(root) || [];
      list.push(parsePinKey(key));
      netClusters.set(root, list);
    }

    // 5. Build ResolvedNet list, annotating VCC, GND, and GPIO
    const resolvedNets: ResolvedNet[] = [];
    let netIndex = 1;

    for (const [rootKey, pins] of netClusters.entries()) {
      // Filter out isolated breadboard holes with no connected external components/wires
      const hasConnection = pins.some((p) => {
        const comp = this.components.get(p.componentId);
        return comp && comp.type !== 'breadboard';
      }) || this.wires.some((w) => {
        const fKey = pinKey(w.from.componentId, w.from.pinId);
        const tKey = pinKey(w.to.componentId, w.to.pinId);
        return find(fKey) === rootKey || find(tKey) === rootKey;
      });

      if (!hasConnection && pins.length > 1) {
        // It's just a breadboard group with nothing attached
        continue;
      }

      let hasVCC = false;
      let hasGND = false;
      const gpioPins: { componentId: string; pinId: string; gpioNumber: number }[] = [];

      for (const p of pins) {
        const comp = this.components.get(p.componentId);
        if (!comp) continue;

        if (comp.type === 'esp32') {
          if (p.pinId === '3v3' || p.pinId === 'vin') {
            hasVCC = true;
          } else if (p.pinId.startsWith('gnd')) {
            hasGND = true;
          } else if (p.pinId.startsWith('gpio')) {
            const num = parseInt(p.pinId.replace('gpio', ''), 10);
            if (!isNaN(num)) {
              gpioPins.push({ componentId: p.componentId, pinId: p.pinId, gpioNumber: num });
            }
          }
        }
      }

      resolvedNets.push({
        id: `net_${netIndex++}`,
        pins,
        hasVCC,
        hasGND,
        gpioPins,
      });
    }

    return resolvedNets;
  }

  /**
   * Returns the net containing a given pin, if any.
   */
  public findNetForPin(componentId: string, pinId: string, nets?: ResolvedNet[]): ResolvedNet | undefined {
    const list = nets || this.computeNets();
    return list.find((net) =>
      net.pins.some((p) => p.componentId === componentId && p.pinId === pinId)
    );
  }

  /**
   * Checks whether two pins are in the same electrical net.
   */
  public arePinsElectricallyConnected(
    compA: string,
    pinA: string,
    compB: string,
    pinB: string
  ): boolean {
    const nets = this.computeNets();
    const netA = this.findNetForPin(compA, pinA, nets);
    const netB = this.findNetForPin(compB, pinB, nets);
    return !!netA && !!netB && netA.id === netB.id;
  }
}
