import { Component } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MaskingFile } from '../masking-file/masking-file';

const routes: Routes = [
  { path: '', redirectTo: 'masking', pathMatch: 'full' },
  { path: 'masking', component: MaskingFile },
  // You can add more pages here
];

@Component({
  selector: 'app-nav-bar',
  imports: [RouterModule],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.scss'
})
export class NavBar {

}
