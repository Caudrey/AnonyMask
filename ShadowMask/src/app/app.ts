import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { invoke } from '@tauri-apps/api/core';
import { NavBar } from './nav-bar/nav-bar';

@Component({
  selector: 'app-root',
  imports: [FormsModule, NavBar],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'ShadowMask';

  // result = '';

  // callRust() {
  //   invoke<string>('greet', { name: 'Angular Developer' })
  //     .then(response => this.result = response)
  //     .catch(err => console.error(err));
  // }

  name = '';
  message = '';

  async greet() {
    this.message = await invoke('greet', { name: this.name });
  }
}
