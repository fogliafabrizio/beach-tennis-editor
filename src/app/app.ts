import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ClipList } from './layout/clip-list/clip-list';
import { ImportButton } from './layout/import-button/import-button';
import { Timeline } from './timeline/timeline';
import { VideoPlayer } from './video-player/video-player';
import { LibraryService } from '../shared/services/library.service';

@Component({
  selector: 'app-root',
  imports: [ImportButton, ClipList, VideoPlayer, Timeline],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly library = inject(LibraryService);
  protected readonly isEmpty = this.library.isEmpty;
}
