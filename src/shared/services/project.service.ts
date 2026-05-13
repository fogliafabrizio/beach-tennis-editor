import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import type { BtProject, ExportSettings, RecentProject } from '../models/project';
import { DEFAULT_EXPORT_SETTINGS } from '../models/project';
import { ElectronService } from './electron.service';
import { LibraryService } from './library.service';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly electron = inject(ElectronService);
  private readonly library = inject(LibraryService);

  private readonly currentProjectSignal = signal<BtProject | null>(null);
  private readonly recentProjectsSignal = signal<readonly RecentProject[]>([]);
  private readonly isSavingSignal = signal(false);

  readonly currentProject: Signal<BtProject | null> = this.currentProjectSignal.asReadonly();
  readonly recentProjects: Signal<readonly RecentProject[]> =
    this.recentProjectsSignal.asReadonly();
  readonly isSaving: Signal<boolean> = this.isSavingSignal.asReadonly();
  readonly isEditorOpen = computed(() => this.currentProjectSignal() !== null);

  readonly exportSettings = computed<ExportSettings>(
    () => this.currentProjectSignal()?.exportSettings ?? DEFAULT_EXPORT_SETTINGS
  );

  async initialize(): Promise<void> {
    const recent = await this.electron.listRecentProjects();
    this.recentProjectsSignal.set(recent);
  }

  async createProject(name: string, filePath: string): Promise<void> {
    const project = await this.electron.createProject(name, filePath);
    this.library.clear();
    this.currentProjectSignal.set(project);
  }

  async openProject(filePath: string): Promise<void> {
    const project = await this.electron.loadProject(filePath);
    this.library.loadClips(project.clips);
    this.currentProjectSignal.set(project);
    // Aggiorna la lista dei recenti
    const recent = await this.electron.listRecentProjects();
    this.recentProjectsSignal.set(recent);
  }

  async saveProject(): Promise<void> {
    const project = this.currentProjectSignal();
    if (!project) return;
    this.isSavingSignal.set(true);
    try {
      const updated: BtProject = {
        ...project,
        clips: this.library.clips(),
        savedAt: new Date().toISOString(),
      };
      await this.electron.saveProject(updated);
      this.currentProjectSignal.set(updated);
      const recent = await this.electron.listRecentProjects();
      this.recentProjectsSignal.set(recent);
    } finally {
      this.isSavingSignal.set(false);
    }
  }

  updateExportSettings(settings: ExportSettings): void {
    const project = this.currentProjectSignal();
    if (!project) return;
    this.currentProjectSignal.set({ ...project, exportSettings: settings });
  }
}
