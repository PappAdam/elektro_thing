import { Component, EventEmitter, inject, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CircuitStateService } from '../../services/circuit-state.service';
import { CustomComponentDef, GateType } from '../../models/circuit.model';

interface PaletteItem {
  type: GateType;
  name: string;
  category: 'io' | 'base' | 'custom';
  description: string;
  customId?: string;
  color?: string;
  pinsDesc: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <aside class="app-sidebar">
      <!-- Search Input -->
      <div class="search-box">
        <svg viewBox="0 0 24 24" class="search-icon" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          class="search-input"
          placeholder="Search gates & components..."
          [(ngModel)]="searchQuery"
        />
        <button *ngIf="searchQuery" class="clear-search-btn" (click)="searchQuery = ''">×</button>
      </div>

      <div class="palette-scroll">
        <!-- Section: Input & Output Nodes -->
        <div class="palette-section" *ngIf="filteredIoItems.length > 0">
          <div class="section-header">
            <span class="section-title">Circuit Terminals (I/O)</span>
            <span class="section-count">{{ filteredIoItems.length }}</span>
          </div>
          <div class="items-grid">
            <div
              *ngFor="let item of filteredIoItems"
              class="palette-card io-card"
              (click)="onAddItem(item)"
              draggable="true"
              (dragstart)="onDragStart($event, item)"
              title="Click or drag onto canvas to place"
            >
              <div class="card-icon" [ngClass]="item.type === 'INPUT' ? 'icon-input' : 'icon-output'">
                <!-- Input Switch Icon -->
                <svg *ngIf="item.type === 'INPUT'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="6" width="20" height="12" rx="6" />
                  <circle cx="8" cy="12" r="3" fill="currentColor" />
                </svg>
                <!-- Output Probe Icon -->
                <svg *ngIf="item.type === 'OUTPUT'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="8" />
                  <circle cx="12" cy="12" r="3" fill="currentColor" />
                  <line x1="12" y1="2" x2="12" y2="4" />
                  <line x1="12" y1="20" x2="12" y2="22" />
                  <line x1="2" y1="12" x2="4" y2="12" />
                  <line x1="20" y1="12" x2="22" y2="12" />
                </svg>
              </div>
              <div class="card-info">
                <span class="card-name">{{ item.name }}</span>
                <span class="card-desc">{{ item.description }}</span>
              </div>
              <button
                type="button"
                class="add-badge"
                (click)="onAddItem(item); $event.stopPropagation()"
                title="Add to canvas center"
              >
                + Add
              </button>
            </div>
          </div>
        </div>

        <!-- Section: Base Logic Elements -->
        <div class="palette-section" *ngIf="filteredBaseItems.length > 0">
          <div class="section-header">
            <span class="section-title">Base Logic Elements</span>
            <span class="section-count">{{ filteredBaseItems.length }}</span>
          </div>
          <div class="items-grid">
            <div
              *ngFor="let item of filteredBaseItems"
              class="palette-card"
              (click)="onAddItem(item)"
              draggable="true"
              (dragstart)="onDragStart($event, item)"
              title="Click or drag onto canvas to place"
            >
              <div class="card-icon">
                <!-- Transistor Icon -->
                <svg *ngIf="item.type === 'TRANSISTOR'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <circle cx="12" cy="12" r="9" stroke-dasharray="1 1" />
                  <line x1="8" y1="6" x2="8" y2="18" stroke-width="2.5" />
                  <line x1="2" y1="12" x2="8" y2="12" />
                  <line x1="11" y1="8" x2="18" y2="4" />
                  <line x1="11" y1="8" x2="11" y2="10" />
                  <line x1="11" y1="16" x2="18" y2="20" />
                  <line x1="11" y1="14" x2="11" y2="16" />
                </svg>
                <!-- AND Gate Icon -->
                <svg *ngIf="item.type === 'AND'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h7a8 8 0 0 1 8 8 8 8 0 0 1-8 8H4z" />
                </svg>
                <!-- OR Gate Icon -->
                <svg *ngIf="item.type === 'OR'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 4c4 4 4 12 0 16 7 0 12-4 16-8C15 8 10 4 3 4z" />
                </svg>
                <!-- XOR Gate Icon -->
                <svg *ngIf="item.type === 'XOR'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M2 4c4 4 4 12 0 16M5 4c4 4 4 12 0 16 7 0 12-4 16-8-4-4-9-8-16-8z" />
                </svg>
                <!-- XAND / XNOR Gate Icon -->
                <svg *ngIf="item.type === 'XAND'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M2 4c4 4 4 12 0 16M5 4c4 4 4 12 0 16 6 0 10-4 14-8-4-4-8-8-14-8z" />
                  <circle cx="20" cy="12" r="1.5" />
                </svg>
                <!-- NOR Gate Icon -->
                <svg *ngIf="item.type === 'NOR'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 4c4 4 4 12 0 16 6 0 10-4 14-8C13 8 9 4 3 4z" />
                  <circle cx="18.5" cy="12" r="1.5" />
                </svg>
                <!-- NOT Gate Icon -->
                <svg *ngIf="item.type === 'NOT'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="4,4 16,12 4,20" />
                  <circle cx="18.5" cy="12" r="1.8" />
                </svg>
                <!-- NAND Gate Icon -->
                <svg *ngIf="item.type === 'NAND'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h6a7 7 0 0 1 7 8 7 7 0 0 1-7 8H4z" />
                  <circle cx="18.5" cy="12" r="1.8" />
                </svg>
              </div>
              <div class="card-info">
                <div class="card-header-row">
                  <span class="card-name">{{ item.name }}</span>
                  <span class="pin-badge">{{ item.pinsDesc }}</span>
                </div>
                <span class="card-desc">{{ item.description }}</span>
              </div>
              <button
                type="button"
                class="add-badge"
                (click)="onAddItem(item); $event.stopPropagation()"
                title="Add to canvas center"
              >
                + Add
              </button>
            </div>
          </div>
        </div>

