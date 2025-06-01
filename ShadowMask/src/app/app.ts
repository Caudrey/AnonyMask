import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { invoke } from '@tauri-apps/api/core';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FormsModule],
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
