import { Injectable } from '@angular/core';
import { TruthTable } from '../models/circuit.model';
import { KMapCell, KMapData, KMapSubTable } from '../models/kmap.model';

@Injectable({
  providedIn: 'root',
})
export class KMapService {
  private readonly gray2 = ['00', '01', '11', '10'];
  private readonly gray1 = ['0', '1'];

  /**
   * Generate Karnaugh map data for a selected output from a TruthTable.
   * If there are > 4 variables, splits multidimensional space into 4-variable sub-tables.
   */
  generateKMap(table: TruthTable, outputName: string): KMapData {
    const numInputs = table.inputNames.length;
    const inputNames = [...table.inputNames];

    if (numInputs === 0) {
      return {
        outputName,
        numInputs: 0,
        inputNames: [],
        subTables: [],
        minterms: [],
        maxterms: [],
      };
    }

    // Build row lookup map: inputVector string -> row value
    const rowMap = new Map<string, number>();
    table.rows.forEach((row) => {
      const key = row.inputs.join(',');
      rowMap.set(key, row.outputs[outputName] ?? 0);
    });

    const allMinterms: number[] = [];
    const allMaxterms: number[] = [];

    // Helper to evaluate an input vector
    const evaluate = (vec: number[]): { value: number; minterm: number } => {
      const key = vec.join(',');
      const val = rowMap.get(key) ?? 0;
      const minterm = vec.reduce((acc, bit) => (acc << 1) | bit, 0);
      return { value: val, minterm };
    };

    let subTables: KMapSubTable[] = [];

    if (numInputs <= 4) {
      // Single K-map table (1, 2, 3, or 4 variables)
      const subTable = this.buildSubTable(
        'sub_0',
        `${outputName} Karnaugh Map (${numInputs} Variables)`,
        '',
        inputNames,
        [],
        evaluate
      );
      subTables = [subTable];
    } else {
      // More than 4 variables: split multidimensional K-map into 4-variable sub-tables!
      const higherVarNames = inputNames.slice(0, numInputs - 4);
      const lowerVarNames = inputNames.slice(numInputs - 4); // exactly 4 variables
      const numHigher = higherVarNames.length;
      const numCombinations = Math.pow(2, numHigher);

      for (let c = 0; c < numCombinations; c++) {
        const higherBits: number[] = [];
        for (let i = numHigher - 1; i >= 0; i--) {
          higherBits.push((c >> i) & 1);
        }

        const conditionStr = higherVarNames
          .map((name, idx) => `${name}=${higherBits[idx]}`)
          .join(', ');

        const title = `4-Variable Sub-K-Map [${conditionStr}]`;

        const subTable = this.buildSubTable(
          `sub_${c}`,
          title,
          conditionStr,
          lowerVarNames,
          higherBits,
          evaluate
        );
        subTables.push(subTable);
      }
    }

    // Collect all minterms and maxterms across the entire space
    subTables.forEach((st) => {
      st.grid.forEach((row) => {
        row.forEach((cell) => {
          if (cell.value === 1) {
            allMinterms.push(cell.minterm);
          } else {
            allMaxterms.push(cell.minterm);
          }
        });
      });
    });

    allMinterms.sort((a, b) => a - b);
    allMaxterms.sort((a, b) => a - b);

    return {
      outputName,
      numInputs,
      inputNames,
      subTables,
      minterms: allMinterms,
      maxterms: allMaxterms,
    };
  }

  private buildSubTable(
    id: string,
    title: string,
    higherVarsCondition: string,
    vars: string[], // 1 to 4 variables for this sub-table
    higherBits: number[],
    evaluator: (vec: number[]) => { value: number; minterm: number }
  ): KMapSubTable {
    let rowVarNames: string[] = [];
    let colVarNames: string[] = [];
    let rowHeaders: string[] = [];
    let colHeaders: string[] = [];

    switch (vars.length) {
      case 1:
        rowVarNames = [vars[0]];
        colVarNames = [];
        rowHeaders = this.gray1;
        colHeaders = ['-'];
        break;

      case 2:
        rowVarNames = [vars[0]];
        colVarNames = [vars[1]];
        rowHeaders = this.gray1;
        colHeaders = this.gray1;
        break;

      case 3:
        rowVarNames = [vars[0]];
        colVarNames = [vars[1], vars[2]];
        rowHeaders = this.gray1;
        colHeaders = this.gray2;
        break;

      case 4:
      default:
        rowVarNames = [vars[0], vars[1]];
        colVarNames = [vars[2], vars[3]];
        rowHeaders = this.gray2;
        colHeaders = this.gray2;
        break;
    }

    const grid: KMapCell[][] = [];

    for (const rHeader of rowHeaders) {
      const rowCells: KMapCell[] = [];
      const rBits = rHeader === '-' ? [] : rHeader.split('').map(Number);

      for (const cHeader of colHeaders) {
        const cBits = cHeader === '-' ? [] : cHeader.split('').map(Number);
        const fullVector = [...higherBits, ...rBits, ...cBits];
        const res = evaluator(fullVector);

        rowCells.push({
          rowLabel: rHeader,
          colLabel: cHeader,
          value: res.value,
          minterm: res.minterm,
          inputVector: fullVector,
        });
      }
      grid.push(rowCells);
    }

    return {
      id,
      title,
      higherVarsCondition,
      rowVarNames,
      colVarNames,
      rowHeaders,
      colHeaders,
      grid,
    };
  }
}