        <!-- Section: Custom Components (Truth Table Defined / Packaged) -->
        <div class="palette-section">
          <div class="section-header">
            <span class="section-title">Custom Elements</span>
            <span class="section-count">{{ circuitState.customComponents().length }}</span>
          </div>

          <div *ngIf="filteredCustomItems.length === 0 && !searchQuery" class="empty-custom-state">
            <p>No custom elements yet.</p>
            <button class="btn btn-secondary btn-sm" (click)="openCustomGateModal.emit()">
              + Create from Truth Table
            </button>
          </div>

          <div class="items-grid" *ngIf="filteredCustomItems.length > 0">
            <div
              *ngFor="let item of filteredCustomItems"
              class="palette-card custom-card"
              (click)="onAddItem(item)"
              draggable="true"
              (dragstart)="onDragStart($event, item)"
              title="Click or drag onto canvas to place"
            >
              <div class="card-icon icon-custom">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                  <path d="M9 9h6v6H9z" />
                </svg>
              </div>
              <div class="card-info">
                <div class="card-header-row">
                  <span class="card-name">{{ item.name }}</span>
                  <span class="pin-badge">{{ item.pinsDesc }}</span>
                </div>
                <span class="card-desc">{{ item.description }}</span>
              </div>
              <button
                type="button"
                class="add-badge"
                (click)="onAddItem(item); $event.stopPropagation()"
                title="Add to canvas center"
              >
                + Add
              </button>
              <button
                type="button"
                class="delete-comp-btn"
                (click)="onDeleteCustomComponent($event, item.customId)"
                title="Delete this custom component"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  `,
  styles: [`
    :host {
      display: flex;
      flex-shrink: 0;
      width: 270px;
      height: 100%;
      z-index: 20;
    }

    .app-sidebar {
      width: 270px;
      height: 100%;
      background: var(--bg-sidebar);
      border-right: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      user-select: none;
      z-index: 10;
    }

    .search-box {
      padding: 12px 14px;
      position: relative;
      border-bottom: 1px solid var(--border-subtle);
    }

    .search-icon {
      position: absolute;
      left: 24px;
      top: 50%;
      transform: translateY(-50%);
      width: 15px;
      height: 15px;
      color: var(--text-muted);
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      padding-left: 32px;
      padding-right: 24px;
      font-size: 12px;
      height: 34px;
      border-radius: var(--radius-sm);
    }

    .clear-search-btn {
      position: absolute;
      right: 24px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      font-size: 16px;
      line-height: 1;
    }

    .clear-search-btn:hover {
      color: #fff;
    }

