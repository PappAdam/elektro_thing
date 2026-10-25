import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TruthTable } from '../../models/circuit.model';
import { TruthTableStorageService } from '../../services/truth-table-storage.service';
import { KMapService } from '../../services/kmap.service';
import { KMapData, KMapSubTable } from '../../models/kmap.model';

@Component({
  selector: 'app-truth-table-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="onBackdropClick($event)">
      <div class="modal-dialog table-modal-dialog">
        <!-- Modal Header -->
        <div class="modal-header">
          <div class="header-left">
            <div class="table-icon-badge" [class.kmap-badge]="activeTab === 'kmap'">
              <svg *ngIf="activeTab === 'truthTable'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
              <svg *ngIf="activeTab === 'kmap'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 12h18M12 3v18M3 7.5h18M3 16.5h18M7.5 3v18M16.5 3v18" />
              </svg>
            </div>
            <div>
              <div class="title-row">
                <h2 class="modal-title">{{ table.title }}</h2>
                <div class="view-toggle-pills">
                  <button
                    type="button"
                    class="toggle-pill"
                    [class.active]="activeTab === 'truthTable'"
                    (click)="activeTab = 'truthTable'"
                  >
                    📊 Truth Table
                  </button>
                  <button
                    type="button"
                    class="toggle-pill"
                    [class.active]="activeTab === 'kmap'"
                    (click)="activeTab = 'kmap'"
                  >
                    🗺️ Karnaugh Maps
                  </button>
                </div>
              </div>
              <span class="modal-subtitle">
                Generated at {{ table.createdAt | date:'mediumTime' }} • {{ table.rows.length }} total combinations evaluated
              </span>
            </div>
          </div>

          <div class="header-actions">
            <!-- Export CSV (Truth Table) -->
            <button
              *ngIf="activeTab === 'truthTable'"
              class="btn btn-secondary"
              (click)="storageService.downloadCsv(table)"
              title="Export as CSV spreadsheet"
            >
              <svg viewBox="0 0 24 24" class="btn-svg" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Export CSV</span>
            </button>

            <!-- Export JSON -->
            <button
              class="btn btn-secondary"
              (click)="storageService.downloadJson(table)"
              title="Export as JSON data"
            >
              <svg viewBox="0 0 24 24" class="btn-svg" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span>Export JSON</span>
            </button>

            <!-- Copy -->
            <button class="btn btn-secondary" (click)="copyCurrentViewText()" title="Copy table or K-map as text">
              <span>{{ copyStatus || (activeTab === 'truthTable' ? 'Copy Table' : 'Copy K-Map') }}</span>
            </button>

            <!-- Close Modal -->
            <button class="btn-icon close-btn" (click)="close.emit()" title="Close dialog">
              ✕
            </button>
          </div>
        </div>

        <!-- ========================================== -->
        <!-- VIEW 1: TRUTH TABLE                        -->
        <!-- ========================================== -->
        <ng-container *ngIf="activeTab === 'truthTable'">
          <!-- Filter & Metrics Bar -->
          <div class="filter-bar">
            <div class="metrics-chips">
              <span class="chip chip-input">
                Inputs ({{ table.inputNames.length }}): {{ table.inputNames.join(', ') || 'None' }}
              </span>
              <span class="chip chip-output">
                Outputs ({{ table.outputNames.length }}): {{ table.outputNames.join(', ') || 'None' }}
              </span>
            </div>

            <div class="search-wrap" *ngIf="table.rows.length > 8">
              <input
                type="text"
                class="row-filter-input"
                placeholder="Filter values (e.g. 1 0 1)..."
                [(ngModel)]="filterQuery"
              />
            </div>
          </div>

          <!-- Table Viewport -->
          <div class="table-container">
            <table class="truth-table">
              <thead>
                <tr>
                  <th class="th-index">#</th>
                  <!-- Input Columns -->
                  <th
                    *ngFor="let name of table.inputNames"
                    class="th-input"
                    title="Input: {{ name }}"
                  >
                    <span class="col-type-tag">IN</span>
                    <span class="col-name">{{ name }}</span>
                  </th>

                  <!-- Divider Column -->
                  <th class="th-separator" title="Logic Evaluation">➔</th>

                  <!-- Output Columns -->
                  <th
                    *ngFor="let name of table.outputNames"
                    class="th-output"
                    title="Output: {{ name }}"
                  >
                    <span class="col-type-tag tag-out">OUT</span>
                    <span class="col-name">{{ name }}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of filteredRows; let idx = index" class="table-row">
                  <td class="td-index">{{ idx }}</td>

                  <!-- Inputs -->
                  <td
                    *ngFor="let val of row.inputs"
                    class="td-bit td-in-bit"
                    [class.cell-high]="val === 1"
                  >
                    <span class="bit-badge">{{ val }}</span>
                  </td>

                  <td class="td-separator"></td>

                  <!-- Outputs -->
                  <td
                    *ngFor="let outName of table.outputNames"
                    class="td-bit td-out-bit"
                    [class.cell-high]="row.outputs[outName] === 1"
                  >
                    <span class="bit-badge">{{ row.outputs[outName] ?? 0 }}</span>
                  </td>
                </tr>
              </tbody>
            </table>

            <div *ngIf="table.rows.length === 0" class="empty-table-state">
              <p>No marked input or output nodes were found in the circuit.</p>
              <p class="empty-hint">Tick the "Table" marker on your input and output nodes to generate truth tables.</p>
            </div>
          </div>
        </ng-container>

        <!-- ========================================== -->
        <!-- VIEW 2: KARNAUGH MAPS (K-MAPS)             -->
        <!-- ========================================== -->
        <ng-container *ngIf="activeTab === 'kmap'">
          <!-- K-Map Output Selector & Splitting Controls -->
          <div class="kmap-toolbar">
            <div class="kmap-output-select-wrap">
              <span class="kmap-label">Select Output Function:</span>
              <div class="output-chips">
                <button
                  *ngFor="let outName of table.outputNames"
                  type="button"
                  class="out-chip-btn"
                  [class.active]="selectedOutputName === outName"
                  (click)="selectedOutputName = outName"
                >
                  {{ outName }}
                </button>
              </div>
            </div>

            <!-- Multidimensional Sub-Table Selector (when > 4 variables) -->
            <div *ngIf="kMapData.subTables.length > 1" class="kmap-subtable-filter">
              <span class="kmap-label">4-Variable Sub-K-Maps ({{ kMapData.subTables.length }}):</span>
              <select
                class="subtable-select"
                [ngModel]="selectedSubTableIndex"
                (ngModelChange)="selectedSubTableIndex = +$event"
              >
                <option [value]="-1">View All Sub-Tables (Grid)</option>
                <option *ngFor="let st of kMapData.subTables; let i = index" [value]="i">
                  Sub-Map {{ i + 1 }}: [{{ st.higherVarsCondition }}]
                </option>
              </select>
            </div>
          </div>

          <!-- K-Map Summary Expressions Banner -->
          <div class="kmap-equations-bar">
            <div class="eq-group">
              <span class="eq-tag">Minterms (SOP):</span>
              <code class="eq-code">
                f({{ table.inputNames.join(', ') }}) = Σm({{ kMapData.minterms.join(', ') || '∅' }})
              </code>
            </div>
            <div class="eq-group">
              <span class="eq-tag tag-pos">Maxterms (POS):</span>
              <code class="eq-code">
                ΠM({{ kMapData.maxterms.join(', ') || '∅' }})
              </code>
            </div>
          </div>

          <!-- K-Maps Scrollable Viewport -->
          <div class="kmap-viewport">
            <div *ngIf="table.inputNames.length === 0" class="empty-table-state">
              <p>At least 1 input variable is required to plot a Karnaugh map.</p>
            </div>

            <div class="kmaps-grid-container">
              <div
                *ngFor="let st of displayedSubTables"
                class="kmap-card"
              >
                <!-- Sub-Table Header -->
                <div class="kmap-card-header">
                  <div class="kmap-card-title">
                    <span class="card-title-main">{{ st.title }}</span>
                    <span *ngIf="st.higherVarsCondition" class="card-condition-badge">
                      Condition: {{ st.higherVarsCondition }}
                    </span>
                  </div>
                  <span class="kmap-dim-badge">
                    {{ st.rowVarNames.join('') }} (rows) × {{ st.colVarNames.join('') || '-' }} (cols)
                  </span>
                </div>

                <!-- 4-Variable (or smaller) Karnaugh Grid -->
                <div class="kmap-grid-wrap">
                  <table class="kmap-table">
                    <thead>
                      <tr>
                        <!-- Top-Left Corner: RowVars \ ColVars -->
                        <th class="kmap-th-corner">
                          <div class="corner-split">
                            <span class="corner-col-vars">{{ st.colVarNames.join('') || '1' }}</span>
                            <span class="corner-slash">/</span>
                            <span class="corner-row-vars">{{ st.rowVarNames.join('') }}</span>
                          </div>
                        </th>

                        <!-- Column Headers (Gray Code) -->
                        <th
                          *ngFor="let cHead of st.colHeaders"
                          class="kmap-th-col"
                          title="Columns: {{ st.colVarNames.join('') }} = {{ cHead }}"
                        >
                          <span class="kmap-head-val">{{ cHead }}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let rowCells of st.grid; let rIdx = index">
                        <!-- Row Header (Gray Code) -->
                        <th
                          class="kmap-th-row"
                          title="Rows: {{ st.rowVarNames.join('') }} = {{ st.rowHeaders[rIdx] }}"
                        >
                          <span class="kmap-head-val">{{ st.rowHeaders[rIdx] }}</span>
                        </th>

                        <!-- Cell Values (0 or 1 with Minterm subscript) -->
                        <td
                          *ngFor="let cell of rowCells"
                          class="kmap-cell"
                          [class.kmap-cell-1]="cell.value === 1"
                          [class.kmap-cell-0]="cell.value === 0"
                          title="m{{ cell.minterm }} ({{ cell.inputVector.join('') }}) = {{ cell.value }}"
                        >
                          <span class="minterm-index">m{{ cell.minterm }}</span>
                          <span class="cell-val">{{ cell.value }}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </ng-container>

        <!-- Modal Footer -->
        <div class="modal-footer">
          <span class="storage-notice">
            <svg viewBox="0 0 24 24" class="notice-svg" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <ng-container *ngIf="activeTab === 'truthTable'">
              Auto-saved to LocalStorage. You can view or re-export it anytime from Saved Tables.
            </ng-container>
            <ng-container *ngIf="activeTab === 'kmap'">
              <span *ngIf="table.inputNames.length > 4">
                Multidimensional K-map automatically split into {{ kMapData.subTables.length }} 4-variable sub-tables.
              </span>
              <span *ngIf="table.inputNames.length <= 4">
                Standard {{ table.inputNames.length }}-variable Karnaugh map with Gray code mapping.
              </span>
            </ng-container>
          </span>
          <button class="btn btn-primary" (click)="close.emit()">Done</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .table-modal-dialog {
      width: 880px;
      min-height: 520px;
      max-height: 90vh;
    }

    .modal-header {
      padding: 14px 20px;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      background: var(--bg-panel);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .table-icon-badge {
      width: 38px;
      height: 38px;
      border-radius: var(--radius-sm);
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.35);
      color: #34d399;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .kmap-badge {
      background: rgba(168, 85, 247, 0.15);
      border-color: rgba(168, 85, 247, 0.35);
      color: #c084fc;
    }

    .table-icon-badge svg {
      width: 20px;
      height: 20px;
    }

    .title-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .modal-title {
      font-size: 16px;
      font-weight: 700;
      color: #fff;
    }

    .view-toggle-pills {
      display: flex;
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 2px;
      gap: 2px;
    }

    .toggle-pill {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 4px;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .toggle-pill:hover {
      color: #fff;
    }

    .toggle-pill.active {
      background: rgba(0, 240, 255, 0.15);
      color: var(--accent-cyan);
      box-shadow: 0 0 6px rgba(0, 240, 255, 0.3);
    }

    .modal-subtitle {
      font-size: 12px;
      color: var(--text-muted);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-svg {
      width: 14px;
      height: 14px;
    }

    .close-btn {
      font-size: 18px;
      color: var(--text-muted);
    }

    /* Filter & Metrics Bar */
    .filter-bar {
      padding: 10px 20px;
      background: var(--bg-sidebar);
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .metrics-chips {
      display: flex;
      gap: 8px;
    }

    .chip {
      font-size: 11px;
      font-family: var(--font-mono);
      padding: 3px 8px;
      border-radius: var(--radius-sm);
    }

    .chip-input {
      background: rgba(0, 240, 255, 0.1);
      border: 1px solid rgba(0, 240, 255, 0.25);
      color: var(--accent-cyan);
    }

    .chip-output {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.25);
      color: #34d399;
    }

    .row-filter-input {
      font-size: 12px;
      padding: 4px 10px;
      width: 200px;
    }

    .table-container {
      flex: 1;
      overflow-y: auto;
      max-height: 55vh;
      background: var(--bg-app);
    }

    .truth-table {
      width: 100%;
      border-collapse: collapse;
      font-family: var(--font-mono);
      font-size: 13px;
      text-align: center;
    }

    .truth-table thead {
      position: sticky;
      top: 0;
      background: var(--bg-panel);
      z-index: 10;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .truth-table th {
      padding: 10px 14px;
      border-bottom: 2px solid var(--border-subtle);
      font-weight: 600;
    }

    .th-index {
      width: 48px;
      color: var(--text-muted);
      font-size: 11px;
    }

    .th-input {
      color: var(--accent-cyan);
    }

    .th-output {
      color: #34d399;
    }

    .col-type-tag {
      display: block;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.05em;
      opacity: 0.8;
    }

    .tag-out {
      color: #34d399;
    }

    .col-name {
      font-size: 13px;
    }

    .th-separator {
      width: 32px;
      color: var(--text-muted);
      font-size: 12px;
    }

    .table-row {
      border-bottom: 1px solid rgba(30, 42, 68, 0.4);
      transition: background 0.1s ease;
    }

    .table-row:hover {
      background: rgba(255, 255, 255, 0.03);
    }

    .td-index {
      color: var(--text-muted);
      font-size: 11px;
    }

    .td-bit {
      padding: 8px 12px;
    }

    .bit-badge {
      display: inline-block;
      width: 24px;
      height: 24px;
      line-height: 24px;
      border-radius: 4px;
      font-weight: 700;
    }

    .cell-high .bit-badge {
      background: rgba(0, 240, 255, 0.2);
      color: var(--accent-cyan);
      box-shadow: 0 0 8px rgba(0, 240, 255, 0.4);
    }

    .td-out-bit.cell-high .bit-badge {
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
    }

    .td-separator {
      border-left: 1px dashed var(--border-subtle);
      border-right: 1px dashed var(--border-subtle);
      background: rgba(0, 0, 0, 0.15);
    }

    /* ========================================== */
    /* KARNAUGH MAPS STYLES                       */
    /* ========================================== */

    .kmap-toolbar {
      padding: 10px 20px;
      background: var(--bg-sidebar);
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .kmap-output-select-wrap, .kmap-subtable-filter {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .kmap-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .output-chips {
      display: flex;
      gap: 4px;
    }

    .out-chip-btn {
      font-size: 12px;
      font-weight: 600;
      font-family: var(--font-mono);
      padding: 4px 10px;
      border-radius: var(--radius-sm);
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .out-chip-btn:hover {
      border-color: var(--border-medium);
      color: #fff;
    }

    .out-chip-btn.active {
      background: rgba(16, 185, 129, 0.15);
      border-color: #10b981;
      color: #34d399;
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.35);
    }

    .subtable-select {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      color: #fff;
      font-size: 12px;
      padding: 4px 8px;
      border-radius: var(--radius-sm);
    }

    .kmap-equations-bar {
      padding: 8px 20px;
      background: rgba(14, 20, 34, 0.6);
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
    }

    .eq-group {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
    }

    .eq-tag {
      font-weight: 700;
      color: var(--accent-cyan);
    }

    .tag-pos {
      color: #c084fc;
    }

    .eq-code {
      font-family: var(--font-mono);
      background: rgba(0, 0, 0, 0.3);
      padding: 2px 6px;
      border-radius: 4px;
      color: #f1f5f9;
    }

    .kmap-viewport {
      flex: 1;
      overflow-y: auto;
      max-height: 55vh;
      padding: 20px;
      background: var(--bg-app);
    }

    .kmaps-grid-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .kmap-card {
      background: var(--bg-panel);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 16px;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: fit-content;
      min-width: 380px;
      margin: 0 auto;
    }

    .kmap-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding-bottom: 8px;
    }

    .kmap-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .card-title-main {
      font-size: 13px;
      font-weight: 700;
      color: #fff;
    }

    .card-condition-badge {
      font-size: 11px;
      font-family: var(--font-mono);
      font-weight: 700;
      color: var(--accent-amber);
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.3);
      padding: 1px 6px;
      border-radius: 4px;
    }

    .kmap-dim-badge {
      font-size: 10px;
      font-family: var(--font-mono);
      color: var(--text-muted);
    }

    .kmap-grid-wrap {
      display: flex;
      justify-content: center;
    }

    .kmap-table {
      border-collapse: collapse;
      font-family: var(--font-mono);
    }

    .kmap-th-corner {
      background: var(--bg-card);
      border: 1px solid var(--border-medium);
      padding: 6px 10px;
      width: 70px;
      height: 44px;
      position: relative;
    }

    .corner-split {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      font-weight: 700;
    }

    .corner-col-vars {
      color: var(--accent-cyan);
    }

    .corner-slash {
      color: var(--text-muted);
      opacity: 0.6;
    }

    .corner-row-vars {
      color: #c084fc;
    }

    .kmap-th-col {
      background: var(--bg-card);
      border: 1px solid var(--border-medium);
      padding: 6px 12px;
      min-width: 62px;
      text-align: center;
      color: var(--accent-cyan);
      font-size: 13px;
      font-weight: 700;
    }

    .kmap-th-row {
      background: var(--bg-card);
      border: 1px solid var(--border-medium);
      padding: 6px 10px;
      text-align: center;
      color: #c084fc;
      font-size: 13px;
      font-weight: 700;
    }

    .kmap-cell {
      border: 1px solid var(--border-medium);
      width: 62px;
      height: 56px;
      text-align: center;
      vertical-align: middle;
      position: relative;
      cursor: default;
      transition: all 0.15s ease;
    }

    .kmap-cell:hover {
      transform: scale(1.05);
      z-index: 5;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.6);
    }

    .minterm-index {
      position: absolute;
      top: 2px;
      left: 4px;
      font-size: 9px;
      color: var(--text-muted);
      font-weight: 500;
      opacity: 0.7;
    }

    .cell-val {
      font-size: 19px;
      font-weight: 800;
      display: block;
      margin-top: 6px;
    }

    .kmap-cell-1 {
      background: rgba(0, 240, 255, 0.12);
      border-color: rgba(0, 240, 255, 0.35);
    }

    .kmap-cell-1 .cell-val {
      color: var(--accent-cyan);
      text-shadow: 0 0 10px var(--signal-high-glow);
    }

    .kmap-cell-0 {
      background: rgba(15, 23, 42, 0.5);
    }

    .kmap-cell-0 .cell-val {
      color: #475569;
    }

    .modal-footer {
      padding: 14px 20px;
      border-top: 1px solid var(--border-subtle);
      background: var(--bg-panel);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .storage-notice {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--text-muted);
    }

    .notice-svg {
      width: 15px;
      height: 15px;
      color: #10b981;
    }

    .empty-table-state {
      padding: 40px;
      text-align: center;
      color: var(--text-secondary);
    }

    .empty-hint {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 6px;
    }
  `],
})
export class TruthTableModalComponent implements OnInit {
  @Input({ required: true }) table!: TruthTable;
  @Output() close = new EventEmitter<void>();

  readonly storageService = inject(TruthTableStorageService);
  readonly kMapService = inject(KMapService);

  activeTab: 'truthTable' | 'kmap' = 'truthTable';
  filterQuery = '';
  copyStatus = '';

  selectedOutputName = '';
  selectedSubTableIndex = -1; // -1 = show all sub-tables

  ngOnInit(): void {
    if (this.table.outputNames.length > 0) {
      this.selectedOutputName = this.table.outputNames[0];
    }
  }

  get filteredRows() {
    if (!this.filterQuery.trim()) return this.table.rows;
    const q = this.filterQuery.trim().replace(/\s+/g, '');
    return this.table.rows.filter((row) => {
      const combined = row.inputs.join('') + Object.values(row.outputs).join('');
      return combined.includes(q);
    });
  }

  get kMapData(): KMapData {
    const out = this.selectedOutputName || this.table.outputNames[0] || 'Out';
    return this.kMapService.generateKMap(this.table, out);
  }

  get displayedSubTables(): KMapSubTable[] {
    const all = this.kMapData.subTables;
    if (this.selectedSubTableIndex === -1 || this.selectedSubTableIndex >= all.length) {
      return all;
    }
    return [all[this.selectedSubTableIndex]];
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.close.emit();
    }
  }

  copyCurrentViewText(): void {
    if (this.activeTab === 'truthTable') {
      this.copyTableText();
    } else {
      this.copyKMapText();
    }
  }

  copyTableText(): void {
    const headers = [...this.table.inputNames, '|', ...this.table.outputNames];
    const sep = headers.map(() => '---').join(' | ');
    const rowLines = this.table.rows.map((row) => {
      const inVals = row.inputs.join(' | ');
      const outVals = this.table.outputNames.map((o) => row.outputs[o] ?? 0).join(' | ');
      return `${inVals} | | ${outVals}`;
    });

    const fullMarkdown = `| ${headers.join(' | ')} |\n| ${sep} |\n` + rowLines.map((l) => `| ${l} |`).join('\n');

    navigator.clipboard.writeText(fullMarkdown).then(() => {
      this.copyStatus = 'Copied!';
      setTimeout(() => (this.copyStatus = ''), 2000);
    });
  }

  copyKMapText(): void {
    const km = this.kMapData;
    let text = `Karnaugh Map for Output: ${km.outputName}\n`;
    text += `SOP: Σm(${km.minterms.join(', ') || '∅'})\n`;
    text += `POS: ΠM(${km.maxterms.join(', ') || '∅'})\n\n`;

    km.subTables.forEach((st) => {
      text += `=== ${st.title} ===\n`;
      text += `${st.rowVarNames.join('')}\\${st.colVarNames.join('')}\t` + st.colHeaders.join('\t') + '\n';
      st.grid.forEach((row, rIdx) => {
        text += st.rowHeaders[rIdx] + '\t';
        text += row.map((c) => c.value).join('\t') + '\n';
      });
      text += '\n';
    });

    navigator.clipboard.writeText(text).then(() => {
      this.copyStatus = 'Copied K-Map!';
      setTimeout(() => (this.copyStatus = ''), 2000);
    });
  }
}
