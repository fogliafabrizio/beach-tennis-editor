import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastModule } from 'primeng/toast';
import { ClipList } from './layout/clip-list/clip-list';
import { Timeline } from './timeline/timeline';
import { VideoPlayer } from './video-player/video-player';
import { ProjectHome } from './project-home/project-home';
import { ExportSettings } from './export/export-settings/export-settings';
import { ProjectService } from '../shared/services/project.service';

@Component({
  selector: 'app-root',
  imports: [ClipList, VideoPlayer, Timeline, ProjectHome, ExportSettings, ToastModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly project = inject(ProjectService);
}
