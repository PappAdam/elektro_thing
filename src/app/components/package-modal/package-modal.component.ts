import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CircuitStateService } from '../../services/circuit-state.service';

@Component({
  selector: 'app-package-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="onBackdropClick($event)">
      <div class="modal-dialog package-dialog">
        <div class="modal-header">
          <div class="header-left">
            <div class="package-icon-chip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <circle cx="9" cy="9" r="1.5" />
                <circle cx="15" cy="9" r="1.5" />
                <circle cx="12" cy="15" r="1.5" />
              </svg>
            </div>
            <div>
              <h2 class="modal-title">Save Circuit as Reusable IC Component</h2>
              <span class="modal-subtitle">Package the current circuit schematic into a single modular chip</span>
            </div>
          </div>
          <button class="btn-icon close-btn" (click)="close.emit()">✕</button>
        </div>

        <div class="modal-body">
          <!-- Component Info -->
          <div class="form-field">
            <label class="field-label">Component Name <span class="req">*</span></label>
            <input
              type="text"
              class="text-input"
              [(ngModel)]="componentName"
              placeholder="e.g. 1-Bit Full Adder, 4-to-1 MUX..."
            />
          </div>

          <div class="form-field">
            <label class="field-label">Description (Optional)</label>
            <input
              type="text"
              class="text-input"
              [(ngModel)]="description"
              placeholder="Brief summary of function..."
            />
          </div>

          <!-- Detected Pins Summary -->
          <div class="pins-detection-summary">
            <div class="summary-box">
              <div class="summary-title in-title">
                Detected Inputs ({{ inputNodes.length }})
              </div>
              <div *ngIf="inputNodes.length === 0" class="no-pins-warn">
                ⚠️ No Input Nodes found on canvas! Add at least one Input Node.
              </div>
              <ul class="pins-tags-list">
                <li *ngFor="let node of inputNodes" class="pin-tag tag-input">
                  {{ node.name }}
                </li>
              </ul>
            </div>

            <div class="summary-box">
              <div class="summary-title out-title">
                Detected Outputs ({{ outputNodes.length }})
              </div>
              <div *ngIf="outputNodes.length === 0" class="no-pins-warn">
                ⚠️ No Output Nodes found on canvas! Add at least one Output Node.
              </div>
              <ul class="pins-tags-list">
                <li *ngFor="let node of outputNodes" class="pin-tag tag-output">
                  {{ node.name }}
                </li>
              </ul>
            </div>
          </div>

          <div class="packaging-explanation">
            <p>
              When saved, this entire schematic and its evaluated truth table will be packaged into a reusable component. You will be able to drag it from the <strong>Custom Elements</strong> section in the sidebar.
            </p>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="close.emit()">Cancel</button>
          <button
            class="btn btn-accent"
            [disabled]="!componentName.trim() || inputNodes.length === 0 || outputNodes.length === 0"
            (click)="onPackage()"
          >
            Save Reusable Component
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .package-dialog {
      width: 580px;
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

    .package-icon-chip {
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

    .package-icon-chip svg {
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

    .modal-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: var(--bg-app);
    }

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

    .req { color: var(--accent-rose); }

    .pins-detection-summary {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 6px;
    }

    .summary-box {
      background: var(--bg-panel);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 12px;
    }

    .summary-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 8px;
    }

    .in-title { color: var(--accent-cyan); }
    .out-title { color: #34d399; }

    .no-pins-warn {
      font-size: 11px;
      color: var(--accent-amber);
      line-height: 1.4;
    }

    .pins-tags-list {
      list-style: none;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .pin-tag {
      font-size: 11px;
      font-family: var(--font-mono);
      padding: 3px 8px;
      border-radius: 4px;
    }

    .tag-input {
      background: rgba(0, 240, 255, 0.1);
      border: 1px solid rgba(0, 240, 255, 0.3);
      color: var(--accent-cyan);
    }

    .tag-output {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
    }

    .packaging-explanation {
      background: rgba(168, 85, 247, 0.08);
      border: 1px solid rgba(168, 85, 247, 0.2);
      border-radius: var(--radius-sm);
      padding: 10px 14px;
      font-size: 12px;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    .packaging-explanation strong {
      color: #fff;
    }

    .modal-footer {
      padding: 14px 20px;
      border-top: 1px solid var(--border-subtle);
      background: var(--bg-panel);
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
    }
  `],
})
export class PackageModalComponent {
  readonly circuitState = inject(CircuitStateService);

  @Output() close = new EventEmitter<void>();

  componentName = '';
  description = '';

  constructor() {
    this.componentName = `${this.circuitState.circuitName()} IC`;
  }

  get inputNodes() {
    return this.circuitState.nodes().filter((n) => n.type === 'INPUT');
  }

  get outputNodes() {
    return this.circuitState.nodes().filter((n) => n.type === 'OUTPUT');
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.close.emit();
    }
  }

  onPackage(): void {
    const name = this.componentName.trim();
    if (!name) return;

    const res = this.circuitState.packageCurrentCircuitAsComponent(name, this.description.trim());
    if (res) {
      alert(`Component "${name}" successfully saved! It is now available in your sidebar under Custom Elements.`);
      this.close.emit();
    } else {
      alert('Could not package component. Please ensure your circuit has at least one Input Node and one Output Node.');
    }
  }
}
