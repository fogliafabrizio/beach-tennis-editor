import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { App } from './app';
import { ElectronService } from '../shared/services/electron.service';

const mockElectronService = {
  openDialog: jest.fn().mockResolvedValue([]),
  openProjectDialog: jest.fn().mockResolvedValue(null),
  saveProjectDialog: jest.fn().mockResolvedValue(null),
  saveOutputDialog: jest.fn().mockResolvedValue(null),
  createProject: jest.fn().mockResolvedValue(null),
  saveProject: jest.fn().mockResolvedValue(undefined),
  loadProject: jest.fn().mockResolvedValue(null),
  listRecentProjects: jest.fn().mockResolvedValue([]),
};

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: ElectronService, useValue: mockElectronService },
        MessageService,
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the app title in the project home screen', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Beach Tennis Editor');
  });
});
