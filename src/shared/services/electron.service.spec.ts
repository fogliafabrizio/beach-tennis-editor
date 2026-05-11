import { TestBed } from '@angular/core/testing';
import { ElectronService } from './electron.service';

describe('ElectronService', () => {
  const originalApi = window.electronAPI;

  afterEach(() => {
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      writable: true,
      value: originalApi,
    });
  });

  function installApi(api: Partial<typeof window.electronAPI>): void {
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      writable: true,
      value: api as typeof window.electronAPI,
    });
  }

  it('delegates openDialog to window.electronAPI and returns the paths', async () => {
    const openDialog = jest.fn().mockResolvedValue(['/a.mp4', '/b.mp4']);
    installApi({ openDialog });

    const svc = TestBed.inject(ElectronService);
    const result = await svc.openDialog();

    expect(openDialog).toHaveBeenCalledTimes(1);
    expect(result).toEqual(['/a.mp4', '/b.mp4']);
  });
});
