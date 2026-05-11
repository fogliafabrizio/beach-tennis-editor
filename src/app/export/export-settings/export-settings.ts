import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import type { ExportSettings as ExportSettingsModel } from '../../../shared/models/project';
import { LibraryService } from '../../../shared/services/library.service';
import { ProjectService } from '../../../shared/services/project.service';

@Component({
  selector: 'app-export-settings',
  imports: [ButtonModule, InputNumberModule, SelectModule, FormsModule],
  templateUrl: './export-settings.html',
  styleUrl: './export-settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportSettings {
  protected readonly project = inject(ProjectService);
  protected readonly library = inject(LibraryService);

  protected readonly isExpanded = signal(false);

  protected readonly settings = this.project.exportSettings;

  protected readonly formatOptions = [{ label: 'MP4', value: 'mp4' }];

  protected readonly firstClipSize = computed(() => {
    const clip = this.library.clips()[0];
    return clip ? { width: clip.width, height: clip.height } : null;
  });

  protected toggleExpand(): void {
    this.isExpanded.update((v) => !v);
  }

  protected updateField<K extends keyof ExportSettingsModel>(
    key: K,
    value: ExportSettingsModel[K]
  ): void {
    this.project.updateExportSettings({ ...this.settings(), [key]: value });
  }

  protected useFirstClip(): void {
    const size = this.firstClipSize();
    if (!size) return;
    const updated = {
      ...this.settings(),
      width: size.width || 1920,
      height: size.height || 1080,
    };
    this.project.updateExportSettings(updated);
  }

  protected async browseOutputPath(): Promise<void> {
    const filePath = await window.electronAPI.saveOutputDialog('video-output.mp4');
    if (filePath) {
      this.updateField('outputPath', filePath);
    }
  }
}
