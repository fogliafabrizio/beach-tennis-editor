import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import type { VideoClip } from '../../../shared/models/video-clip';
import { LibraryService } from '../../../shared/services/library.service';
import { basename } from '../../../shared/utils/basename';
import { formatDuration } from '../../../shared/utils/format-duration';
import { getEffectiveDuration } from '../../../shared/utils/get-effective-duration';

@Component({
  selector: 'app-clip-list',
  templateUrl: './clip-list.html',
  styleUrl: './clip-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClipList {
  private readonly library = inject(LibraryService);

  readonly clips = this.library.clips;
  readonly isEmpty = this.library.isEmpty;

  label(filePath: string): string {
    return basename(filePath);
  }

  duration(clip: VideoClip): string {
    return formatDuration(getEffectiveDuration(clip));
  }
}
