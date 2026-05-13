import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import type { VideoClip } from '../../../shared/models/video-clip';
import { LibraryService } from '../../../shared/services/library.service';
import { basename } from '../../../shared/utils/basename';
import { formatDuration } from '../../../shared/utils/format-duration';
import { getEffectiveDuration } from '../../../shared/utils/get-effective-duration';

@Component({
  selector: 'app-clip-list',
  imports: [ButtonModule],
  templateUrl: './clip-list.html',
  styleUrl: './clip-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClipList {
  protected readonly library = inject(LibraryService);

  readonly clips = this.library.clips;
  readonly isEmpty = this.library.isEmpty;
  readonly isImporting = this.library.isImporting;

  label(filePath: string): string {
    return basename(filePath);
  }

  duration(clip: VideoClip): string {
    return formatDuration(getEffectiveDuration(clip));
  }

  async import(): Promise<void> {
    await this.library.importFromDialog();
  }

  remove(id: string): void {
    this.library.removeClip(id);
  }
}
