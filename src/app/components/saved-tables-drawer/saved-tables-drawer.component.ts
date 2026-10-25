import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TruthTableStorageService } from '../../services/truth-table-storage.service';
import { TruthTable } from '../../models/circuit.model';

@Component({
  selector: 'app-saved-tables-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="onBackdropClick($event)">
      <div class="modal-dialog saved-tables-dialog">
        <div class="modal-header">
          <div class="header-left">
            <div class="drawer-icon-chip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <div>
              <h2 class="modal-title">Saved Truth Tables</h2>
              <span class="modal-subtitle">
                {{ storageService.tables().length }} tables persistently stored in LocalStorage
              </span>
            </div>
          </div>

          <div class="header-right">
            <button
              *ngIf="storageService.tables().length > 0"
              class="btn btn-danger btn-sm"
              (click)="onClearAll()"
              title="Delete all saved tables from storage"
            >
              Clear All
            </button>
            <button class="btn-icon close-btn" (click)="close.emit()">✕</button>
          </div>
        </div>

        <div class="tables-list-viewport">
          <div *ngIf="storageService.tables().length === 0" class="empty-state">
            <div class="empty-icon">📂</div>
            <h3>No Saved Truth Tables Yet</h3>
            <p>Every time you click "Run & Generate Truth Table", the result is automatically saved here.</p>
          </div>

          <div class="tables-grid" *ngIf="storageService.tables().length > 0">
            <div
              *ngFor="let table of storageService.tables()"
              class="table-card"
            >
              <div class="card-top">
                <div class="card-title-row">
                  <input
                    type="text"
                    class="table-title-edit"
                    [ngModel]="table.title"
                    (ngModelChange)="storageService.renameTable(table.id, $event)"
                    title="Click to rename table"
                  />
                  <span class="date-tag">{{ table.createdAt | date:'short' }}</span>
                </div>

                <div class="card-meta">
                  <span class="meta-tag tag-in">
                    {{ table.inputNames.length }} Inputs: {{ table.inputNames.join(', ') }}
                  </span>
                  <span class="meta-tag tag-out">
                    {{ table.outputNames.length }} Outputs: {{ table.outputNames.join(', ') }}
                  </span>
                  <span class="meta-tag tag-rows">
                    {{ table.rows.length }} rows
                  </span>
                </div>
              </div>

              <!-- Mini preview of first 3 rows -->
              <div class="card-preview">
                <div class="preview-header">
                  <span class="prev-col prev-in">{{ table.inputNames.join(' ') }}</span>
                  <span class="prev-sep">➔</span>
                  <span class="prev-col prev-out">{{ table.outputNames.join(' ') }}</span>
                </div>
                <div *ngFor="let row of table.rows.slice(0, 3)" class="preview-row">
                  <span class="prev-in">{{ row.inputs.join(' ') }}</span>
                  <span class="prev-sep">➔</span>
                  <span class="prev-out">
                    <ng-container *ngFor="let outName of table.outputNames">
                      {{ row.outputs[outName] ?? 0 }}
                    </ng-container>
                  </span>
                </div>
                <span *ngIf="table.rows.length > 3" class="more-rows-hint">
                  + {{ table.rows.length - 3 }} more rows...
                </span>
              </div>

              <!-- Card Actions -->
              <div class="card-actions">
                <button
                  class="btn btn-primary btn-sm"
                  (click)="viewTable.emit(table)"
                  title="View full truth table"
                >
                  View Full Table
                </button>

                <button
                  class="btn btn-secondary btn-sm"
                  (click)="storageService.downloadCsv(table)"
                  title="Export to CSV"
                >
                  CSV
                </button>

                <button
                  class="btn btn-secondary btn-sm"
                  (click)="storageService.downloadJson(table)"
                  title="Export to JSON"
                >
                  JSON
                </button>

                <button
                  class="btn btn-danger btn-sm"
                  (click)="storageService.deleteTable(table.id)"
                  title="Delete this table"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <span class="footer-note">All tables are preserved across browser refreshes and sessions.</span>
          <button class="btn btn-secondary" (click)="close.emit()">Close</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .saved-tables-dialog {
      width: 780px;
      max-height: 85vh;
    }

    .modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-subtle);
      background: var(--bg-panel);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .header-left, .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .drawer-icon-chip {
      width: 38px;
      height: 38px;
      border-radius: var(--radius-sm);
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.35);
      color: #60a5fa;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .drawer-icon-chip svg {
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

    .tables-list-viewport {
      padding: 20px;
      overflow-y: auto;
      max-height: 60vh;
      background: var(--bg-app);
    }

    .empty-state {
      padding: 50px 20px;
      text-align: center;
      color: var(--text-muted);
    }

    .empty-icon {
      font-size: 36px;
      margin-bottom: 10px;
    }

    .empty-state h3 {
      font-size: 16px;
      color: #fff;
      margin-bottom: 6px;
    }

    .empty-state p {
      font-size: 13px;
      max-width: 360px;
      margin: 0 auto;
    }

    .tables-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .table-card {
      background: var(--bg-panel);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: border-color 0.15s ease;
    }

    .table-card:hover {
      border-color: var(--border-medium);
    }

    .card-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .table-title-edit {
      font-size: 14px;
      font-weight: 600;
      background: transparent;
      border: 1px solid transparent;
      color: #fff;
      padding: 2px 6px;
      border-radius: 4px;
      flex: 1;
    }

    .table-title-edit:focus {
      background: var(--bg-input);
      border-color: var(--border-highlight);
    }

    .date-tag {
      font-size: 11px;
      color: var(--text-muted);
    }

    .card-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 4px;
    }

    .meta-tag {
      font-size: 10px;
      font-family: var(--font-mono);
      padding: 2px 6px;
      border-radius: 4px;
    }

    .tag-in {
      background: rgba(0, 240, 255, 0.1);
      color: var(--accent-cyan);
    }

    .tag-out {
      background: rgba(16, 185, 129, 0.1);
      color: #34d399;
    }

    .tag-rows {
      background: rgba(148, 163, 184, 0.1);
      color: var(--text-secondary);
    }

    .card-preview {
      background: var(--bg-card);
      border-radius: 4px;
      padding: 6px 10px;
      font-family: var(--font-mono);
      font-size: 11px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .preview-header {
      color: var(--text-muted);
      font-weight: 700;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding-bottom: 2px;
      display: flex;
      gap: 10px;
    }

    .preview-row {
      display: flex;
      gap: 10px;
      color: var(--text-secondary);
    }

    .prev-in { color: var(--accent-cyan); min-width: 60px; }
    .prev-sep { color: var(--text-muted); }
    .prev-out { color: #34d399; }

    .more-rows-hint {
      font-size: 10px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .card-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .modal-footer {
      padding: 14px 20px;
      border-top: 1px solid var(--border-subtle);
      background: var(--bg-panel);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .footer-note {
      font-size: 12px;
      color: var(--text-muted);
    }
  `],
})
export class SavedTablesDrawerComponent {
  readonly storageService = inject(TruthTableStorageService);

  @Output() close = new EventEmitter<void>();
  @Output() viewTable = new EventEmitter<TruthTable>();

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.close.emit();
    }
  }

  onClearAll(): void {
    if (confirm('Clear all saved truth tables from LocalStorage?')) {
      this.storageService.clearAll();
    }
  }
}
