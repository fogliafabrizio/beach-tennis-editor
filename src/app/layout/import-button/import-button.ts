import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LibraryService } from '../../../shared/services/library.service';

@Component({
  selector: 'app-import-button',
  templateUrl: './import-button.html',
  styleUrl: './import-button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportButton {
  private readonly library = inject(LibraryService);

  readonly isImporting = this.library.isImporting;

  async onClick(): Promise<void> {
    await this.library.importFromDialog();
  }
}
