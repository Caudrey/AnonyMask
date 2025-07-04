import { Routes } from '@angular/router';
import { MaskingFile } from './masking-file/masking-file';
import { UnmaskingFile } from './unmasking-file/unmasking-file';

export const routes: Routes = [
  { path: '', redirectTo: 'masking', pathMatch: 'full' }, // home page = masking
  { path: 'masking', component: MaskingFile },
  { path: 'unmasking', component: UnmaskingFile }
];
