import { Injectable } from '@angular/core';
import { CircuitNode, CustomComponentDef, Pin, TruthTable, TruthTableRow, Wire } from '../models/circuit.model';

@Injectable({
  providedIn: 'root',
})
export class SimulationService {
  /**
   * Evaluate a single gate given its inputs.
   */
  evaluateGate(
    type: string,
    inputs: number[],
    customDef?: CustomComponentDef,
    extraState?: { state?: number }
  ): Record<string, number> {
    switch (type) {
      case 'INPUT':
        return { out: extraState?.state ?? 0 };

      case 'OUTPUT':
        return { out: inputs[0] ?? 0 };

      case 'TRANSISTOR': {
        // NMOS pass-gate / digital switch:
        // inputs[0] = Source / In, inputs[1] = Gate / Control
        const source = inputs[0] ?? 0;
        const gate = inputs[1] ?? 0;
        return { out: gate === 1 ? source : 0 };
      }

      case 'AND': {
        const val = inputs.length > 0 && inputs.every((v) => v === 1) ? 1 : 0;
        return { out: val };
      }

      case 'OR': {
        const val = inputs.some((v) => v === 1) ? 1 : 0;
        return { out: val };
      }

      case 'XOR': {
        // Parity XOR
        const count = inputs.filter((v) => v === 1).length;
        return { out: count % 2 === 1 ? 1 : 0 };
      }

      case 'XAND': {
        // XNOR / XAND logic: invert XOR
        const count = inputs.filter((v) => v === 1).length;
        return { out: count % 2 === 0 ? 1 : 0 };
      }

      case 'NOR': {
        const val = inputs.some((v) => v === 1) ? 0 : 1;
        return { out: val };
      }

      case 'NOT': {
        return { out: (inputs[0] ?? 0) === 1 ? 0 : 1 };
      }

      case 'NAND': {
        const allOn = inputs.length > 0 && inputs.every((v) => v === 1);
        return { out: allOn ? 0 : 1 };
      }

      case 'CUSTOM': {
        if (!customDef) return { out: 0 };
        // If defined via truth table:
        if (customDef.truthTable && customDef.truthTable.length > 0) {
          const matchRow = customDef.truthTable.find((row) =>
            row.inputs.every((val, idx) => val === (inputs[idx] ?? 0))
          );
          if (matchRow) {
            return { ...matchRow.outputs };
          }
          // Default all outputs to 0 if no match
          const defOutputs: Record<string, number> = {};
          customDef.outputs.forEach((o) => (defOutputs[o.id] = 0));
          return defOutputs;
        }

        // If defined via subCircuit:
        if (customDef.subCircuit) {
          return this.simulateSubCircuit(customDef.subCircuit, inputs, customDef);
        }

        return { out: 0 };
      }

      default:
        return { out: 0 };
    }
  }

  /**
   * Run simulation on a full circuit graph until steady-state or max iterations.
   * Returns updated nodes and wires with calculated pin values.
   */
  simulate(
    nodes: CircuitNode[],
    wires: Wire[],
    customDefs: CustomComponentDef[] = []
  ): { nodes: CircuitNode[]; wires: Wire[] } {
    // Clone nodes and wires to avoid accidental mutation
    const nodesCopy: CircuitNode[] = nodes.map((n) => ({
      ...n,
      inputs: n.inputs.map((p) => ({ ...p })),
      outputs: n.outputs.map((p) => ({ ...p })),
    }));
    const wiresCopy: Wire[] = wires.map((w) => ({ ...w }));

    const maxIterations = 25;
    let changed = true;
    let iteration = 0;

    const customMap = new Map<string, CustomComponentDef>();
    customDefs.forEach((cd) => customMap.set(cd.id, cd));

    while (changed && iteration < maxIterations) {
      changed = false;
      iteration++;

      // 1. Evaluate node outputs based on current inputs & internal state
      for (const node of nodesCopy) {
        const inVals = node.inputs.map((p) => p.value);
        const customDef = node.customComponentId ? customMap.get(node.customComponentId) : undefined;
        const outMap = this.evaluateGate(node.type, inVals, customDef, { state: node.state });

        if (node.type === 'CUSTOM' && customDef) {
          for (const outPin of node.outputs) {
            const newVal = outMap[outPin.id] ?? outMap[outPin.name] ?? 0;
            if (outPin.value !== newVal) {
              outPin.value = newVal;
              changed = true;
            }
          }
        } else {
          // Standard single-output or direct output mapping
          const firstOutVal = outMap['out'] ?? 0;
          for (const outPin of node.outputs) {
            if (outPin.value !== firstOutVal) {
              outPin.value = firstOutVal;
              changed = true;
            }
          }
        }
      }

      // 2. Propagate values along wires
      const nodeMap = new Map<string, CircuitNode>();
      nodesCopy.forEach((n) => nodeMap.set(n.id, n));

      for (const wire of wiresCopy) {
        const fromNode = nodeMap.get(wire.fromNodeId);
        const toNode = nodeMap.get(wire.toNodeId);

        if (fromNode && toNode) {
          const fromPin = fromNode.outputs.find((p) => p.id === wire.fromPinId);
          const toPin = toNode.inputs.find((p) => p.id === wire.toPinId);

          if (fromPin && toPin) {
            const wireVal = fromPin.value;
            if (wire.value !== wireVal) {
              wire.value = wireVal;
              changed = true;
            }
            if (toPin.value !== wireVal) {
              toPin.value = wireVal;
              changed = true;
            }
          }
        }
      }
    }

    return { nodes: nodesCopy, wires: wiresCopy };
  }

