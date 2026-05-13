import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import type { BtProject, ExportSettings, RecentProject } from '../models/project';
import { DEFAULT_EXPORT_SETTINGS, PROJECT_VERSION } from '../models/project';
import type { Match } from '../models/match';
import { ElectronService } from './electron.service';
import { LibraryService } from './library.service';
import { migrateProject } from './project-migration';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly electron = inject(ElectronService);
  private readonly library = inject(LibraryService);
  private readonly messages = inject(MessageService);

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

  readonly currentMatch = computed<Match | null>(
    () => this.currentProjectSignal()?.match ?? null
  );

  async initialize(): Promise<void> {
    const recent = await this.electron.listRecentProjects();
    this.recentProjectsSignal.set(recent);
  }

  async createProject(name: string, filePath: string): Promise<void> {
    const raw = await this.electron.createProject(name, filePath);
    const project = migrateProject(raw);
    this.library.clear();
    this.currentProjectSignal.set(project);
  }

  async openProject(filePath: string): Promise<void> {
    const raw = await this.electron.loadProject(filePath);
    const project = migrateProject(raw);
    this.library.loadClips(project.match.clips);
    this.currentProjectSignal.set(project);
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
        version: PROJECT_VERSION,
        match: {
          ...project.match,
          clips: this.library.clips(),
        },
        savedAt: new Date().toISOString(),
      };
      await this.electron.saveProject(updated);
      this.currentProjectSignal.set(updated);
      const recent = await this.electron.listRecentProjects();
      this.recentProjectsSignal.set(recent);
      this.messages.add({
        severity: 'success',
        summary: 'Progetto salvato',
        detail: updated.projectName,
      });
    } catch (err) {
      this.messages.add({
        severity: 'error',
        summary: 'Salvataggio fallito',
        detail: err instanceof Error ? err.message : 'Errore sconosciuto',
        life: 6000,
      });
      throw err;
    } finally {
      this.isSavingSignal.set(false);
    }
  }

  updateExportSettings(settings: ExportSettings): void {
    const project = this.currentProjectSignal();
    if (!project) return;
    this.currentProjectSignal.set({ ...project, exportSettings: settings });
  }

  updateMatch(updater: (match: Match) => Match): void {
    const project = this.currentProjectSignal();
    if (!project) return;
    this.currentProjectSignal.set({ ...project, match: updater(project.match) });
  }
}
