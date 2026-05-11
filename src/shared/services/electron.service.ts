import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ElectronService {
  openDialog(): Promise<readonly string[]> {
    return window.electronAPI.openDialog();
  }
}
