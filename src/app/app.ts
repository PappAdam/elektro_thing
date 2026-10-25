import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './components/header/header.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { CanvasComponent } from './components/canvas/canvas.component';
import { TruthTableModalComponent } from './components/truth-table-modal/truth-table-modal.component';
import { CustomGateModalComponent } from './components/custom-gate-modal/custom-gate-modal.component';
import { SavedTablesDrawerComponent } from './components/saved-tables-drawer/saved-tables-drawer.component';
import { PackageModalComponent } from './components/package-modal/package-modal.component';
import { TruthTable } from './models/circuit.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    SidebarComponent,
    CanvasComponent,
    TruthTableModalComponent,
    CustomGateModalComponent,
    SavedTablesDrawerComponent,
    PackageModalComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly activeTruthTable = signal<TruthTable | null>(null);
  readonly showCustomGateModal = signal<boolean>(false);
  readonly showPackageModal = signal<boolean>(false);
  readonly showSavedTablesDrawer = signal<boolean>(false);

  openTruthTable(table: TruthTable): void {
    this.activeTruthTable.set(table);
  }

  closeTruthTable(): void {
    this.activeTruthTable.set(null);
  }

  viewSavedTable(table: TruthTable): void {
    this.showSavedTablesDrawer.set(false);
    this.activeTruthTable.set(table);
  }
}
