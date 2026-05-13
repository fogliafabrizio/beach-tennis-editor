import { Injectable } from '@angular/core';
import type { BtProject, RecentProject } from '../models/project';

@Injectable({ providedIn: 'root' })
export class ElectronService {
  openDialog(): Promise<readonly string[]> {
    return window.electronAPI.openDialog();
  }

  openProjectDialog(): Promise<string | null> {
    return window.electronAPI.openProjectDialog();
  }

  saveProjectDialog(defaultName: string): Promise<string | null> {
    return window.electronAPI.saveProjectDialog(defaultName);
  }

  saveOutputDialog(defaultName: string): Promise<string | null> {
    return window.electronAPI.saveOutputDialog(defaultName);
  }

  async createProject(name: string, filePath: string): Promise<unknown> {
    return window.electronAPI.createProject(name, filePath);
  }

  async saveProject(project: BtProject): Promise<void> {
    return window.electronAPI.saveProject(project);
  }

  async loadProject(filePath: string): Promise<unknown> {
    return window.electronAPI.loadProject(filePath);
  }

  async listRecentProjects(): Promise<RecentProject[]> {
    return window.electronAPI.listRecentProjects() as Promise<RecentProject[]>;
  }
}
