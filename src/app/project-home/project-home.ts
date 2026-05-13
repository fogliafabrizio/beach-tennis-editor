import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { NewProjectDialog } from './new-project-dialog/new-project-dialog';
import { ProjectService } from '../../shared/services/project.service';
import type { RecentProject } from '../../shared/models/project';

@Component({
  selector: 'app-project-home',
  imports: [ButtonModule, CardModule, NewProjectDialog],
  templateUrl: './project-home.html',
  styleUrl: './project-home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectHome implements OnInit {
  protected readonly project = inject(ProjectService);
  protected readonly showNewDialog = signal(false);

  ngOnInit(): void {
    this.project.initialize();
  }

  protected openNewDialog(): void {
    this.showNewDialog.set(true);
  }

  protected onDialogClose(): void {
    this.showNewDialog.set(false);
  }

  protected async openProject(recent: RecentProject): Promise<void> {
    await this.project.openProject(recent.filePath);
  }

  protected async openProjectDialog(): Promise<void> {
    const electron = (window as Window & typeof globalThis).electronAPI;
    const filePath = await electron.openProjectDialog();
    if (filePath) {
      await this.project.openProject(filePath);
    }
  }

  protected formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  }
}
