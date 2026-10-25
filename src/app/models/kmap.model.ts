export interface KMapCell {
  rowLabel: string;
  colLabel: string;
  value: number; // 0 or 1
  minterm: number; // Decimal index (e.g. 0 to 15)
  inputVector: number[];
}

export interface KMapSubTable {
  id: string;
  title: string; // e.g. "Sub-Map 1 of 2: A=0"
  higherVarsCondition: string; // e.g. "A = 0" or "A = 0, B = 0"
  rowVarNames: string[]; // e.g. ["B", "C"]
  colVarNames: string[]; // e.g. ["D", "E"]
  rowHeaders: string[]; // Gray code: ["00", "01", "11", "10"]
  colHeaders: string[]; // Gray code: ["00", "01", "11", "10"]
  grid: KMapCell[][]; // [row][col]
}

export interface KMapData {
  outputName: string;
  numInputs: number;
  inputNames: string[];
  subTables: KMapSubTable[];
  minterms: number[]; // All minterms where output is 1
  maxterms: number[]; // All maxterms where output is 0
}
