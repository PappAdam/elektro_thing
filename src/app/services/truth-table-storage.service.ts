import { Injectable, signal } from '@angular/core';
import { TruthTable } from '../models/circuit.model';

const STORAGE_KEY = 'elektro_saved_truth_tables';

@Injectable({
  providedIn: 'root',
})
export class TruthTableStorageService {
  private readonly _tables = signal<TruthTable[]>([]);
  public readonly tables = this._tables.asReadonly();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load saved tables from localStorage.
   */
  loadFromStorage(): void {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          this._tables.set(parsed);
          return;
        }
      }
    } catch (e) {
      console.error('Failed to load truth tables from localStorage:', e);
    }
    this._tables.set([]);
  }

  /**
   * Save a generated truth table. Always persists immediately to localStorage.
   */
  saveTable(table: TruthTable): void {
    const current = this._tables();
    // Prepend new table, keeping history intact
    const updated = [table, ...current.filter((t) => t.id !== table.id)];
    this.persist(updated);
  }

  /**
   * Rename an existing table.
   */
  renameTable(id: string, newTitle: string): void {
    const updated = this._tables().map((t) => (t.id === id ? { ...t, title: newTitle } : t));
    this.persist(updated);
  }

  /**
   * Delete a table by ID.
   */
  deleteTable(id: string): void {
    const updated = this._tables().filter((t) => t.id !== id);
    this.persist(updated);
  }

  /**
   * Clear all saved tables.
   */
  clearAll(): void {
    this.persist([]);
  }

  private persist(tables: TruthTable[]): void {
    this._tables.set(tables);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tables));
    } catch (e) {
      console.error('Failed to save truth tables to localStorage:', e);
    }
  }

  /**
   * Format table to CSV string.
   */
  tableToCsv(table: TruthTable): string {
    const headers = [...table.inputNames, ...table.outputNames];
    const lines = [headers.join(',')];

    for (const row of table.rows) {
      const rowVals: (number | string)[] = [...row.inputs];
      for (const outName of table.outputNames) {
        rowVals.push(row.outputs[outName] ?? 0);
      }
      lines.push(rowVals.join(','));
    }

    return lines.join('\n');
  }

  /**
   * Download table as CSV file.
   */
  downloadCsv(table: TruthTable): void {
    const csvContent = this.tableToCsv(table);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const filename = `${this.sanitizeFilename(table.title)}.csv`;
    this.triggerDownload(blob, filename);
  }

  /**
   * Download table as JSON file.
   */
  downloadJson(table: TruthTable): void {
    const jsonContent = JSON.stringify(table, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const filename = `${this.sanitizeFilename(table.title)}.json`;
    this.triggerDownload(blob, filename);
  }

  private sanitizeFilename(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'truth_table';
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
