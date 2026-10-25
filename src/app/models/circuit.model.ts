export type GateType =
  | 'INPUT'
  | 'OUTPUT'
  | 'TRANSISTOR'
  | 'AND'
  | 'OR'
  | 'XOR'
  | 'XAND' // XNOR logic
  | 'NOR'
  | 'NOT'
  | 'NAND'
  | 'CUSTOM';

export interface Pin {
  id: string;
  name: string;
  type: 'input' | 'output';
  value: number; // 0 or 1
}

export interface CircuitNode {
  id: string;
  type: GateType;
  name: string;
  x: number;
  y: number;
  inputs: Pin[];
  outputs: Pin[];
  showInTruthTable: boolean; // Tick marker to choose whether to include in the generated table
  state?: number; // 0 or 1 for INPUT toggle node, or live cached output
  customComponentId?: string; // Reference to custom IC definition if type === 'CUSTOM'
}

export interface Wire {
  id: string;
  fromNodeId: string;
  fromPinId: string;
  toNodeId: string;
  toPinId: string;
  value: number; // Current signal (0 or 1)
}

export interface CustomComponentDef {
  id: string;
  name: string;
  description?: string;
  inputs: { id: string; name: string }[];
  outputs: { id: string; name: string }[];
  // If created via Truth Table editor:
  truthTable?: {
    inputs: number[]; // row values matching order of inputs
    outputs: Record<string, number>; // outputName -> 0 or 1
  }[];
  // If created via circuit packaging:
  subCircuit?: {
    nodes: CircuitNode[];
    wires: Wire[];
  };
  color?: string;
}

export interface TruthTableRow {
  inputs: number[];
  outputs: Record<string, number>;
}

export interface TruthTable {
  id: string;
  title: string;
  createdAt: number;
  inputNames: string[];
  outputNames: string[];
  rows: TruthTableRow[];
  nodeMapping?: {
    inputs: { id: string; name: string }[];
    outputs: { id: string; name: string }[];
  };
}

export interface CircuitProject {
  version: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  nodes: CircuitNode[];
  wires: Wire[];
  customComponents: CustomComponentDef[];
  savedTables: TruthTable[];
}
