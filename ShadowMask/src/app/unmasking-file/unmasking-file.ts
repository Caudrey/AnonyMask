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

  originalText: string = '';
  maskedText: string = '';
  processedText: string = '';
  unmaskedResult: string = '';
  processedFileRawName: string = '';


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

      // if (this.originalFileName && this.maskedFileName && this.processedMaskedFileName) {
      //   this.fileReady = true;
      //   this.isGenerating = true;
      //   setTimeout(() => {
      //     this.resultContent = 'Unmasked file content based on uploaded files...';
      //     this.isGenerating = false;
      //   }, 2000); // simulate processing
      // }

      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result as string;
        if (type === 'original') {
          this.originalText = content;
        } else if (type === 'masked') {
          this.maskedText = content;
        } else if (type === 'processed') {
          this.processedText = content;
          this.processedFileRawName = fileName;
        }

        if (this.originalText && this.maskedText && this.processedText) {
          this.fileReady = true;
          this.isGenerating = true;

          setTimeout(() => {
            const originalTokens = this.originalText.trim().split(/\s+/);
            const maskedTokens = this.maskedText.trim().split(/\s+/);
            const processedTokens = this.processedText.trim().split(/\s+/);

            const mapping: { masked: string; original: string }[] = [];
            for (let i = 0; i < Math.min(originalTokens.length, maskedTokens.length); i++) {
              if (originalTokens[i] !== maskedTokens[i]) {
                mapping.push({ masked: maskedTokens[i], original: originalTokens[i] });
              }
            }

            const mappingUsed: { [key: number]: boolean } = {};
            const resultTokens = processedTokens.map(token => {
              const matchIndex = mapping.findIndex(
                (pair, idx) => pair.masked === token && !mappingUsed[idx]
              );
              if (matchIndex !== -1) {
                mappingUsed[matchIndex] = true;
                return mapping[matchIndex].original;
              }
              return token;
            });

            this.unmaskedResult = resultTokens.join(' ');
            this.resultContent = this.unmaskedResult;
            this.isGenerating = false;
          }, 500);
        }
      };
      reader.readAsText(input.files[0]);
    }
  }


  onDownload(): void {
    console.log('Downloading unmasked result...');
    // Add logic to trigger file download

    const blob = new Blob([this.unmaskedResult], { type: 'text/plain' });
    const a = document.createElement('a');
    const filename = `UNMASKED_${this.processedMaskedFileName}`;
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
