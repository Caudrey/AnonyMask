import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-unmasking-file',
  imports: [CommonModule],
  templateUrl: './unmasking-file.html',
  styleUrl: './unmasking-file.scss'
})
export class UnmaskingFile {
fileReady = false;
  isGenerating = false;

  originalFileName: string = '';
  maskedFileName: string = '';
  processedMaskedFileName: string = '';

  resultContent: string = '';

  uploadOriginal(event: Event): void {
    this.handleUpload(event, 'original');
  }

  uploadMasked(event: Event): void {
    this.handleUpload(event, 'masked');
  }

  uploadProcessedMasked(event: Event): void {
    this.handleUpload(event, 'processed');
  }

  private handleUpload(event: Event, type: 'original' | 'masked' | 'processed') {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      const fileName = input.files[0].name;
      if (type === 'original') this.originalFileName = fileName;
      if (type === 'masked') this.maskedFileName = fileName;
      if (type === 'processed') this.processedMaskedFileName = fileName;

      if (this.originalFileName && this.maskedFileName && this.processedMaskedFileName) {
        this.fileReady = true;
        this.isGenerating = true;
        setTimeout(() => {
          this.resultContent = 'Unmasked file content based on uploaded files...';
          this.isGenerating = false;
        }, 2000); // simulate processing
      }
    }
  }

  onDownload(): void {
    console.log('Downloading unmasked result...');
    // Add logic to trigger file download
  }
}
