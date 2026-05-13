import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { LibraryService } from '../../../shared/services/library.service';

@Component({
  selector: 'app-import-button',
  imports: [ButtonModule],
  templateUrl: './import-button.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportButton {
  private readonly library = inject(LibraryService);

  readonly isImporting = this.library.isImporting;

  async onClick(): Promise<void> {
    await this.library.importFromDialog();
  }
}
