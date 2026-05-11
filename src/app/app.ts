import { Component } from '@angular/core';
import { ClipList } from './layout/clip-list/clip-list';
import { ImportButton } from './layout/import-button/import-button';

@Component({
  selector: 'app-root',
  imports: [ImportButton, ClipList],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
