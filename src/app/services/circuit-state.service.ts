import { Injectable, inject, signal } from '@angular/core';
import { CircuitNode, CircuitProject, CustomComponentDef, GateType, Pin, Wire } from '../models/circuit.model';
import { SimulationService } from './simulation.service';
import { TruthTableStorageService } from './truth-table-storage.service';

const STORAGE_CIRCUIT_KEY = 'elektro_active_circuit';
const STORAGE_COMPONENTS_KEY = 'elektro_custom_components';

@Injectable({
  providedIn: 'root',
})
export class CircuitStateService {
  private readonly simulationService = inject(SimulationService);
  private readonly truthTableStorage = inject(TruthTableStorageService);

  readonly circuitName = signal<string>('My Digital Circuit');
  readonly nodes = signal<CircuitNode[]>([]);
  readonly wires = signal<Wire[]>([]);
  readonly customComponents = signal<CustomComponentDef[]>([]);

  readonly selectedNodeId = signal<string | null>(null);
  readonly connectingWire = signal<{
    fromNodeId: string;
    fromPinId: string;
    fromPinType: 'input' | 'output';
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  readonly zoom = signal<number>(1);
  readonly panX = signal<number>(0);
  readonly panY = signal<number>(0);

  readonly viewportWidth = signal<number>(800);
  readonly viewportHeight = signal<number>(600);
  readonly toastMessage = signal<string | null>(null);
  private staggerOffset = 0;

  showToast(message: string): void {
    this.toastMessage.set(message);
    setTimeout(() => {
      if (this.toastMessage() === message) {
        this.toastMessage.set(null);
      }
    }, 2500);
  }

  constructor() {
    this.loadState();
  }

  // ==========================================
  // Persistence
  // ==========================================

  private saveState(): void {
    try {
      const stateToSave = {
        name: this.circuitName(),
        nodes: this.nodes(),
        wires: this.wires(),
        zoom: this.zoom(),
        panX: this.panX(),
        panY: this.panY(),
      };
      localStorage.setItem(STORAGE_CIRCUIT_KEY, JSON.stringify(stateToSave));
      localStorage.setItem(STORAGE_COMPONENTS_KEY, JSON.stringify(this.customComponents()));
    } catch (e) {
      console.error('Failed to auto-save circuit state:', e);
    }
  }

  private loadState(): void {
    try {
      // 1. Load custom components
      const compsData = localStorage.getItem(STORAGE_COMPONENTS_KEY);
      if (compsData) {
        const parsed = JSON.parse(compsData);
        if (Array.isArray(parsed)) {
          this.customComponents.set(parsed);
        }
      }

      // 2. Load active circuit
      const circuitData = localStorage.getItem(STORAGE_CIRCUIT_KEY);
      if (circuitData) {
        const parsed = JSON.parse(circuitData);
        if (parsed && Array.isArray(parsed.nodes) && parsed.nodes.length > 0) {
          this.circuitName.set(parsed.name || 'My Digital Circuit');
          this.nodes.set(parsed.nodes);
          this.wires.set(parsed.wires || []);
          const z = Number(parsed.zoom);
          this.zoom.set(!isNaN(z) && z >= 0.2 && z <= 3 ? z : 1);
          const px = Number(parsed.panX);
          this.panX.set(!isNaN(px) && Math.abs(px) < 15000 ? px : 0);
          const py = Number(parsed.panY);
          this.panY.set(!isNaN(py) && Math.abs(py) < 15000 ? py : 0);
          this.propagateSignals();
          return;
        }
      }
    } catch (e) {
      console.error('Failed to restore circuit state:', e);
    }

    // Default starter preset if empty
    this.loadPreset('half-adder');
  }

  // ==========================================
  // Simulation Propagation
  // ==========================================

  propagateSignals(): void {
    const sim = this.simulationService.simulate(
      this.nodes(),
      this.wires(),
      this.customComponents()
    );
    this.nodes.set(sim.nodes);
    this.wires.set(sim.wires);
  }

  // ==========================================
  // Node Management
  // ==========================================

  addNode(type: GateType, x: number, y: number, customId?: string): CircuitNode {
    const id = 'node_' + Math.random().toString(36).substr(2, 8);
    const existingCount = this.nodes().filter((n) => n.type === type).length + 1;

    let name = `${type} ${existingCount}`;
    let inputs: Pin[] = [];
    let outputs: Pin[] = [];
    let state = 0;
    // Input and output nodes default to being marked for truth table
    let showInTruthTable = type === 'INPUT' || type === 'OUTPUT';

    switch (type) {
      case 'INPUT': {
        const inLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        const inLetter = inLetters[existingCount - 1] || `In${existingCount}`;
        name = `Input ${inLetter}`;
        outputs = [{ id: 'p_out_1', name: inLetter, type: 'output', value: 0 }];
        state = 0;
        break;
      }
      case 'OUTPUT': {
        const outLetters = ['Y', 'Z', 'S', 'C', 'Q', 'X'];
        const outLetter = outLetters[existingCount - 1] || `Out${existingCount}`;
        name = `Output ${outLetter}`;
        inputs = [{ id: 'p_in_1', name: outLetter, type: 'input', value: 0 }];
        break;
      }
      case 'TRANSISTOR':
        name = `Transistor ${existingCount}`;
        inputs = [
          { id: 'p_in_source', name: 'In', type: 'input', value: 0 },
          { id: 'p_in_gate', name: 'Gate', type: 'input', value: 0 },
        ];
        outputs = [{ id: 'p_out_drain', name: 'Out', type: 'output', value: 0 }];
        break;
      case 'AND':
      case 'OR':
      case 'XOR':
      case 'XAND':
      case 'NOR':
      case 'NAND':
        inputs = [
          { id: 'p_in_1', name: 'A', type: 'input', value: 0 },
          { id: 'p_in_2', name: 'B', type: 'input', value: 0 },
        ];
        outputs = [{ id: 'p_out_1', name: 'Out', type: 'output', value: 0 }];
        break;
      case 'NOT':
        inputs = [{ id: 'p_in_1', name: 'In', type: 'input', value: 0 }];
        outputs = [{ id: 'p_out_1', name: 'Out', type: 'output', value: 0 }];
        break;
      case 'CUSTOM': {
        const customDef = this.customComponents().find((c) => c.id === customId);
        if (customDef) {
          name = customDef.name;
          inputs = customDef.inputs.map((pin) => ({
            id: pin.id,
            name: pin.name,
            type: 'input' as const,
            value: 0,
          }));
          outputs = customDef.outputs.map((pin) => ({
            id: pin.id,
            name: pin.name,
            type: 'output' as const,
            value: 0,
          }));
        } else {
          inputs = [{ id: 'p_in_1', name: 'In', type: 'input', value: 0 }];
          outputs = [{ id: 'p_out_1', name: 'Out', type: 'output', value: 0 }];
        }
        break;
      }
    }

    const newNode: CircuitNode = {
      id,
      type,
      name,
      x: Math.round(x),
      y: Math.round(y),
      inputs,
      outputs,
      showInTruthTable,
      state,
      customComponentId: customId,
    };

    this.nodes.update((list) => [...list, newNode]);
    this.selectedNodeId.set(newNode.id);
    this.showToast(`Added ${newNode.name}`);
    this.propagateSignals();
    this.saveState();
    return newNode;
  }

  addNodeAtCenter(type: GateType, customId?: string): CircuitNode {
    const vpW = this.viewportWidth() || (typeof window !== 'undefined' ? window.innerWidth - 270 : 800);
    const vpH = this.viewportHeight() || (typeof window !== 'undefined' ? window.innerHeight - 58 : 600);
    const z = this.zoom() || 1;

    this.staggerOffset = (this.staggerOffset + 35) % 180;
    const centerX = (vpW / 2 - this.panX()) / z - 80 + this.staggerOffset;
    const centerY = (vpH / 2 - this.panY()) / z - 40 + this.staggerOffset;

    return this.addNode(type, Math.round(centerX), Math.round(centerY), customId);
  }

  removeNode(id: string): void {
    this.nodes.update((list) => list.filter((n) => n.id !== id));
    this.wires.update((list) => list.filter((w) => w.fromNodeId !== id && w.toNodeId !== id));
    if (this.selectedNodeId() === id) {
      this.selectedNodeId.set(null);
    }
    this.propagateSignals();
    this.saveState();
  }

  updateNodePosition(id: string, x: number, y: number): void {
    this.nodes.update((list) =>
      list.map((n) => (n.id === id ? { ...n, x: Math.round(x), y: Math.round(y) } : n))
    );
    this.saveState();
  }

  toggleInputNode(id: string): void {
    this.nodes.update((list) =>
      list.map((n) => {
        if (n.id === id && n.type === 'INPUT') {
          const nextState = n.state === 1 ? 0 : 1;
          const updatedOutputs = n.outputs.map((p) => ({ ...p, value: nextState }));
          return { ...n, state: nextState, outputs: updatedOutputs };
        }
        return n;
      })
    );
    this.propagateSignals();
    this.saveState();
  }

  toggleNodeTableMarker(id: string): void {
    this.nodes.update((list) =>
      list.map((n) => (n.id === id ? { ...n, showInTruthTable: !n.showInTruthTable } : n))
    );
    this.saveState();
  }

  renameNode(id: string, newName: string): void {
    const trimmed = newName.trim();
    if (!trimmed) return;
    this.nodes.update((list) =>
      list.map((n) => (n.id === id ? { ...n, name: trimmed } : n))
    );
    this.saveState();
  }

  // Dynamic Pins: Add and Remove inputs dynamically
  addInputPinToNode(nodeId: string): void {
    this.nodes.update((list) =>
      list.map((n) => {
        if (n.id !== nodeId) return n;
        // Don't add to fixed pin types
        if (n.type === 'TRANSISTOR' || n.type === 'OUTPUT') return n;

        const nextLetter = String.fromCharCode(65 + n.inputs.length); // C, D, E...
        const newPin: Pin = {
          id: 'p_in_' + (n.inputs.length + 1) + '_' + Math.random().toString(36).substr(2, 4),
          name: nextLetter,
          type: 'input',
          value: 0,
        };
        return { ...n, inputs: [...n.inputs, newPin] };
      })
    );
    this.propagateSignals();
    this.saveState();
  }

  removeInputPinFromNode(nodeId: string, pinId: string): void {
    this.nodes.update((list) =>
      list.map((n) => {
        if (n.id !== nodeId) return n;
        if (n.inputs.length <= 1) return n; // Keep at least one
        return { ...n, inputs: n.inputs.filter((p) => p.id !== pinId) };
      })
    );
    // Also remove connected wires
    this.wires.update((list) =>
      list.filter((w) => !(w.toNodeId === nodeId && w.toPinId === pinId))
    );
    this.propagateSignals();
    this.saveState();
  }

  renamePin(nodeId: string, pinId: string, newName: string): void {
    const trimmed = newName.trim();
    if (!trimmed) return;
    this.nodes.update((list) =>
      list.map((n) => {
        if (n.id !== nodeId) return n;
        const newInputs = n.inputs.map((p) => (p.id === pinId ? { ...p, name: trimmed } : p));
        const newOutputs = n.outputs.map((p) => (p.id === pinId ? { ...p, name: trimmed } : p));
        return { ...n, inputs: newInputs, outputs: newOutputs };
      })
    );
    this.saveState();
  }

  // ==========================================
  // Wires Management
  // ==========================================

  startWireConnection(
    nodeId: string,
    pinId: string,
    pinType: 'input' | 'output',
    startX: number,
    startY: number
  ): void {
    this.connectingWire.set({
      fromNodeId: nodeId,
      fromPinId: pinId,
      fromPinType: pinType,
      startX,
      startY,
      currentX: startX,
      currentY: startY,
    });
  }

  updateConnectingWire(x: number, y: number): void {
    const current = this.connectingWire();
    if (current) {
      this.connectingWire.set({
        ...current,
        currentX: x,
        currentY: y,
      });
    }
  }

  completeWireConnection(targetNodeId: string, targetPinId: string, targetPinType: 'input' | 'output'): boolean {
    const current = this.connectingWire();
    if (!current) return false;

    // Must connect output to input or input to output, never same node or same pin type
    if (current.fromNodeId === targetNodeId) {
      this.cancelWireConnection();
      return false;
    }

    let sourceNodeId: string;
    let sourcePinId: string;
    let destNodeId: string;
    let destPinId: string;

    if (current.fromPinType === 'output' && targetPinType === 'input') {
      sourceNodeId = current.fromNodeId;
      sourcePinId = current.fromPinId;
      destNodeId = targetNodeId;
      destPinId = targetPinId;
    } else if (current.fromPinType === 'input' && targetPinType === 'output') {
      sourceNodeId = targetNodeId;
      sourcePinId = targetPinId;
      destNodeId = current.fromNodeId;
      destPinId = current.fromPinId;
    } else {
      this.cancelWireConnection();
      return false;
    }

    // Remove existing wire into this input pin (one input pin receives one wire)
    this.wires.update((list) =>
      list.filter((w) => !(w.toNodeId === destNodeId && w.toPinId === destPinId))
    );

    const wireId = 'wire_' + Math.random().toString(36).substr(2, 8);
    const newWire: Wire = {
      id: wireId,
      fromNodeId: sourceNodeId,
      fromPinId: sourcePinId,
      toNodeId: destNodeId,
      toPinId: destPinId,
      value: 0,
    };

    this.wires.update((list) => [...list, newWire]);
    this.cancelWireConnection();
    this.propagateSignals();
    this.saveState();
    return true;
  }

  cancelWireConnection(): void {
    this.connectingWire.set(null);
  }

  removeWire(id: string): void {
    this.wires.update((list) => list.filter((w) => w.id !== id));
    this.propagateSignals();
    this.saveState();
  }

  // ==========================================
  // Custom Components Management
  // ==========================================

  addCustomComponent(def: CustomComponentDef): void {
    this.customComponents.update((list) => [...list.filter((c) => c.id !== def.id), def]);
    this.saveState();
  }

  deleteCustomComponent(id: string): void {
    this.customComponents.update((list) => list.filter((c) => c.id !== id));
    // Also remove any instantiated nodes of this custom component
    this.nodes.update((list) => list.filter((n) => n.customComponentId !== id));
    this.wires.update((list) =>
      list.filter((w) => {
        const fromN = this.nodes().find((n) => n.id === w.fromNodeId);
        const toN = this.nodes().find((n) => n.id === w.toNodeId);
        return fromN && toN;
      })
    );
    this.propagateSignals();
    this.saveState();
  }

  /**
   * Package current circuit into a reusable component.
   */
  packageCurrentCircuitAsComponent(name: string, description: string = ''): CustomComponentDef | null {
    const inputNodes = this.nodes().filter((n) => n.type === 'INPUT');
    const outputNodes = this.nodes().filter((n) => n.type === 'OUTPUT');

    if (inputNodes.length === 0 || outputNodes.length === 0) {
      return null;
    }

    inputNodes.sort((a, b) => a.y - b.y || a.x - b.x);
    outputNodes.sort((a, b) => a.y - b.y || a.x - b.x);

    const compId = 'custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);

    // Pre-calculate truth table for this component
    const generatedTable = this.simulationService.generateTruthTable(
      this.nodes(),
      this.wires(),
      this.customComponents(),
      name
    );

    const customDef: CustomComponentDef = {
      id: compId,
      name: name.trim() || 'Custom IC',
      description,
      inputs: inputNodes.map((n, i) => ({
        id: `in_${i}`,
        name: n.name.replace(/^Input\s*/i, '') || `In${i + 1}`,
      })),
      outputs: outputNodes.map((n, i) => ({
        id: `out_${i}`,
        name: n.name.replace(/^Output\s*/i, '') || `Out${i + 1}`,
      })),
      truthTable: generatedTable.rows.map((row) => {
        // Map output column names to output pin IDs
        const outputsById: Record<string, number> = {};
        outputNodes.forEach((n, idx) => {
          const colKey = n.name || `Out_${n.id.slice(0, 4)}`;
          outputsById[`out_${idx}`] = row.outputs[colKey] ?? 0;
        });
        return {
          inputs: row.inputs,
          outputs: outputsById,
        };
      }),
      subCircuit: {
        nodes: JSON.parse(JSON.stringify(this.nodes())),
        wires: JSON.parse(JSON.stringify(this.wires())),
      },
      color: '#a855f7',
    };

    this.addCustomComponent(customDef);
    return customDef;
  }

  // ==========================================
  // Import / Export
  // ==========================================

  exportProject(): void {
    const project: CircuitProject = {
      version: '1.0.0',
      name: this.circuitName(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      nodes: this.nodes(),
      wires: this.wires(),
      customComponents: this.customComponents(),
      savedTables: [...this.truthTableStorage.tables()],
    };

    const jsonStr = JSON.stringify(project, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const filename = `${this.circuitName().toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'circuit'}.json`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  importProject(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.wires)) {
        throw new Error('Invalid project structure');
      }

      this.circuitName.set(data.name || 'Imported Circuit');
      this.nodes.set(data.nodes);
      this.wires.set(data.wires);

      if (Array.isArray(data.customComponents)) {
        this.customComponents.set(data.customComponents);
      }

      if (Array.isArray(data.savedTables)) {
        data.savedTables.forEach((t: any) => this.truthTableStorage.saveTable(t));
      }

      this.propagateSignals();
      this.saveState();
      return true;
    } catch (e) {
      console.error('Failed to import project:', e);
      return false;
    }
  }

  clearCircuit(): void {
    this.nodes.set([]);
    this.wires.set([]);
    this.selectedNodeId.set(null);
    this.cancelWireConnection();
    this.saveState();
  }

  // ==========================================
  // Presets
  // ==========================================

  loadPreset(presetKey: string): void {
    this.clearCircuit();
    this.zoom.set(1);
    this.panX.set(0);
    this.panY.set(0);

    if (presetKey === 'half-adder') {
      this.circuitName.set('Half Adder');
      // Inputs: A (x:150, y:180), B (x:150, y:300)
      const inA = this.addNode('INPUT', 140, 160);
      inA.name = 'Input A';
      if (inA.outputs[0]) inA.outputs[0].name = 'A';

      const inB = this.addNode('INPUT', 140, 300);
      inB.name = 'Input B';
      if (inB.outputs[0]) inB.outputs[0].name = 'B';

      // XOR for Sum (x:380, y:170)
      const xor1 = this.addNode('XOR', 380, 160);
      xor1.name = 'XOR (Sum)';

      // AND for Carry (x:380, y:310)
      const and1 = this.addNode('AND', 380, 310);
      and1.name = 'AND (Carry)';

      // Outputs: Sum (x:620, y:170), Carry (x:620, y:320)
      const outSum = this.addNode('OUTPUT', 620, 170);
      outSum.name = 'Sum (S)';
      if (outSum.inputs[0]) outSum.inputs[0].name = 'S';

      const outCarry = this.addNode('OUTPUT', 620, 320);
      outCarry.name = 'Carry (C)';
      if (outCarry.inputs[0]) outCarry.inputs[0].name = 'C';

      // Connect wires
      this.wires.set([
        { id: 'w1', fromNodeId: inA.id, fromPinId: inA.outputs[0].id, toNodeId: xor1.id, toPinId: xor1.inputs[0].id, value: 0 },
        { id: 'w2', fromNodeId: inB.id, fromPinId: inB.outputs[0].id, toNodeId: xor1.id, toPinId: xor1.inputs[1].id, value: 0 },
        { id: 'w3', fromNodeId: inA.id, fromPinId: inA.outputs[0].id, toNodeId: and1.id, toPinId: and1.inputs[0].id, value: 0 },
        { id: 'w4', fromNodeId: inB.id, fromPinId: inB.outputs[0].id, toNodeId: and1.id, toPinId: and1.inputs[1].id, value: 0 },
        { id: 'w5', fromNodeId: xor1.id, fromPinId: xor1.outputs[0].id, toNodeId: outSum.id, toPinId: outSum.inputs[0].id, value: 0 },
        { id: 'w6', fromNodeId: and1.id, fromPinId: and1.outputs[0].id, toNodeId: outCarry.id, toPinId: outCarry.inputs[0].id, value: 0 },
      ]);
    } else if (presetKey === 'transistor-inverter') {
      this.circuitName.set('NMOS Inverter Switch');
      const inVdd = this.addNode('INPUT', 140, 150);
      inVdd.name = 'Vcc (1)';
      inVdd.state = 1;

      const inCtrl = this.addNode('INPUT', 140, 270);
      inCtrl.name = 'Control Gate';
      inCtrl.state = 1;

      const trans = this.addNode('TRANSISTOR', 380, 200);

      const outY = this.addNode('OUTPUT', 600, 210);
      outY.name = 'Conducted Output';

      this.wires.set([
        { id: 'w1', fromNodeId: inVdd.id, fromPinId: inVdd.outputs[0].id, toNodeId: trans.id, toPinId: trans.inputs[0].id, value: 1 },
        { id: 'w2', fromNodeId: inCtrl.id, fromPinId: inCtrl.outputs[0].id, toNodeId: trans.id, toPinId: trans.inputs[1].id, value: 1 },
        { id: 'w3', fromNodeId: trans.id, fromPinId: trans.outputs[0].id, toNodeId: outY.id, toPinId: outY.inputs[0].id, value: 1 },
      ]);
    } else if (presetKey === 'multiplexer') {
      this.circuitName.set('2-to-1 Multiplexer');
      const inD0 = this.addNode('INPUT', 120, 120);
      inD0.name = 'Data D0';

      const inD1 = this.addNode('INPUT', 120, 240);
      inD1.name = 'Data D1';

      const inSel = this.addNode('INPUT', 120, 360);
      inSel.name = 'Select (S)';

      const notSel = this.addNode('NOT', 300, 360);

      const and0 = this.addNode('AND', 440, 150);
      and0.name = 'AND (D0 & ~S)';

      const and1 = this.addNode('AND', 440, 270);
      and1.name = 'AND (D1 & S)';

      const orOut = this.addNode('OR', 620, 210);
      orOut.name = 'OR (Output)';

      const finalOut = this.addNode('OUTPUT', 790, 220);
      finalOut.name = 'Mux Output (Y)';

      this.wires.set([
        { id: 'w1', fromNodeId: inSel.id, fromPinId: inSel.outputs[0].id, toNodeId: notSel.id, toPinId: notSel.inputs[0].id, value: 0 },
        { id: 'w2', fromNodeId: inD0.id, fromPinId: inD0.outputs[0].id, toNodeId: and0.id, toPinId: and0.inputs[0].id, value: 0 },
        { id: 'w3', fromNodeId: notSel.id, fromPinId: notSel.outputs[0].id, toNodeId: and0.id, toPinId: and0.inputs[1].id, value: 0 },
        { id: 'w4', fromNodeId: inD1.id, fromPinId: inD1.outputs[0].id, toNodeId: and1.id, toPinId: and1.inputs[0].id, value: 0 },
        { id: 'w5', fromNodeId: inSel.id, fromPinId: inSel.outputs[0].id, toNodeId: and1.id, toPinId: and1.inputs[1].id, value: 0 },
        { id: 'w6', fromNodeId: and0.id, fromPinId: and0.outputs[0].id, toNodeId: orOut.id, toPinId: orOut.inputs[0].id, value: 0 },
        { id: 'w7', fromNodeId: and1.id, fromPinId: and1.outputs[0].id, toNodeId: orOut.id, toPinId: orOut.inputs[1].id, value: 0 },
        { id: 'w8', fromNodeId: orOut.id, fromPinId: orOut.outputs[0].id, toNodeId: finalOut.id, toPinId: finalOut.inputs[0].id, value: 0 },
      ]);
    }

    this.propagateSignals();
    this.saveState();
  }
}
