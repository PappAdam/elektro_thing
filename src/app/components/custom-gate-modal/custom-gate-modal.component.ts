import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CircuitStateService } from '../../services/circuit-state.service';
import { CustomComponentDef } from '../../models/circuit.model';

interface TableRowEdit {
  inputs: number[];
  outputs: Record<string, number>;
}

@Component({
  selector: 'app-custom-gate-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="onBackdropClick($event)">
      <div class="modal-dialog custom-gate-dialog">
        <!-- Header -->
        <div class="modal-header">
          <div class="header-left">
            <div class="icon-chip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
            </div>
            <div>
              <h2 class="modal-title">Create Custom Element from Truth Table</h2>
              <span class="modal-subtitle">Define named inputs, outputs, and toggle truth table cells to build custom IC logic</span>
            </div>
          </div>
          <button class="btn-icon close-btn" (click)="close.emit()">✕</button>
        </div>

        <!-- Scrollable Content Body -->
        <div class="modal-content">
          <!-- Metadata: Name & Description -->
          <div class="form-row meta-row">
            <div class="form-field flex-2">
              <label class="field-label">Element Name <span class="req">*</span></label>
              <input
                type="text"
                class="text-input"
                [(ngModel)]="componentName"
                placeholder="e.g. Majority Gate, Full Adder, Decoder..."
              />
            </div>
            <div class="form-field flex-3">
              <label class="field-label">Description (Optional)</label>
              <input
                type="text"
                class="text-input"
                [(ngModel)]="description"
                placeholder="Brief description of behavior..."
              />
            </div>
          </div>

          <!-- Configuration Grid: Inputs & Outputs -->
          <div class="io-config-grid">
            <!-- Inputs Config -->
            <div class="config-box">
              <div class="config-box-header">
                <span class="config-title">Inputs ({{ inputNames.length }})</span>
                <button class="btn btn-secondary btn-sm" (click)="addInput()" [disabled]="inputNames.length >= 6">
                  + Add Input
                </button>
              </div>
              <div class="pins-list">
                <div *ngFor="let name of inputNames; let idx = index; trackBy: trackByIndex" class="pin-item">
                  <span class="pin-idx">IN {{ idx + 1 }}</span>
                  <input
                    type="text"
                    class="pin-edit-input"
                    [ngModel]="inputNames[idx]"
                    (ngModelChange)="onRenameInput(idx, $event)"
                    placeholder="Input Name"
                  />
                  <button
                    class="pin-remove-btn"
                    (click)="removeInput(idx)"
                    [disabled]="inputNames.length <= 1"
                    title="Remove input"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            <!-- Outputs Config -->
            <div class="config-box">
              <div class="config-box-header">
                <span class="config-title">Outputs ({{ outputNames.length }})</span>
                <button class="btn btn-secondary btn-sm" (click)="addOutput()" [disabled]="outputNames.length >= 6">
                  + Add Output
                </button>
              </div>
              <div class="pins-list">
                <div *ngFor="let name of outputNames; let idx = index; trackBy: trackByIndex" class="pin-item">
                  <span class="pin-idx out-idx">OUT {{ idx + 1 }}</span>
                  <input
                    type="text"
                    class="pin-edit-input"
                    [ngModel]="outputNames[idx]"
                    (ngModelChange)="onRenameOutput(idx, $event)"
                    placeholder="Output Name"
                  />
                  <button
                    class="pin-remove-btn"
                    (click)="removeOutput(idx)"
                    [disabled]="outputNames.length <= 1"
                    title="Remove output"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Interactive Truth Table Editor -->
          <div class="truth-table-builder-section">
            <div class="table-tools-header">
              <div class="tools-left">
                <span class="section-heading">Truth Table Definition ({{ rows.length }} states)</span>
                <span class="hint-text">Click any output cell to flip its bit value (0 ↔ 1)</span>
              </div>
              <div class="tools-right">
                <button class="btn btn-secondary btn-xs" (click)="setAllOutputs(0)">All 0</button>
                <button class="btn btn-secondary btn-xs" (click)="setAllOutputs(1)">All 1</button>
                <button class="btn btn-secondary btn-xs" (click)="invertAllOutputs()">Invert</button>
              </div>
            </div>

            <div class="builder-table-wrap">
              <table class="builder-table">
                <thead>
                  <tr>
                    <th class="th-num">#</th>
                    <!-- Inputs -->
                    <th *ngFor="let inName of inputNames" class="th-in">
                      <span class="th-badge-in">IN</span>
                      <span>{{ inName }}</span>
                    </th>

                    <th class="th-sep">➔</th>

                    <!-- Outputs -->
                    <th *ngFor="let outName of outputNames" class="th-out">
                      <span class="th-badge-out">OUT</span>
                      <span>{{ outName }}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let row of rows; let rowIdx = index">
                    <td class="td-num">{{ rowIdx }}</td>

                    <!-- Readonly Binary Input Combination -->
                    <td *ngFor="let bit of row.inputs" class="td-in-val">
                      <span class="fixed-bit" [class.bit-on]="bit === 1">{{ bit }}</span>
                    </td>

                    <td class="td-sep"></td>

                    <!-- Interactive Editable Output Cell -->
                    <td *ngFor="let outName of outputNames" class="td-out-cell">
                      <button
                        type="button"
                        class="toggle-bit-btn"
                        [class.bit-active]="row.outputs[outName] === 1"
                        (click)="toggleOutputBit(rowIdx, outName)"
                        title="Click to toggle (current: {{ row.outputs[outName] ?? 0 }})"
                      >
                        {{ row.outputs[outName] ?? 0 }}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <div class="footer-hint">
            The new component will immediately be available in the sidebar palette.
          </div>
          <div class="footer-actions">
            <button class="btn btn-secondary" (click)="close.emit()">Cancel</button>
            <button class="btn btn-accent" (click)="onSaveComponent()" [disabled]="!componentName.trim()">
              Create & Save Element
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .custom-gate-dialog {
      width: 780px;
      max-height: 90vh;
    }

    .modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-subtle);
      background: var(--bg-panel);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .icon-chip {
      width: 38px;
      height: 38px;
      border-radius: var(--radius-sm);
      background: rgba(168, 85, 247, 0.15);
      border: 1px solid rgba(168, 85, 247, 0.35);
      color: #c084fc;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .icon-chip svg {
      width: 20px;
      height: 20px;
    }

    .modal-title {
      font-size: 16px;
      font-weight: 700;
      color: #fff;
    }

    .modal-subtitle {
      font-size: 12px;
      color: var(--text-muted);
    }

    .close-btn {
      font-size: 18px;
      color: var(--text-muted);
    }

    .modal-content {
      padding: 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
      background: var(--bg-app);
    }

    .meta-row {
      display: flex;
      gap: 16px;
    }

    .flex-2 { flex: 2; }
    .flex-3 { flex: 3; }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .field-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .req {
      color: var(--accent-rose);
    }

    .text-input {
      padding: 8px 12px;
      border-radius: var(--radius-sm);
    }

    .io-config-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .config-box {
      background: var(--bg-panel);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .config-box-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .config-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
    }

    .btn-sm {
      padding: 4px 8px;
      font-size: 11px;
    }

    .btn-xs {
      padding: 3px 6px;
      font-size: 10px;
    }

    .pins-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 140px;
      overflow-y: auto;
    }

    .pin-item {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      padding: 4px 8px;
      border-radius: var(--radius-sm);
    }

    .pin-idx {
      font-size: 10px;
      font-family: var(--font-mono);
      font-weight: 700;
      color: var(--accent-cyan);
      min-width: 34px;
    }

    .out-idx {
      color: #34d399;
    }

    .pin-edit-input {
      flex: 1;
      padding: 3px 6px;
      font-size: 12px;
      font-weight: 600;
    }

    .pin-remove-btn {
      color: var(--text-muted);
      font-size: 16px;
      line-height: 1;
      padding: 0 4px;
    }

    .pin-remove-btn:hover:not(:disabled) {
      color: var(--accent-rose);
    }

    .pin-remove-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    /* Truth Table Builder Section */
    .truth-table-builder-section {
      background: var(--bg-panel);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      overflow: hidden;
    }

    .table-tools-header {
      padding: 10px 14px;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: rgba(14, 20, 34, 0.7);
    }

    .section-heading {
      font-size: 13px;
      font-weight: 700;
      color: #fff;
      display: block;
    }

    .hint-text {
      font-size: 11px;
      color: var(--text-muted);
    }

    .tools-right {
      display: flex;
      gap: 6px;
    }

    .builder-table-wrap {
      max-height: 260px;
      overflow-y: auto;
    }

    .builder-table {
      width: 100%;
      border-collapse: collapse;
      text-align: center;
      font-family: var(--font-mono);
      font-size: 13px;
    }

    .builder-table thead {
      position: sticky;
      top: 0;
      background: var(--bg-card);
      z-index: 5;
    }

    .builder-table th {
      padding: 8px 10px;
      border-bottom: 1px solid var(--border-subtle);
      font-weight: 600;
    }

    .th-num {
      width: 36px;
      color: var(--text-muted);
      font-size: 11px;
    }

    .th-in {
      color: var(--accent-cyan);
    }

    .th-out {
      color: #34d399;
    }

    .th-badge-in, .th-badge-out {
      display: block;
      font-size: 8px;
      font-weight: 700;
      opacity: 0.8;
    }

    .th-sep {
      width: 24px;
      color: var(--text-muted);
      font-size: 11px;
    }

    .builder-table td {
      padding: 6px 10px;
      border-bottom: 1px solid rgba(30, 42, 68, 0.4);
    }

    .td-num {
      color: var(--text-muted);
      font-size: 11px;
    }

    .fixed-bit {
      display: inline-block;
      width: 26px;
      height: 26px;
      line-height: 26px;
      font-weight: 700;
      color: var(--text-muted);
    }

    .fixed-bit.bit-on {
      color: var(--accent-cyan);
    }

    .td-sep {
      border-left: 1px dashed var(--border-subtle);
      border-right: 1px dashed var(--border-subtle);
      background: rgba(0, 0, 0, 0.2);
    }

    .toggle-bit-btn {
      width: 32px;
      height: 30px;
      border-radius: 4px;
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      color: var(--text-muted);
      font-family: var(--font-mono);
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .toggle-bit-btn:hover {
      border-color: #34d399;
      transform: scale(1.08);
    }

    .toggle-bit-btn.bit-active {
      background: rgba(16, 185, 129, 0.2);
      border-color: #10b981;
      color: #34d399;
      box-shadow: 0 0 10px rgba(16, 185, 129, 0.45);
    }

    .modal-footer {
      padding: 14px 20px;
      border-top: 1px solid var(--border-subtle);
      background: var(--bg-panel);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .footer-hint {
      font-size: 12px;
      color: var(--text-muted);
    }

    .footer-actions {
      display: flex;
      gap: 10px;
    }
  `],
})
export class CustomGateModalComponent {
  readonly circuitState = inject(CircuitStateService);

  @Output() close = new EventEmitter<void>();

  componentName = '';
  description = '';

  inputNames: string[] = ['A', 'B'];
  outputNames: string[] = ['Out'];
  rows: TableRowEdit[] = [];

  constructor() {
    this.rebuildTableRows();
  }

  trackByIndex(index: number): number {
    return index;
  }

  rebuildTableRows(): void {
    const numInputs = this.inputNames.length;
    const totalCombinations = Math.pow(2, numInputs);
    const newRows: TableRowEdit[] = [];

    for (let c = 0; c < totalCombinations; c++) {
      const inputs: number[] = [];
      for (let i = numInputs - 1; i >= 0; i--) {
        inputs.push((c >> i) & 1);
      }

      // Preserve existing output values if possible
      const outputs: Record<string, number> = {};
      const prevRow = this.rows[c];

      this.outputNames.forEach((outName) => {
        outputs[outName] = prevRow?.outputs[outName] ?? 0;
      });

      newRows.push({ inputs, outputs });
    }

    this.rows = newRows;
  }

  addInput(): void {
    if (this.inputNames.length >= 6) return;
    const nextLetter = String.fromCharCode(65 + this.inputNames.length);
    this.inputNames.push(nextLetter);
    this.rebuildTableRows();
  }

  removeInput(idx: number): void {
    if (this.inputNames.length <= 1) return;
    this.inputNames.splice(idx, 1);
    this.rebuildTableRows();
  }

  onRenameInput(idx: number, newName: string): void {
    this.inputNames[idx] = newName.trim() || `In${idx + 1}`;
  }

  addOutput(): void {
    if (this.outputNames.length >= 6) return;
    const defaultName = `Out${this.outputNames.length + 1}`;
    this.outputNames.push(defaultName);
    this.rows.forEach((r) => (r.outputs[defaultName] = 0));
  }

  removeOutput(idx: number): void {
    if (this.outputNames.length <= 1) return;
    const removedName = this.outputNames[idx];
    this.outputNames.splice(idx, 1);
    this.rows.forEach((r) => delete r.outputs[removedName]);
  }

  onRenameOutput(idx: number, newName: string): void {
    const oldName = this.outputNames[idx];
    const cleanName = newName.trim() || `Out${idx + 1}`;
    this.outputNames[idx] = cleanName;
    if (oldName !== cleanName) {
      this.rows.forEach((r) => {
        const val = r.outputs[oldName] ?? 0;
        delete r.outputs[oldName];
        r.outputs[cleanName] = val;
      });
    }
  }

  toggleOutputBit(rowIdx: number, outName: string): void {
    const current = this.rows[rowIdx].outputs[outName] ?? 0;
    this.rows[rowIdx].outputs[outName] = current === 1 ? 0 : 1;
  }

  setAllOutputs(val: number): void {
    this.rows.forEach((r) => {
      this.outputNames.forEach((o) => (r.outputs[o] = val));
    });
  }

  invertAllOutputs(): void {
    this.rows.forEach((r) => {
      this.outputNames.forEach((o) => {
        r.outputs[o] = r.outputs[o] === 1 ? 0 : 1;
      });
    });
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.close.emit();
    }
  }

  onSaveComponent(): void {
    const name = this.componentName.trim();
    if (!name) return;

    const compId = 'custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);

    const inputsDef = this.inputNames.map((n, i) => ({
      id: `p_in_${i + 1}`,
      name: n,
    }));

    const outputsDef = this.outputNames.map((n, i) => ({
      id: `p_out_${i + 1}`,
      name: n,
    }));

    // Convert rows to map with pin IDs
    const truthTable = this.rows.map((row) => {
      const outMap: Record<string, number> = {};
      outputsDef.forEach((outDef) => {
        outMap[outDef.id] = row.outputs[outDef.name] ?? 0;
      });
      return {
        inputs: row.inputs,
        outputs: outMap,
      };
    });

    const newDef: CustomComponentDef = {
      id: compId,
      name,
      description: this.description.trim() || 'Custom Truth Table Element',
      inputs: inputsDef,
      outputs: outputsDef,
      truthTable,
      color: '#a855f7',
    };

    this.circuitState.addCustomComponent(newDef);
    this.close.emit();
  }
}