  /**
   * Evaluate a nested sub-circuit.
   */
  private simulateSubCircuit(
    subCircuit: { nodes: CircuitNode[]; wires: Wire[] },
    inputValues: number[],
    customDef: CustomComponentDef
  ): Record<string, number> {
    // Match customDef inputs to subCircuit INPUT nodes
    const inputNodes = subCircuit.nodes.filter((n) => n.type === 'INPUT');
    const preparedNodes = subCircuit.nodes.map((n) => {
      if (n.type === 'INPUT') {
        const idx = inputNodes.findIndex((inNode) => inNode.id === n.id);
        const assignedVal = idx >= 0 && idx < inputValues.length ? inputValues[idx] : 0;
        return { ...n, state: assignedVal };
      }
      return { ...n };
    });

    const res = this.simulate(preparedNodes, subCircuit.wires);

    // Collect values from subCircuit OUTPUT nodes
    const outputNodes = res.nodes.filter((n) => n.type === 'OUTPUT');
    const outputMap: Record<string, number> = {};

    customDef.outputs.forEach((outDef, idx) => {
      const matchNode = outputNodes[idx];
      outputMap[outDef.id] = matchNode ? (matchNode.inputs[0]?.value ?? 0) : 0;
    });

    return outputMap;
  }

  /**
   * Generate complete truth table for all marked/available inputs and outputs.
   */
  generateTruthTable(
    nodes: CircuitNode[],
    wires: Wire[],
    customDefs: CustomComponentDef[] = [],
    tableName: string = 'Truth Table'
  ): TruthTable {
    // 1. Identify Inputs: All INPUT nodes marked showInTruthTable (or all INPUT nodes if none specifically ticked)
    let inputNodes = nodes.filter((n) => n.type === 'INPUT' && n.showInTruthTable);
    if (inputNodes.length === 0) {
      inputNodes = nodes.filter((n) => n.type === 'INPUT');
    }

    // 2. Identify Outputs:
    // Any node with showInTruthTable === true (excluding input nodes)
    let outputNodes = nodes.filter((n) => n.type !== 'INPUT' && n.showInTruthTable);
    if (outputNodes.length === 0) {
      outputNodes = nodes.filter((n) => n.type === 'OUTPUT');
    }

    // Sort nodes by x coordinate or name for consistent column order
    inputNodes.sort((a, b) => a.x - b.x || a.name.localeCompare(b.name));
    outputNodes.sort((a, b) => a.x - b.x || a.name.localeCompare(b.name));

    const inputNames = inputNodes.map((n) => n.name || `In_${n.id.slice(0, 4)}`);
    const outputNames = outputNodes.map((n) => n.name || `Out_${n.id.slice(0, 4)}`);

    const numInputs = inputNodes.length;
    const totalCombinations = Math.min(Math.pow(2, numInputs), 4096); // Cap at 4096 combinations
    const rows: TruthTableRow[] = [];

    for (let c = 0; c < totalCombinations; c++) {
      // Create binary input vector
      const currentInputs: number[] = [];
      for (let i = numInputs - 1; i >= 0; i--) {
        const bit = (c >> i) & 1;
        currentInputs.push(bit);
      }

      // Prepare nodes with this input combination
      const testNodes = nodes.map((n) => {
        const inIdx = inputNodes.findIndex((inNode) => inNode.id === n.id);
        if (inIdx !== -1) {
          return { ...n, state: currentInputs[inIdx] };
        }
        return { ...n };
      });

      // Simulate circuit with this input combination
      const simResult = this.simulate(testNodes, wires, customDefs);
      const nodeMap = new Map<string, CircuitNode>();
      simResult.nodes.forEach((n) => nodeMap.set(n.id, n));

      // Extract outputs for the row
      const outputValues: Record<string, number> = {};
      outputNodes.forEach((outNode) => {
        const evalNode = nodeMap.get(outNode.id);
        let val = 0;
        if (evalNode) {
          if (evalNode.type === 'OUTPUT') {
            val = evalNode.inputs[0]?.value ?? 0;
          } else {
            val = evalNode.outputs[0]?.value ?? 0;
          }
        }
        const colKey = outNode.name || `Out_${outNode.id.slice(0, 4)}`;
        outputValues[colKey] = val;
      });

      rows.push({
        inputs: currentInputs,
        outputs: outputValues,
      });
    }

    return {
      id: 'table_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      title: tableName,
      createdAt: Date.now(),
      inputNames,
      outputNames,
      rows,
      nodeMapping: {
        inputs: inputNodes.map((n) => ({ id: n.id, name: n.name })),
        outputs: outputNodes.map((n) => ({ id: n.id, name: n.name })),
      },
    };
  }
}