    .palette-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 12px 10px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 4px 8px 4px;
    }

    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }

    .section-count {
      font-size: 10px;
      color: var(--text-muted);
      background: var(--bg-card);
      padding: 1px 6px;
      border-radius: 999px;
    }

    .items-grid {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .palette-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      background: var(--bg-panel);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
    }

    .palette-card:hover {
      background: var(--bg-card-hover);
      border-color: var(--border-medium);
      transform: translateX(2px);
    }

    .card-icon {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      background: rgba(14, 20, 34, 0.8);
      border: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
      flex-shrink: 0;
    }

    .card-icon svg {
      width: 18px;
      height: 18px;
    }

    .icon-input {
      color: var(--accent-cyan);
      border-color: rgba(0, 240, 255, 0.3);
      background: rgba(0, 240, 255, 0.08);
    }

    .icon-output {
      color: var(--accent-green);
      border-color: rgba(16, 185, 129, 0.3);
      background: rgba(16, 185, 129, 0.08);
    }

    .icon-custom {
      color: var(--accent-purple);
      border-color: rgba(168, 85, 247, 0.3);
      background: rgba(168, 85, 247, 0.08);
    }

    .card-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    .card-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
    }

    .card-name {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .card-desc {
      font-size: 11px;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .pin-badge {
      font-size: 9px;
      font-family: var(--font-mono);
      color: var(--text-muted);
      background: var(--bg-app);
      padding: 0 4px;
      border-radius: 3px;
    }

    .add-badge {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: 11px;
      font-weight: 600;
      color: var(--accent-cyan);
      background: rgba(0, 240, 255, 0.12);
      border: 1px solid rgba(0, 240, 255, 0.3);
      border-radius: 4px;
      padding: 3px 8px;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .add-badge:hover {
      background: rgba(0, 240, 255, 0.25);
      border-color: var(--accent-cyan);
      box-shadow: 0 0 8px rgba(0, 240, 255, 0.4);
      transform: scale(1.05);
    }

    .delete-comp-btn {
      color: var(--text-muted);
      font-size: 16px;
      padding: 0 4px;
      border-radius: 4px;
    }

    .delete-comp-btn:hover {
      color: var(--accent-rose);
      background: rgba(244, 63, 94, 0.15);
    }

    .empty-custom-state {
      padding: 16px 10px;
      text-align: center;
      background: rgba(15, 23, 42, 0.4);
      border: 1px dashed var(--border-subtle);
      border-radius: var(--radius-sm);
      color: var(--text-muted);
      font-size: 11px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: center;
    }

    .btn-sm {
      padding: 4px 8px;
      font-size: 11px;
    }
  `],
})
export class SidebarComponent {
  readonly circuitState = inject(CircuitStateService);

  @Output() openCustomGateModal = new EventEmitter<void>();

  searchQuery = '';

  readonly baseItems: PaletteItem[] = [
    {
      type: 'TRANSISTOR',
      name: 'Transistor (NMOS)',
      category: 'base',
      description: 'Pass-gate: Conducts In to Out if Gate=1',
      pinsDesc: '2 in / 1 out',
    },
    {
      type: 'AND',
      name: 'AND Gate',
      category: 'base',
      description: 'Out = 1 if all inputs are 1',
      pinsDesc: '2+ in / 1 out',
    },
    {
      type: 'OR',
      name: 'OR Gate',
      category: 'base',
      description: 'Out = 1 if any input is 1',
      pinsDesc: '2+ in / 1 out',
    },
    {
      type: 'XOR',
      name: 'XOR Gate',
      category: 'base',
      description: 'Out = 1 if odd number of 1s',
      pinsDesc: '2+ in / 1 out',
    },
    {
      type: 'XAND',
      name: 'XAND Gate (XNOR)',
      category: 'base',
      description: 'Out = 1 if even number of 1s (Inverted XOR)',
      pinsDesc: '2+ in / 1 out',
    },
    {
      type: 'NOR',
      name: 'NOR Gate',
      category: 'base',
      description: 'Inverted OR: Out = 1 only if all 0',
      pinsDesc: '2+ in / 1 out',
    },
    {
      type: 'NOT',
      name: 'NOT Gate',
      category: 'base',
      description: 'Inverter: Out = !In',
      pinsDesc: '1 in / 1 out',
    },
    {
      type: 'NAND',
      name: 'NAND Gate',
      category: 'base',
      description: 'Inverted AND: Out = 0 only if all 1',
      pinsDesc: '2+ in / 1 out',
    },
  ];

  readonly ioItems: PaletteItem[] = [
    {
      type: 'INPUT',
      name: 'Input Node',
      category: 'io',
      description: 'Interactive signal source (0 or 1)',
      pinsDesc: '0 in / 1 out',
    },
    {
      type: 'OUTPUT',
      name: 'Output Node',
      category: 'io',
      description: 'Monitors & displays circuit output',
      pinsDesc: '1 in / 0 out',
    },
  ];

  get filteredIoItems(): PaletteItem[] {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return this.ioItems;
    return this.ioItems.filter(
      (item) => item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
    );
  }

  get filteredBaseItems(): PaletteItem[] {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return this.baseItems;
    return this.baseItems.filter(
      (item) => item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
    );
  }

  get filteredCustomItems(): PaletteItem[] {
    const customList = this.circuitState.customComponents();
    const items: PaletteItem[] = customList.map((comp) => ({
      type: 'CUSTOM',
      name: comp.name,
      category: 'custom',
      description: comp.description || (comp.truthTable ? 'Defined by Truth Table' : 'Packaged sub-circuit'),
      customId: comp.id,
      pinsDesc: `${comp.inputs.length} in / ${comp.outputs.length} out`,
    }));

    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return items;
    return items.filter(
      (item) => item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
    );
  }

  onAddItem(item: PaletteItem): void {
    this.circuitState.addNodeAtCenter(item.type, item.customId);
  }

  onDragStart(event: DragEvent, item: PaletteItem): void {
    if (event.dataTransfer) {
      const data = JSON.stringify(item);
      event.dataTransfer.setData('text/plain', data);
      event.dataTransfer.setData('application/json', data);
      event.dataTransfer.effectAllowed = 'copy';
    }
  }

  onDeleteCustomComponent(event: MouseEvent, customId?: string): void {
    event.stopPropagation();
    if (customId && confirm('Delete this custom component?')) {
      this.circuitState.deleteCustomComponent(customId);
    }
  }
}
