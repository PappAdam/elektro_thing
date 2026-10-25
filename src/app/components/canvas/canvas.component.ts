import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CircuitStateService } from '../../services/circuit-state.service';
import { CircuitNode, GateType, Pin, Wire } from '../../models/circuit.model';

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      #canvasContainer
      class="canvas-viewport"
      (wheel)="onWheel($event)"
      (mousedown)="onCanvasMouseDown($event)"
      (contextmenu)="onCanvasContextMenu($event)"
      (dragover)="onDragOver($event)"
      (drop)="onDrop($event)"
      (touchstart)="onTouchStart($event)"
      (touchmove)="onTouchMove($event)"
      (touchend)="onTouchEnd($event)"
    >
      <!-- Interactive SVG Layer for Grid & Wires -->
      <svg
        class="canvas-svg"
        [style.transform]="'translate(' + circuitState.panX() + 'px, ' + circuitState.panY() + 'px) scale(' + circuitState.zoom() + ')'"
      >
        <defs>
          <!-- Neon High Signal Glow Filter -->
          <filter id="glow-high" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <!-- Dot Grid Pattern -->
          <pattern id="grid-dots" width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="#1e2a44" opacity="0.6" />
          </pattern>
        </defs>

        <!-- Infinite Grid Background Rect -->
        <rect x="-10000" y="-10000" width="20000" height="20000" fill="url(#grid-dots)" />

        <!-- Render All Existing Wires -->
        <g class="wires-layer">
          <g *ngFor="let wire of circuitState.wires()" class="wire-group" (click)="onWireClick($event, wire.id)">
            <!-- Invisible wider hit area for easy clicking/selecting wire -->
            <path
              [attr.d]="getWirePath(wire)"
              class="wire-hitbox"
              title="Click to remove wire connection"
            />
            <!-- Outer Glow when HIGH -->
            <path
              *ngIf="wire.value === 1"
              [attr.d]="getWirePath(wire)"
              class="wire-glow"
            />
            <!-- Visible Main Wire Line -->
            <path
              [attr.d]="getWirePath(wire)"
              class="wire-path"
              [class.wire-active]="wire.value === 1"
              [class.wire-inactive]="wire.value === 0"
            />
            <!-- Signal flow particles animation when signal is 1 -->
            <path
              *ngIf="wire.value === 1"
              [attr.d]="getWirePath(wire)"
              class="wire-flow"
            />
          </g>
        </g>

        <!-- Connecting Wire Preview (when user is dragging from a pin) -->
        <g *ngIf="circuitState.connectingWire() as cw">
          <path
            [attr.d]="getConnectingWirePath(cw)"
            class="wire-preview"
          />
        </g>
      </svg>

      <!-- HTML Nodes Layer -->
      <div
        class="nodes-container"
        [style.transform]="'translate(' + circuitState.panX() + 'px, ' + circuitState.panY() + 'px) scale(' + circuitState.zoom() + ')'"
      >
        <div
          *ngFor="let node of circuitState.nodes()"
          class="circuit-node"
          [class.node-selected]="circuitState.selectedNodeId() === node.id"
          [class.node-input-type]="node.type === 'INPUT'"
          [class.node-output-type]="node.type === 'OUTPUT'"
          [class.node-active-out]="isNodeOutputActive(node)"
          [style.left.px]="node.x"
          [style.top.px]="node.y"
          [style.width.px]="getNodeWidth(node)"
          (mousedown)="onNodeMouseDown($event, node)"
        >
          <!-- Node Header Bar -->
          <div class="node-header">
            <!-- Table Marker Tickbox -->
            <label
              class="table-marker-label"
              [class.ticked]="node.showInTruthTable"
              title="Tick to show this node in the generated Truth Table"
              (mousedown)="$event.stopPropagation()"
            >
              <input
                type="checkbox"
                [checked]="node.showInTruthTable"
                (change)="circuitState.toggleNodeTableMarker(node.id)"
              />
              <span class="marker-box">
                <svg *ngIf="node.showInTruthTable" viewBox="0 0 24 24" class="check-icon" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span class="marker-text">Table</span>
            </label>

            <!-- Node Name (Inline Editable) -->
            <div class="node-title-wrap" (mousedown)="$event.stopPropagation()">
              <input
                type="text"
                class="node-name-input"
                [ngModel]="node.name"
                (ngModelChange)="circuitState.renameNode(node.id, $event)"
                title="Click to rename device"
              />
            </div>

            <!-- Remove Node Button -->
            <button
              type="button"
              class="node-close-btn"
              (click)="onDeleteNode($event, node.id)"
              title="Delete node"
              (mousedown)="$event.stopPropagation()"
            >
              ×
            </button>
          </div>

          <!-- Node Body -->
          <div class="node-body">
            <!-- Left Side: Inputs -->
            <div class="pins-column pins-inputs">
              <div
                *ngFor="let pin of node.inputs; let i = index"
                class="pin-row pin-input-row"
              >
                <!-- Pin Socket Handle -->
                <div
                  class="pin-socket pin-socket-in"
                  [class.pin-active]="pin.value === 1"
                  [class.pin-connected]="isPinConnected(node.id, pin.id, 'input')"
                  (mousedown)="onPinMouseDown($event, node, pin, 'input')"
                  (mouseup)="onPinMouseUp($event, node, pin, 'input')"
                  title="Input Port: {{ pin.name }} (Value: {{ pin.value }})"
                >
                  <div class="pin-dot"></div>
                </div>

                <!-- Editable Pin Name -->
                <input
                  type="text"
                  class="pin-name-input"
                  [ngModel]="pin.name"
                  (ngModelChange)="circuitState.renamePin(node.id, pin.id, $event)"
                  (mousedown)="$event.stopPropagation()"
                  title="Rename input pin"
                />

                <!-- Remove Dynamic Pin (if gate supports dynamic pins and has > 2) -->
                <button
                  *ngIf="canRemoveInput(node)"
                  type="button"
                  class="pin-del-btn"
                  (click)="circuitState.removeInputPinFromNode(node.id, pin.id)"
                  (mousedown)="$event.stopPropagation()"
                  title="Remove this input pin"
                >
                  −
                </button>
              </div>

              <!-- Button to dynamically add an input pin -->
              <button
                *ngIf="canAddInput(node)"
                type="button"
                class="add-pin-btn"
                (click)="circuitState.addInputPinToNode(node.id)"
                (mousedown)="$event.stopPropagation()"
                title="Add another dynamic input pin"
              >
                + Add Input
              </button>
            </div>

            <!-- Center Visual for Special Nodes -->
            <div class="node-center-action">
              <!-- INPUT Node: Interactive Toggle Switch -->
              <div *ngIf="node.type === 'INPUT'" class="input-toggle-container">
                <button
                  type="button"
                  class="toggle-switch-btn"
                  [class.state-on]="node.state === 1"
                  (click)="circuitState.toggleInputNode(node.id)"
                  (mousedown)="$event.stopPropagation()"
                  title="Click to toggle logic state (0 or 1)"
                >
                  <span class="switch-val">{{ node.state === 1 ? '1' : '0' }}</span>
                  <span class="switch-pill"></span>
                </button>
                <span class="toggle-hint">CLICK TO TOGGLE</span>
              </div>

              <!-- OUTPUT Node: LED Indicator -->
              <div *ngIf="node.type === 'OUTPUT'" class="output-led-container">
                <div
                  class="led-indicator"
                  [class.led-on]="(node.inputs[0]?.value ?? 0) === 1"
                >
                  <span class="led-val">{{ node.inputs[0]?.value ?? 0 }}</span>
                </div>
                <span class="led-hint">SIGNAL OUT</span>
              </div>

              <!-- Gate Type Subtitle / Badge -->
              <div *ngIf="node.type !== 'INPUT' && node.type !== 'OUTPUT'" class="gate-type-badge">
                {{ node.type }}
              </div>
            </div>

            <!-- Right Side: Outputs -->
            <div class="pins-column pins-outputs">
              <div
                *ngFor="let pin of node.outputs"
                class="pin-row pin-output-row"
              >
                <!-- Editable Output Pin Name -->
                <input
                  type="text"
                  class="pin-name-input pin-name-right"
                  [ngModel]="pin.name"
                  (ngModelChange)="circuitState.renamePin(node.id, pin.id, $event)"
                  (mousedown)="$event.stopPropagation()"
                  title="Rename output pin"
                />

                <!-- Pin Socket Handle -->
                <div
                  class="pin-socket pin-socket-out"
                  [class.pin-active]="pin.value === 1"
                  [class.pin-connected]="isPinConnected(node.id, pin.id, 'output')"
                  (mousedown)="onPinMouseDown($event, node, pin, 'output')"
                  (mouseup)="onPinMouseUp($event, node, pin, 'output')"
                  title="Output Port: {{ pin.name }} (Value: {{ pin.value }})"
                >
                  <div class="pin-dot"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Top-Left Quick-Add Floating Toolbar Button & Dropdown -->
      <div class="canvas-quick-add" (mousedown)="$event.stopPropagation()">
        <button
          type="button"
          class="btn btn-primary btn-quick-add"
          (click)="toggleQuickAdd($event)"
          title="Add element directly to canvas"
        >
          <svg viewBox="0 0 24 24" class="btn-svg" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>+ Add Device</span>
        </button>

        <!-- Dropdown Menu -->
        <div *ngIf="showQuickAddDropdown" class="quick-add-dropdown">
          <div class="dropdown-heading">Circuit Terminals</div>
          <button type="button" class="drop-item" (click)="quickAdd('INPUT')">
            <span class="dot in-dot"></span> Input Node (0/1 switch)
          </button>
          <button type="button" class="drop-item" (click)="quickAdd('OUTPUT')">
            <span class="dot out-dot"></span> Output Node (LED probe)
          </button>

          <div class="dropdown-heading">Base Logic Elements</div>
          <button type="button" class="drop-item" (click)="quickAdd('TRANSISTOR')">⚡ Transistor (NMOS Switch)</button>
          <button type="button" class="drop-item" (click)="quickAdd('AND')">AND Gate</button>
          <button type="button" class="drop-item" (click)="quickAdd('OR')">OR Gate</button>
          <button type="button" class="drop-item" (click)="quickAdd('XOR')">XOR Gate</button>
          <button type="button" class="drop-item" (click)="quickAdd('XAND')">XAND Gate (XNOR)</button>
          <button type="button" class="drop-item" (click)="quickAdd('NOR')">NOR Gate</button>
          <button type="button" class="drop-item" (click)="quickAdd('NOT')">NOT Gate (Inverter)</button>
          <button type="button" class="drop-item" (click)="quickAdd('NAND')">NAND Gate</button>

          <ng-container *ngIf="circuitState.customComponents().length > 0">
            <div class="dropdown-heading">Custom Elements</div>
            <button
              *ngFor="let comp of circuitState.customComponents()"
              type="button"
              class="drop-item drop-custom"
              (click)="quickAdd('CUSTOM', comp.id)"
            >
              🧩 {{ comp.name }}
            </button>
          </ng-container>
        </div>
      </div>

      <!-- Right-Click Context Menu -->
      <div
        *ngIf="contextMenu"
        class="quick-add-dropdown canvas-context-menu"
        [style.left.px]="contextMenu.x"
        [style.top.px]="contextMenu.y"
        (mousedown)="$event.stopPropagation()"
      >
        <div class="dropdown-heading">Add at cursor:</div>
        <button type="button" class="drop-item" (click)="addAtCursor('INPUT')">
          <span class="dot in-dot"></span> Input Node
        </button>
        <button type="button" class="drop-item" (click)="addAtCursor('OUTPUT')">
          <span class="dot out-dot"></span> Output Node
        </button>
        <div class="dropdown-divider"></div>
        <button type="button" class="drop-item" (click)="addAtCursor('TRANSISTOR')">⚡ Transistor</button>
        <button type="button" class="drop-item" (click)="addAtCursor('AND')">AND Gate</button>
        <button type="button" class="drop-item" (click)="addAtCursor('OR')">OR Gate</button>
        <button type="button" class="drop-item" (click)="addAtCursor('XOR')">XOR Gate</button>
        <button type="button" class="drop-item" (click)="addAtCursor('XAND')">XAND Gate</button>
        <button type="button" class="drop-item" (click)="addAtCursor('NOR')">NOR Gate</button>
        <button type="button" class="drop-item" (click)="addAtCursor('NOT')">NOT Gate</button>
        <button type="button" class="drop-item" (click)="addAtCursor('NAND')">NAND Gate</button>
      </div>

      <!-- Floating Toast Feedback Banner -->
      <div *ngIf="circuitState.toastMessage() as msg" class="canvas-toast">
        <span class="toast-indicator">●</span>
        <span>{{ msg }}</span>
      </div>

      <!-- Bottom-Left Gesture Hint -->
      <div class="gesture-hint-pill">
        <span>Touchpad: 2-finger scroll to pan • Pinch to zoom • Click & drag to move</span>
      </div>

      <!-- Canvas Floating Toolbar Controls (Bottom-Right) -->
      <div class="canvas-controls">
        <button type="button" class="ctrl-btn" (click)="zoomIn()" title="Zoom In">+</button>
        <button type="button" class="ctrl-btn" (click)="resetZoom()" title="Reset Zoom">{{ (circuitState.zoom() * 100) | number:'1.0-0' }}%</button>
        <button type="button" class="ctrl-btn" (click)="zoomOut()" title="Zoom Out">−</button>
        <div class="ctrl-divider"></div>
        <button type="button" class="ctrl-btn" (click)="fitView()" title="Fit Circuit on Screen">
          <svg viewBox="0 0 24 24" class="ctrl-svg" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
        </button>
      </div>

      <!-- Helpful Shortcut Banner when empty -->
      <div *ngIf="circuitState.nodes().length === 0" class="canvas-empty-guide">
        <div class="guide-box">
          <h3>Circuit Canvas is Empty</h3>
          <p>Click <strong>+ Add Device</strong> above, right-click, or click any element in the sidebar to add it.</p>
          <div class="guide-actions">
            <button type="button" class="btn btn-primary" (click)="circuitState.loadPreset('half-adder')">
              Load Half Adder Preset
            </button>
            <button type="button" class="btn btn-secondary" (click)="circuitState.loadPreset('multiplexer')">
              Load 2-to-1 MUX Preset
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex: 1;
      width: 100%;
      height: 100%;
      min-width: 0;
      position: relative;
      overflow: hidden;
    }

    .canvas-viewport {
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
      background-color: var(--bg-canvas);
      cursor: grab;
      user-select: none;
      touch-action: none;
    }

    .canvas-viewport:active {
      cursor: grabbing;
    }

    .canvas-svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      transform-origin: 0 0;
    }

    .wires-layer {
      pointer-events: auto;
    }

    .wire-group {
      cursor: pointer;
    }

    .wire-hitbox {
      fill: none;
      stroke: transparent;
      stroke-width: 16px;
      pointer-events: stroke;
    }

    .wire-path {
      fill: none;
      stroke-linecap: round;
      transition: stroke 0.15s ease;
      stroke-width: 3.5px;
    }

    .wire-inactive {
      stroke: var(--signal-low);
    }

    .wire-active {
      stroke: var(--signal-high);
      filter: url(#glow-high);
    }

    .wire-glow {
      fill: none;
      stroke: var(--signal-high);
      stroke-width: 8px;
      opacity: 0.35;
      stroke-linecap: round;
    }

    .wire-flow {
      fill: none;
      stroke: #ffffff;
      stroke-width: 3px;
      stroke-linecap: round;
      stroke-dasharray: 6 18;
      animation: dashFlow 1.2s linear infinite;
    }

    @keyframes dashFlow {
      to {
        stroke-dashoffset: -24;
      }
    }

    .wire-preview {
      fill: none;
      stroke: var(--accent-cyan);
      stroke-width: 2.5px;
      stroke-dasharray: 5 5;
    }

    .nodes-container {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      transform-origin: 0 0;
    }

    /* Circuit Node Box */
    .circuit-node {
      position: absolute;
      background: var(--bg-card);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-md);
      display: flex;
      flex-direction: column;
      pointer-events: auto;
      cursor: move;
      transition: box-shadow 0.15s ease, border-color 0.15s ease;
      backdrop-filter: blur(8px);
    }

    .circuit-node:hover {
      border-color: var(--border-highlight);
      box-shadow: var(--shadow-lg);
    }

    .node-selected {
      border-color: var(--accent-cyan) !important;
      box-shadow: 0 0 15px rgba(0, 240, 255, 0.45) !important;
    }

    .node-input-type {
      border-left: 3px solid var(--accent-cyan);
    }

    .node-output-type {
      border-right: 3px solid var(--accent-green);
    }

    /* Header */
    .node-header {
      background: rgba(14, 20, 34, 0.9);
      border-bottom: 1px solid var(--border-subtle);
      border-top-left-radius: inherit;
      border-top-right-radius: inherit;
      padding: 6px 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }

    .table-marker-label {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      color: var(--text-muted);
      cursor: pointer;
      user-select: none;
    }

    .table-marker-label input {
      display: none;
    }

    .marker-box {
      width: 14px;
      height: 14px;
      border-radius: 3px;
      border: 1px solid var(--border-medium);
      background: var(--bg-input);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .table-marker-label.ticked .marker-box {
      background: var(--accent-pink);
      border-color: var(--accent-pink);
      box-shadow: 0 0 6px rgba(236, 72, 153, 0.5);
    }

    .check-icon {
      width: 10px;
      height: 10px;
      color: #fff;
    }

    .marker-text {
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .table-marker-label.ticked .marker-text {
      color: var(--accent-pink);
    }

    .node-title-wrap {
      flex: 1;
      min-width: 0;
    }

    .node-name-input {
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-primary);
      font-weight: 600;
      font-size: 11px;
      padding: 2px 4px;
      border-radius: 3px;
      width: 100%;
      text-overflow: ellipsis;
    }

    .node-name-input:focus {
      background: var(--bg-input);
      border-color: var(--border-highlight);
    }

    .node-close-btn {
      color: var(--text-muted);
      font-size: 15px;
      line-height: 1;
      padding: 2px 5px;
      border-radius: 4px;
    }

    .node-close-btn:hover {
      color: #fff;
      background: rgba(244, 63, 94, 0.3);
    }

    /* Body */
    .node-body {
      padding: 10px 0;
      display: flex;
      justify-content: space-between;
      position: relative;
      min-height: 54px;
    }

    .pins-column {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .pins-inputs {
      align-items: flex-start;
      margin-left: -9px;
    }

    .pins-outputs {
      align-items: flex-end;
      margin-right: -9px;
    }

    .pin-row {
      display: flex;
      align-items: center;
      gap: 5px;
      height: 22px;
    }

    .pin-socket {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--bg-panel);
      border: 2px solid var(--border-medium);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: crosshair;
      transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 5;
    }

    .pin-socket:hover {
      transform: scale(1.3);
      border-color: var(--accent-cyan);
      box-shadow: 0 0 10px rgba(0, 240, 255, 0.6);
    }

    .pin-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--text-muted);
    }

    .pin-socket.pin-active {
      border-color: var(--signal-high);
      box-shadow: 0 0 8px var(--signal-high-glow);
    }

    .pin-socket.pin-active .pin-dot {
      background: var(--signal-high);
      box-shadow: 0 0 5px var(--signal-high);
    }

    .pin-socket.pin-connected {
      border-color: var(--accent-blue);
    }

    .pin-name-input {
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-secondary);
      font-size: 11px;
      font-family: var(--font-mono);
      width: 32px;
      padding: 1px 2px;
      border-radius: 2px;
    }

    .pin-name-input:focus {
      background: var(--bg-input);
      border-color: var(--border-highlight);
      color: #fff;
    }

    .pin-name-right {
      text-align: right;
    }

    .pin-del-btn {
      font-size: 12px;
      color: var(--text-muted);
      padding: 0 2px;
      line-height: 1;
    }

    .pin-del-btn:hover {
      color: var(--accent-rose);
    }

    .add-pin-btn {
      font-size: 10px;
      color: var(--accent-cyan);
      background: rgba(0, 240, 255, 0.08);
      border: 1px dashed rgba(0, 240, 255, 0.3);
      border-radius: 4px;
      padding: 2px 6px;
      margin-left: 14px;
      margin-top: 4px;
    }

    .add-pin-btn:hover {
      background: rgba(0, 240, 255, 0.2);
    }

    /* Center Visual */
    .node-center-action {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 0 6px;
    }

    .gate-type-badge {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      background: rgba(0, 0, 0, 0.25);
      padding: 2px 6px;
      border-radius: 4px;
    }

    /* Interactive Input Switch */
    .input-toggle-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
    }

    .toggle-switch-btn {
      width: 62px;
      height: 32px;
      border-radius: 16px;
      background: var(--bg-input);
      border: 2px solid var(--border-medium);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 6px;
      position: relative;
      cursor: pointer;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
    }

    .switch-val {
      font-family: var(--font-mono);
      font-weight: 800;
      font-size: 14px;
      color: var(--text-muted);
      z-index: 2;
    }

    .switch-pill {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #475569;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.2s ease;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.4);
    }

    .toggle-switch-btn.state-on {
      border-color: var(--signal-high);
      box-shadow: 0 0 12px var(--signal-high-glow);
    }

    .toggle-switch-btn.state-on .switch-val {
      color: var(--signal-high);
    }

    .toggle-switch-btn.state-on .switch-pill {
      transform: translateX(30px);
      background: var(--signal-high);
      box-shadow: 0 0 10px var(--signal-high);
    }

    .toggle-hint {
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }

    /* Output LED Indicator */
    .output-led-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
    }

    .led-indicator {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: #0f172a;
      border: 2px solid var(--border-medium);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-mono);
      font-weight: 800;
      font-size: 16px;
      color: #64748b;
      transition: all 0.2s ease;
    }

    .led-indicator.led-on {
      border-color: var(--accent-green);
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
      box-shadow: 0 0 18px rgba(16, 185, 129, 0.6);
    }

    .led-hint {
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }

    /* Top-Left Quick-Add Floating Control */
    .canvas-quick-add {
      position: absolute;
      left: 18px;
      top: 18px;
      z-index: 50;
    }

    .btn-quick-add {
      background: linear-gradient(135deg, #0284c7, #2563eb);
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.45);
      font-weight: 600;
      border-radius: var(--radius-sm);
    }

    .btn-quick-add:hover {
      box-shadow: 0 6px 18px rgba(37, 99, 235, 0.6);
      transform: translateY(-1px);
    }

    .quick-add-dropdown {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      background: var(--bg-panel);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg), 0 0 20px rgba(0, 0, 0, 0.5);
      width: 220px;
      max-height: 380px;
      overflow-y: auto;
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      z-index: 100;
      animation: fadeIn 0.15s ease-out;
    }

    .canvas-context-menu {
      position: fixed;
      top: 0;
      left: 0;
    }

    .dropdown-heading {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      padding: 6px 8px 3px 8px;
    }

    .drop-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      font-size: 12px;
      color: var(--text-primary);
      border-radius: 4px;
      text-align: left;
      width: 100%;
      cursor: pointer;
      transition: all 0.1s ease;
    }

    .drop-item:hover {
      background: var(--bg-card-hover);
      color: #fff;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .in-dot { background: var(--accent-cyan); box-shadow: 0 0 5px var(--accent-cyan); }
    .out-dot { background: var(--accent-green); box-shadow: 0 0 5px var(--accent-green); }

    .dropdown-divider {
      height: 1px;
      background: var(--border-subtle);
      margin: 4px 0;
    }

    /* Floating Toast Feedback Banner */
    .canvas-toast {
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(14, 20, 34, 0.94);
      border: 1px solid var(--accent-cyan);
      border-radius: 999px;
      padding: 6px 16px;
      color: #fff;
      font-size: 12px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 20px rgba(0, 240, 255, 0.35);
      z-index: 90;
      pointer-events: none;
      animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .toast-indicator {
      color: var(--accent-cyan);
      font-size: 10px;
      animation: pulseGlow 1.5s infinite;
    }

    /* Bottom-Left Gesture Hint */
    .gesture-hint-pill {
      position: absolute;
      left: 18px;
      bottom: 18px;
      background: rgba(14, 20, 34, 0.85);
      border: 1px solid var(--border-subtle);
      border-radius: 999px;
      padding: 4px 12px;
      font-size: 11px;
      color: var(--text-muted);
      pointer-events: none;
      backdrop-filter: blur(4px);
    }

    /* Canvas Controls Bottom-Right */
    .canvas-controls {
      position: absolute;
      right: 20px;
      bottom: 20px;
      background: var(--bg-panel);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-md);
      display: flex;
      align-items: center;
      padding: 4px;
      gap: 2px;
      z-index: 50;
    }

    .ctrl-btn {
      width: 32px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
      font-size: 13px;
      font-weight: 600;
      border-radius: 6px;
    }

    .ctrl-btn:hover {
      background: var(--bg-card);
      color: #fff;
    }

    .ctrl-divider {
      width: 1px;
      height: 18px;
      background: var(--border-subtle);
      margin: 0 2px;
    }

    .ctrl-svg {
      width: 15px;
      height: 15px;
    }

    /* Empty state guide */
    .canvas-empty-guide {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }

    .guide-box {
      pointer-events: auto;
      background: rgba(19, 27, 46, 0.95);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-lg);
      padding: 30px 40px;
      text-align: center;
      box-shadow: var(--shadow-lg);
      backdrop-filter: blur(10px);
      max-width: 420px;
    }

    .guide-box h3 {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 8px;
      color: #fff;
    }

    .guide-box p {
      font-size: 13px;
      color: var(--text-secondary);
      margin-bottom: 20px;
    }

    .guide-actions {
      display: flex;
      gap: 10px;
      justify-content: center;
    }
  `],
})
export class CanvasComponent implements AfterViewInit {
  readonly circuitState = inject(CircuitStateService);

  @ViewChild('canvasContainer', { static: true })
  canvasRef!: ElementRef<HTMLDivElement>;

  showQuickAddDropdown = false;
  contextMenu: { x: number; y: number } | null = null;

  private isPanning = false;
  private startPanX = 0;
  private startPanY = 0;

  private draggingNodeId: string | null = null;
  private dragNodeOffsetX = 0;
  private dragNodeOffsetY = 0;

  // Touch tracking
  private initialTouchDistance = 0;
  private initialTouchZoom = 1;
  private lastTouchX = 0;
  private lastTouchY = 0;

  ngAfterViewInit(): void {
    this.updateViewportDimensions();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateViewportDimensions();
  }

  private updateViewportDimensions(): void {
    if (this.canvasRef?.nativeElement) {
      const rect = this.canvasRef.nativeElement.getBoundingClientRect();
      this.circuitState.viewportWidth.set(rect.width);
      this.circuitState.viewportHeight.set(rect.height);
    }
  }

  getNodeWidth(node: CircuitNode): number {
    if (node.type === 'INPUT') return 160;
    if (node.type === 'OUTPUT') return 160;
    if (node.type === 'CUSTOM') return 200;
    return 180;
  }

  isNodeOutputActive(node: CircuitNode): boolean {
    return node.outputs.some((p) => p.value === 1);
  }

  canAddInput(node: CircuitNode): boolean {
    return (
      node.type !== 'INPUT' &&
      node.type !== 'OUTPUT' &&
      node.type !== 'TRANSISTOR' &&
      node.type !== 'NOT' &&
      node.type !== 'CUSTOM'
    );
  }

  canRemoveInput(node: CircuitNode): boolean {
    return this.canAddInput(node) && node.inputs.length > 2;
  }

  isPinConnected(nodeId: string, pinId: string, type: 'input' | 'output'): boolean {
    if (type === 'input') {
      return this.circuitState.wires().some((w) => w.toNodeId === nodeId && w.toPinId === pinId);
    }
    return this.circuitState.wires().some((w) => w.fromNodeId === nodeId && w.fromPinId === pinId);
  }

  // ==========================================
  // Quick Add & Context Menu
  // ==========================================

  toggleQuickAdd(event: MouseEvent): void {
    event.stopPropagation();
    this.showQuickAddDropdown = !this.showQuickAddDropdown;
    this.contextMenu = null;
  }

  quickAdd(type: GateType, customId?: string): void {
    this.circuitState.addNodeAtCenter(type, customId);
    this.showQuickAddDropdown = false;
  }

  onCanvasContextMenu(event: MouseEvent): void {
    event.preventDefault();
    this.contextMenu = { x: event.clientX, y: event.clientY };
    this.showQuickAddDropdown = false;
  }

  addAtCursor(type: GateType, customId?: string): void {
    if (!this.contextMenu) return;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const zoom = this.circuitState.zoom();
    const x = (this.contextMenu.x - rect.left - this.circuitState.panX()) / zoom;
    const y = (this.contextMenu.y - rect.top - this.circuitState.panY()) / zoom;

    this.circuitState.addNode(type, x, y, customId);
    this.contextMenu = null;
  }

  // ==========================================
  // Pin & Wire Coordinates
  // ==========================================

  private getPinCoords(nodeId: string, pinId: string, pinType: 'input' | 'output'): { x: number; y: number } {
    const node = this.circuitState.nodes().find((n) => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };

    const width = this.getNodeWidth(node);
    const headerHeight = 33;
    const paddingY = 20;
    const pinRowHeight = 32;

    if (pinType === 'input') {
      const idx = node.inputs.findIndex((p) => p.id === pinId);
      const safeIdx = idx >= 0 ? idx : 0;
      return {
        x: node.x,
        y: node.y + headerHeight + paddingY + safeIdx * pinRowHeight,
      };
    } else {
      const idx = node.outputs.findIndex((p) => p.id === pinId);
      const safeIdx = idx >= 0 ? idx : 0;
      return {
        x: node.x + width,
        y: node.y + headerHeight + paddingY + safeIdx * pinRowHeight,
      };
    }
  }

  getWirePath(wire: Wire): string {
    const start = this.getPinCoords(wire.fromNodeId, wire.fromPinId, 'output');
    const end = this.getPinCoords(wire.toNodeId, wire.toPinId, 'input');

    const dx = Math.max(Math.abs(end.x - start.x) * 0.5, 40);
    return `M ${start.x} ${start.y} C ${start.x + dx} ${start.y}, ${end.x - dx} ${end.y}, ${end.x} ${end.y}`;
  }

  getConnectingWirePath(cw: {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    fromPinType: 'input' | 'output';
  }): string {
    const dx = Math.max(Math.abs(cw.currentX - cw.startX) * 0.5, 40);
    if (cw.fromPinType === 'output') {
      return `M ${cw.startX} ${cw.startY} C ${cw.startX + dx} ${cw.startY}, ${cw.currentX - dx} ${cw.currentY}, ${cw.currentX} ${cw.currentY}`;
    } else {
      return `M ${cw.startX} ${cw.startY} C ${cw.startX - dx} ${cw.startY}, ${cw.currentX + dx} ${cw.currentY}, ${cw.currentX} ${cw.currentY}`;
    }
  }

  // ==========================================
  // Mouse & Touchpad Wheel Events
  // ==========================================

  onWheel(event: WheelEvent): void {
    event.preventDefault();

    // Check if user is pinching or holding Ctrl for zoom
    if (event.ctrlKey || event.metaKey) {
      const zoomFactor = event.deltaY < 0 ? 1.06 : 0.94;
      const newZoom = Math.min(Math.max(this.circuitState.zoom() * zoomFactor, 0.3), 3.0);

      const rect = this.canvasRef.nativeElement.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      const currentZoom = this.circuitState.zoom();
      const newPanX = mouseX - (mouseX - this.circuitState.panX()) * (newZoom / currentZoom);
      const newPanY = mouseY - (mouseY - this.circuitState.panY()) * (newZoom / currentZoom);

      this.circuitState.zoom.set(newZoom);
      this.circuitState.panX.set(newPanX);
      this.circuitState.panY.set(newPanY);
    } else {
      // Standard Touchpad Two-Finger Scroll: PAN smoothly
      this.circuitState.panX.update((x) => x - event.deltaX);
      this.circuitState.panY.update((y) => y - event.deltaY);
    }
  }

  onCanvasMouseDown(event: MouseEvent): void {
    this.showQuickAddDropdown = false;
    this.contextMenu = null;

    if (event.button === 0 && !this.draggingNodeId) {
      // Start panning canvas
      this.isPanning = true;
      this.startPanX = event.clientX - this.circuitState.panX();
      this.startPanY = event.clientY - this.circuitState.panY();
      this.circuitState.selectedNodeId.set(null);
    }
  }

  @HostListener('window:mousemove', ['$event'])
  onWindowMouseMove(event: MouseEvent): void {
    if (this.isPanning) {
      this.circuitState.panX.set(event.clientX - this.startPanX);
      this.circuitState.panY.set(event.clientY - this.startPanY);
      return;
    }

    if (this.draggingNodeId) {
      const zoom = this.circuitState.zoom();
      const rect = this.canvasRef.nativeElement.getBoundingClientRect();
      const rawX = (event.clientX - rect.left - this.circuitState.panX()) / zoom;
      const rawY = (event.clientY - rect.top - this.circuitState.panY()) / zoom;

      // Snap to 10px grid
      const snapX = Math.round((rawX - this.dragNodeOffsetX) / 10) * 10;
      const snapY = Math.round((rawY - this.dragNodeOffsetY) / 10) * 10;

      this.circuitState.updateNodePosition(this.draggingNodeId, snapX, snapY);
      return;
    }

    // Update connecting wire preview
    if (this.circuitState.connectingWire()) {
      const zoom = this.circuitState.zoom();
      const rect = this.canvasRef.nativeElement.getBoundingClientRect();
      const x = (event.clientX - rect.left - this.circuitState.panX()) / zoom;
      const y = (event.clientY - rect.top - this.circuitState.panY()) / zoom;
      this.circuitState.updateConnectingWire(x, y);
    }
  }

  @HostListener('window:mouseup')
  onWindowMouseUp(): void {
    this.isPanning = false;
    this.draggingNodeId = null;

    if (this.circuitState.connectingWire()) {
      this.circuitState.cancelWireConnection();
    }
  }

  onNodeMouseDown(event: MouseEvent, node: CircuitNode): void {
    event.stopPropagation();
    this.showQuickAddDropdown = false;
    this.contextMenu = null;
    this.circuitState.selectedNodeId.set(node.id);

    const zoom = this.circuitState.zoom();
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const cursorCircuitX = (event.clientX - rect.left - this.circuitState.panX()) / zoom;
    const cursorCircuitY = (event.clientY - rect.top - this.circuitState.panY()) / zoom;

    this.dragNodeOffsetX = cursorCircuitX - node.x;
    this.dragNodeOffsetY = cursorCircuitY - node.y;
    this.draggingNodeId = node.id;
  }

  onDeleteNode(event: MouseEvent, nodeId: string): void {
    event.stopPropagation();
    this.circuitState.removeNode(nodeId);
  }

  // ==========================================
  // Touch Gestures (Touchpad / Mobile)
  // ==========================================

  onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      this.lastTouchX = touch.clientX;
      this.lastTouchY = touch.clientY;
      this.startPanX = touch.clientX - this.circuitState.panX();
      this.startPanY = touch.clientY - this.circuitState.panY();
      this.isPanning = true;
    } else if (event.touches.length === 2) {
      this.isPanning = false;
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      this.initialTouchDistance = Math.hypot(dx, dy);
      this.initialTouchZoom = this.circuitState.zoom();
    }
  }

  onTouchMove(event: TouchEvent): void {
    if (event.touches.length === 1 && this.isPanning) {
      const touch = event.touches[0];
      this.circuitState.panX.set(touch.clientX - this.startPanX);
      this.circuitState.panY.set(touch.clientY - this.startPanY);
    } else if (event.touches.length === 2 && this.initialTouchDistance > 0) {
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      const currentDistance = Math.hypot(dx, dy);
      const ratio = currentDistance / this.initialTouchDistance;
      const newZoom = Math.min(Math.max(this.initialTouchZoom * ratio, 0.3), 3.0);
      this.circuitState.zoom.set(newZoom);
    }
  }

  onTouchEnd(event: TouchEvent): void {
    if (event.touches.length === 0) {
      this.isPanning = false;
      this.draggingNodeId = null;
      this.initialTouchDistance = 0;
    }
  }

  // ==========================================
  // Pin Wire Connection Handlers
  // ==========================================

  onPinMouseDown(event: MouseEvent, node: CircuitNode, pin: Pin, pinType: 'input' | 'output'): void {
    event.stopPropagation();
    const coords = this.getPinCoords(node.id, pin.id, pinType);
    this.circuitState.startWireConnection(node.id, pin.id, pinType, coords.x, coords.y);
  }

  onPinMouseUp(event: MouseEvent, node: CircuitNode, pin: Pin, pinType: 'input' | 'output'): void {
    event.stopPropagation();
    if (this.circuitState.connectingWire()) {
      const connected = this.circuitState.completeWireConnection(node.id, pin.id, pinType);
      if (connected) {
        this.circuitState.showToast('Connected wire');
      }
    }
  }

  onWireClick(event: MouseEvent, wireId: string): void {
    event.stopPropagation();
    this.circuitState.removeWire(wireId);
    this.circuitState.showToast('Removed wire');
  }

  // ==========================================
  // Zoom & Pan Actions
  // ==========================================

  zoomIn(): void {
    this.circuitState.zoom.update((z) => Math.min(z * 1.2, 3.0));
  }

  zoomOut(): void {
    this.circuitState.zoom.update((z) => Math.max(z * 0.8, 0.3));
  }

  resetZoom(): void {
    this.circuitState.zoom.set(1);
    this.circuitState.panX.set(0);
    this.circuitState.panY.set(0);
  }

  fitView(): void {
    const nodes = this.circuitState.nodes();
    if (nodes.length === 0) {
      this.resetZoom();
      return;
    }

    const minX = Math.min(...nodes.map((n) => n.x));
    const maxX = Math.max(...nodes.map((n) => n.x + this.getNodeWidth(n)));
    const minY = Math.min(...nodes.map((n) => n.y));
    const maxY = Math.max(...nodes.map((n) => n.y + 160));

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const padding = 100;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    const zoom = Math.min(Math.max(Math.min(rect.width / width, rect.height / height), 0.5), 1.5);
    const panX = (rect.width - (maxX + minX) * zoom) / 2;
    const panY = (rect.height - (maxY + minY) * zoom) / 2;

    this.circuitState.zoom.set(zoom);
    this.circuitState.panX.set(panX);
    this.circuitState.panY.set(panY);
  }

  // ==========================================
  // Drag & Drop from Sidebar
  // ==========================================

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      const dataStr =
        event.dataTransfer.getData('application/json') ||
        event.dataTransfer.getData('text/plain') ||
        event.dataTransfer.getData('text');

      if (dataStr) {
        try {
          const item = JSON.parse(dataStr);
          const rect = this.canvasRef.nativeElement.getBoundingClientRect();
          const zoom = this.circuitState.zoom();
          const x = (event.clientX - rect.left - this.circuitState.panX()) / zoom;
          const y = (event.clientY - rect.top - this.circuitState.panY()) / zoom;

          this.circuitState.addNode(item.type, x, y, item.customId);
        } catch (e) {
          console.error('Failed to drop item:', e);
        }
      }
    }
  }
}
