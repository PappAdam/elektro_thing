import { Component, EventEmitter, inject, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CircuitStateService } from '../../services/circuit-state.service';
import { TruthTableStorageService } from '../../services/truth-table-storage.service';
import { SimulationService } from '../../services/simulation.service';
import { TruthTable } from '../../models/circuit.model';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <header class="app-header">
      <div class="header-left">
        <div class="brand">
          <div class="logo-chip">
            <svg viewBox="0 0 24 24" class="logo-icon" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="4" y="4" width="16" height="16" rx="3" />
              <path d="M9 9h6v6H9z" />
              <path d="M4 9H2m2 6H2m18-6h2m-2 6h2M9 4V2m6 2V2m-6 18v2m6-2v2" />
            </svg>
          </div>
          <div class="brand-text">
            <span class="brand-name">Elektro<span class="brand-accent">Thing</span></span>
            <span class="brand-badge">CAD LAB</span>
          </div>
        </div>

        <div class="divider"></div>

        <div class="circuit-title-container">
          <input
            type="text"
            class="circuit-name-input"
            [ngModel]="circuitState.circuitName()"
            (ngModelChange)="circuitState.circuitName.set($event)"
            title="Click to rename circuit"
            placeholder="Circuit Name..."
          />
        </div>
      </div>

      <div class="header-center">
        <!-- Main Run / Generate Truth Table Action -->
        <button
          class="btn btn-run shadow-pulse"
          (click)="onRunSimulation()"
          title="Simulate all input combinations and generate complete Truth Table"
        >
          <svg viewBox="0 0 24 24" class="btn-svg" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          <span>Run & Generate Truth Table</span>
        </button>

        <div class="divider"></div>

        <!-- Create by Truth Table -->
        <button
          class="btn btn-accent"
          (click)="openCustomGateModal.emit()"
          title="Create a new logical element directly from a Truth Table"
        >
          <svg viewBox="0 0 24 24" class="btn-svg" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M9 21V9" />
          </svg>
          <span>+ New Gate from Table</span>
        </button>

        <!-- Package Circuit into Component -->
        <button
          class="btn btn-secondary"
          (click)="openPackageModal.emit()"
          title="Save this circuit diagram as a reusable IC component"
        >
          <svg viewBox="0 0 24 24" class="btn-svg" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <circle cx="9" cy="9" r="1.5" />
            <circle cx="15" cy="9" r="1.5" />
            <circle cx="12" cy="15" r="1.5" />
          </svg>
          <span>Save as Component</span>
        </button>
      </div>

      <div class="header-right">
        <!-- Saved Truth Tables Count -->
        <button
          class="btn btn-secondary tables-history-btn"
          (click)="openSavedTables.emit()"
          title="Open persistent Truth Tables history"
        >
          <svg viewBox="0 0 24 24" class="btn-svg" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span>Saved Tables</span>
          <span class="count-badge">{{ truthTableStorage.tables().length }}</span>
        </button>

        <!-- Center View Button -->
        <button
          class="btn btn-secondary"
          (click)="onCenterView()"
          title="Reset pan and zoom to center"
        >
          <svg viewBox="0 0 24 24" class="btn-svg" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          <span>Center View</span>
        </button>

        <!-- Presets Dropdown -->
        <div class="preset-dropdown-wrap">
          <select
            class="preset-select"
            (change)="onSelectPreset($event)"
            title="Load sample circuits"
          >
            <option value="" disabled selected>Presets / Examples</option>
            <option value="half-adder">Half Adder (XOR + AND)</option>
            <option value="multiplexer">2-to-1 Multiplexer</option>
            <option value="transistor-inverter">NMOS Switch / Inverter</option>
          </select>
        </div>

        <!-- Export / Import -->
        <button class="btn btn-secondary" (click)="circuitState.exportProject()" title="Export circuit and tables to JSON">
          <svg viewBox="0 0 24 24" class="btn-svg" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Export</span>
        </button>

        <label class="btn btn-secondary file-upload-btn" title="Import circuit from JSON file">
          <svg viewBox="0 0 24 24" class="btn-svg" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span>Import</span>
          <input type="file" accept=".json" (change)="onFileImport($event)" style="display: none" />
        </label>

        <!-- Clear Canvas -->
        <button class="btn btn-icon btn-danger" (click)="onClear()" title="Clear all components on canvas">
          <svg viewBox="0 0 24 24" class="btn-svg" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </header>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: var(--header-height);
      flex-shrink: 0;
      z-index: 100;
    }

    .app-header {
      width: 100%;
      height: 100%;
      background: var(--bg-sidebar);
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      gap: 16px;
      z-index: 100;
      user-select: none;
    }

    .header-left, .header-center, .header-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 9px;
    }

    .logo-chip {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(59, 130, 246, 0.3));
      border: 1px solid rgba(0, 240, 255, 0.4);
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--accent-cyan);
      box-shadow: 0 0 10px rgba(0, 240, 255, 0.25);
    }

    .logo-icon {
      width: 20px;
      height: 20px;
    }

    .brand-text {
      display: flex;
      flex-direction: column;
      line-height: 1.1;
    }

    .brand-name {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #fff;
    }

    .brand-accent {
      color: var(--accent-cyan);
    }

    .brand-badge {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--accent-purple);
    }

    .divider {
      width: 1px;
      height: 24px;
      background: var(--border-subtle);
      margin: 0 4px;
    }

    .circuit-name-input {
      background: rgba(12, 18, 32, 0.6);
      border: 1px solid transparent;
      color: var(--text-primary);
      font-weight: 600;
      font-size: 13px;
      padding: 6px 10px;
      border-radius: var(--radius-sm);
      width: 160px;
      transition: all 0.2s ease;
    }

    .circuit-name-input:hover, .circuit-name-input:focus {
      background: var(--bg-input);
      border-color: var(--border-highlight);
      width: 200px;
    }

    .btn-svg {
      width: 15px;
      height: 15px;
      flex-shrink: 0;
    }

    .shadow-pulse {
      animation: pulseGlow 2.5s infinite;
    }

    @keyframes pulseGlow {
      0% { box-shadow: 0 0 8px rgba(16, 185, 129, 0.35); }
      50% { box-shadow: 0 0 18px rgba(16, 185, 129, 0.65); }
      100% { box-shadow: 0 0 8px rgba(16, 185, 129, 0.35); }
    }

    .count-badge {
      background: rgba(0, 240, 255, 0.2);
      color: var(--accent-cyan);
      font-size: 11px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 999px;
      border: 1px solid rgba(0, 240, 255, 0.4);
    }

    .preset-select {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      font-size: 12px;
      padding: 6px 10px;
      border-radius: var(--radius-sm);
      cursor: pointer;
    }

    .preset-select:hover {
      color: #fff;
      border-color: var(--border-medium);
    }

    .file-upload-btn {
      cursor: pointer;
    }
  `],
})
export class HeaderComponent {
  readonly circuitState = inject(CircuitStateService);
  readonly truthTableStorage = inject(TruthTableStorageService);
  readonly simulationService = inject(SimulationService);

  @Output() openTruthTableResult = new EventEmitter<TruthTable>();
  @Output() openCustomGateModal = new EventEmitter<void>();
  @Output() openPackageModal = new EventEmitter<void>();
  @Output() openSavedTables = new EventEmitter<void>();

  onRunSimulation(): void {
    const table = this.simulationService.generateTruthTable(
      this.circuitState.nodes(),
      this.circuitState.wires(),
      this.circuitState.customComponents(),
      this.circuitState.circuitName()
    );

    // Save automatically to persistent storage in localStorage
    this.truthTableStorage.saveTable(table);

    // Open truth table dialog to display results
    this.openTruthTableResult.emit(table);
  }

  onCenterView(): void {
    this.circuitState.zoom.set(1);
    this.circuitState.panX.set(0);
    this.circuitState.panY.set(0);
    this.circuitState.showToast('View Centered');
  }

  onSelectPreset(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select.value;
    if (value) {
      if (confirm('Load preset? This will replace the current circuit.')) {
        this.circuitState.loadPreset(value);
      }
      select.value = '';
    }
  }

  onClear(): void {
    if (confirm('Clear current circuit canvas?')) {
      this.circuitState.clearCircuit();
    }
  }

  onFileImport(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (content) {
          const success = this.circuitState.importProject(content);
          if (success) {
            alert('Circuit imported successfully!');
          } else {
            alert('Failed to parse circuit JSON file.');
          }
        }
      };
      reader.readAsText(file);
      input.value = '';
    }
  }
}
