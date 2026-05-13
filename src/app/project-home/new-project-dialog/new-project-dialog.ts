import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnChanges,
  output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ProjectService } from '../../../shared/services/project.service';

@Component({
  selector: 'app-new-project-dialog',
  imports: [DialogModule, ButtonModule, InputTextModule, FormsModule],
  templateUrl: './new-project-dialog.html',
  styleUrl: './new-project-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewProjectDialog implements OnChanges {
  readonly visible = input(false);
  readonly visibleChange = output<void>();

  private readonly project = inject(ProjectService);

  protected readonly projectName = signal('Nuovo progetto');
  protected readonly savePath = signal('');
  protected readonly isCreating = signal(false);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true) {
      this.projectName.set('Nuovo progetto');
      this.savePath.set('');
    }
  }

  protected async choosePath(): Promise<void> {
    const filePath = await window.electronAPI.saveProjectDialog(
      `${this.projectName() || 'progetto'}.btproject`
    );
    if (filePath) {
      this.savePath.set(filePath);
    }
  }

  protected async create(): Promise<void> {
    const name = this.projectName().trim();
    const filePath = this.savePath();
    if (!name || !filePath) return;

    this.isCreating.set(true);
    try {
      await this.project.createProject(name, filePath);
      this.visibleChange.emit();
    } finally {
      this.isCreating.set(false);
    }
  }

  protected cancel(): void {
    this.visibleChange.emit();
  }

  protected get canCreate(): boolean {
    return !!this.projectName().trim() && !!this.savePath();
  }
}
