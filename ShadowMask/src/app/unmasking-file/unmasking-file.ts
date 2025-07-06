import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph } from 'docx';

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
  mappingLogJsonFileName: string = '';
  processedMaskedFileName: string = '';

  originalText: string = '';
  maskedText: string = '';
  processedText: string = '';
  unmaskedResult: string = '';
  processedFileRawName: string = '';

  originalContent: string = '';
  maskedContent: string = '';

  originalTokensWithDiff: { word: string, changed: boolean }[] = [];
  maskedTokensWithDiff: { word: string, changed: boolean }[] = [];
  processedTokensWithDiff: { word: string, changed: boolean }[] = [];
  resultTokensWithDiff: { word: string, changed: boolean }[] = [];

  maskedMapping: { original: string; masked: string }[] = [];

  resultContent: string = '';

  constructor() {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString();
  }

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

    if (!input.files?.[0]) return;

    const supportedTypes = [
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];

    // 🔒 Reject unsupported file types BEFORE any processing
    if (!supportedTypes.includes(input.files?.[0].type)) {
      alert(`❌ Unsupported file type: ${input.files?.[0].name}\nPlease upload a .txt, .pdf, .docx, .xlsx, .xls, or .csv file.`);
      input.value = '';
      this.fileReady = false;

      if (type === 'original') {
          this.originalFileName = '';
      } else if (type === 'masked') {
        this.maskedFileName = '';
      } else if (type === 'processed') {
        this.processedMaskedFileName = '';
      }
      return;
    }

    const file = input.files[0];
    const fileName = file.name;
    const fileType = file.type;
    const reader = new FileReader();
    let content = '';
    // if (this.originalFileName && this.maskedFileName && this.processedMaskedFileName) {
    //   this.fileReady = true;
    //   this.isGenerating = true;
    //   setTimeout(() => {
    //     this.resultContent = 'Unmasked file content based on uploaded files...';
    //     this.isGenerating = false;
    //   }, 2000); // simulate processing
    // }

    // TXT
    if (fileType === supportedTypes[0]) {
      reader.onload = () => {
        content = reader.result as string;
        this.processContent(fileName, type, content);
      };
      reader.readAsText(file);

    // PDF
    } else if (fileType === supportedTypes[1]) {
      reader.onload = async () => {
        const typedArray = new Uint8Array(reader.result as ArrayBuffer);
        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();

          const strings: string[] = [];
          let lastY: number | null = null;

          (content.items as any[]).forEach((item) => {
            const text = item.str;
            const y = item.transform[5];

            if (lastY !== null && Math.abs(y - lastY) > 5) {
              strings.push('\n'); // new line

              // if empty line, add new line
              if(Math.abs(y - lastY) > 25){
                strings.push('\n');
              }
            }

            strings.push(text);
            lastY = y;
          });
          text += strings.join('') + '\n';
        }
        content = text;
        this.processContent(fileName, type, content);
      };
      reader.readAsArrayBuffer(file);

    // DOCX
    } else if ( fileType === supportedTypes[2]) {
      reader.onload = async () => {
        const result = await mammoth.extractRawText({ arrayBuffer: reader.result as ArrayBuffer });
        content = result.value.replace(/\n\n/g, '\n');
        this.processContent(fileName, type, content);
      };

      reader.readAsArrayBuffer(file);

    // XLSX / XLS / CSV
    } else if (
      fileType === supportedTypes[3] ||
      fileType === supportedTypes[4] || fileType === supportedTypes[5]
    ) {
      reader.onload = (e) => {
        const data = new Uint8Array(reader.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        let result = '';
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]; // array of arrays

          result += `Sheet: ${sheetName}\n`;

          if (jsonData.length > 0) {
            const headers = jsonData[0];
            const rows = jsonData.slice(1);

            headers.forEach((header: string, index: number) => {
              const values = rows.map(row => row[index]).filter(v => v !== undefined && v !== null);
              result += `${header}: ${values.join(' | ')}.\n`;
            });
          }

          result += '\n';
        });

        // let result = '';
        // workbook.SheetNames.forEach(sheetName => {
        //   const worksheet = workbook.Sheets[sheetName];
        //   const sheetData = XLSX.utils.sheet_to_txt(worksheet); // or .sheet_to_txt
        //   const viewDataExcel = XLSX.utils.sheet_to_txt(worksheet); // or .sheet_to_txt
        //   result += `Sheet: ${sheetName}\n${sheetData}\n\n`;
        // });

        content = result;
        this.processContent(fileName, type, content);
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert('Unsupported file type. Please upload .txt, .pdf, or .docx');
    }
  }

  processContent(fileName: string, type: string, content: string): void {
    // if (type === 'original') {
    //   this.originalFileName = fileName;
    //   this.originalText = content;
    //   this.originalContent = content;
    // }

    // if (type === 'masked') {
    //   this.maskedFileName = fileName;
    //   this.maskedText = content;
    //   this.maskedContent = content;
    // }

    if (type === 'processed') {
      this.processedMaskedFileName = fileName;
      this.processedFileRawName = fileName;
      this.processedText = content;
    }
    this.processUnmasking();
    // if (this.originalText && this.maskedText && this.processedText) {
    //   this.fileReady = true;
    //   this.isGenerating = true;

    //   setTimeout(() => {
    //     const originalTokens = this.originalText.trim().split(/\s+/);
    //     const maskedTokens = this.maskedText.trim().split(/\s+/);
    //     const processedTokens = this.processedText.trim().split(/\s+/);

    //     const mapping: { masked: string; original: string }[] = [];
    //     for (let i = 0; i < Math.min(originalTokens.length, maskedTokens.length); i++) {
    //       if (originalTokens[i] !== maskedTokens[i]) {
    //         mapping.push({ masked: maskedTokens[i], original: originalTokens[i] });
    //       }
    //     }

    //     const mappingUsed: { [key: number]: boolean } = {};
    //     const resultTokens = processedTokens.map(token => {
    //       const matchIndex = mapping.findIndex(
    //         (pair, idx) => pair.masked === token && !mappingUsed[idx]
    //       );
    //       if (matchIndex !== -1) {
    //         mappingUsed[matchIndex] = true;
    //         return mapping[matchIndex].original;
    //       }
    //       return token;
    //     });

    //     this.maskedMapping = mapping.map(pair => ({
    //       original: pair.original,
    //       masked: pair.masked
    //     }));

    //     this.unmaskedResult = resultTokens.join(' ');
    //     this.resultContent = this.unmaskedResult;
    //     this.isGenerating = false;

    //     const originalWords = this.originalText.trim().split(/\s+/);
    //     const maskedWords = this.maskedText.trim().split(/\s+/);

    //     this.originalTokensWithDiff = [];
    //     this.maskedTokensWithDiff = [];

    //     const len = Math.max(originalWords.length, maskedWords.length);

    //     for (let i = 0; i < len; i++) {
    //       const oWord = originalWords[i] || '';
    //       const mWord = maskedWords[i] || '';
    //       const changed = oWord !== mWord;

    //       this.originalTokensWithDiff.push({ word: oWord, changed });
    //       this.maskedTokensWithDiff.push({ word: mWord, changed });
    //     }

    //     const resultWords = this.unmaskedResult.trim().split(/\s+/);
    //     this.processedTokensWithDiff = [];
    //     this.resultTokensWithDiff = [];

    //     const len2 = Math.max(processedTokens.length, resultWords.length);
    //     for (let i = 0; i < len2; i++) {
    //       const pWord = processedTokens[i] || '';
    //       const rWord = resultWords[i] || '';
    //       const changed = pWord !== rWord;

    //       this.processedTokensWithDiff.push({ word: pWord, changed });
    //       this.resultTokensWithDiff.push({ word: rWord, changed });
    //     }

    //   }, 500);
    // }
  };

  onDownload(): void {
    console.log('Downloading unmasked result...');
    // Add logic to trigger file download

    if (!this.unmaskedResult) {
      alert('No file to download.');
      return;
    }

    const extension = this.processedMaskedFileName.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'txt':
        this.downloadTextFile();
        break;
      case 'pdf':
        this.downloadPdfFile();
        break;
      case 'docx':
          this.downloadDocxFile();
          break;
      case 'csv':
        this.downloadCsvFile();
        break;
      case 'xls':
        this.downloadXlsFile();
        break;
      case 'xlsx':
        this.downloadXlsxFile();
        break;
      default:
        alert('Unsupported file type for download.');
    }
  }

  downloadTextFile(): void {
    const blob = new Blob([this.unmaskedResult], { type: 'text/plain' });
    this.triggerDownload(blob, this.processedMaskedFileName);
  }

  downloadPdfFile(): void {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);

    const margin = 20;
    const lineHeight = 8;
    const maxY = 290; // bottom page limit
    const maxWidth = doc.internal.pageSize.getWidth() - 2 * margin;

    let y = margin;
    const lines = this.unmaskedResult.split('\n');

    lines.forEach(line => {
      const wrapped = doc.splitTextToSize(line, maxWidth);
      wrapped.forEach((wrapLine: string) => {
        if (y + lineHeight > maxY) {
          doc.addPage();
          y = margin;
        }
        doc.text(wrapLine, margin, y);
        y += lineHeight;
      });
    });

    doc.save('unmasked_' + this.processedMaskedFileName);
  }

  downloadDocxFile(): void {
    const doc = new Document({
      sections: [{
        properties: {},
        children: this.unmaskedResult
          .split('\n')
          .map(line => new Paragraph(line))
      }]
    });

    Packer.toBlob(doc).then(blob => {
      this.triggerDownload(blob, this.processedMaskedFileName);
    });
  }

  downloadXlsxFile(): void {
    if (!this.unmaskedResult) return;

    const sheets = this.unmaskedResult.split(/Sheet:\s+/).filter(s => s.trim());
    const workbook = XLSX.utils.book_new();

    sheets.forEach(sheetBlock => {
      const [sheetNameLine, ...lines] = sheetBlock.trim().split('\n');
      const sheetName = sheetNameLine.trim();

      const rows = lines
        .filter(line => line.trim())
        .map(line => line.split(','));

      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const downloadName = this.processedMaskedFileName.replace(/\.[^/.]+$/, '') + '.xlsx';
    this.triggerDownload(blob, downloadName);
  }

  downloadXlsFile(): void {
    if (!this.unmaskedResult) return;

    const sheets = this.unmaskedResult.split(/Sheet:\s+/).filter(s => s.trim());
    const workbook = XLSX.utils.book_new();

    sheets.forEach(sheetBlock => {
      const [sheetNameLine, ...lines] = sheetBlock.trim().split('\n');
      const sheetName = sheetNameLine.trim();
      const rows = lines.map(line => line.split(','));
      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    const wbout = XLSX.write(workbook, { bookType: 'xls', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.ms-excel',
    });

    const downloadName = this.processedMaskedFileName.replace(/\.[^/.]+$/, '') + '.xls';
    this.triggerDownload(blob, downloadName);
  }

  downloadCsvFile(): void {
    if (!this.unmaskedResult) return;

    const sheetBlocks = this.unmaskedResult.split(/Sheet:\s+/).filter(s => s.trim());

    sheetBlocks.forEach(sheetBlock => {
      const [sheetNameLine, ...lines] = sheetBlock.trim().split('\n');
      const sheetName = sheetNameLine.trim();
      const csvData = lines.join('\n');

      const blob = new Blob([csvData], { type: 'text/csv' });
      const downloadName =  this.processedMaskedFileName.replace(/\.[^/.]+$/, '') + '.csv';
      this.triggerDownload(blob, downloadName);
    });
  }


  triggerDownload(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'unmasked_' + filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  uploadUnmaskingJson(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.[0]) return;

    this.mappingLogJsonFileName = input.files[0].name;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);

        if (!Array.isArray(parsed.mapping)) {
          alert("❌ Invalid JSON format: missing 'mapping' array.");
          return;
        }

        this.maskedMapping = parsed.mapping
          .filter((item: any) => item.original && item.masked)
          .map((item: any) => ({ original: item.original, masked: item.masked }));
        this.processUnmasking();
      } catch (err) {
        alert("❌ Invalid JSON file");
      }
    };
    reader.readAsText(input.files[0]);
  }

  processUnmasking(): void {
    if (!this.maskedMapping.length || !this.processedText) return;

    this.fileReady = false;
    this.isGenerating = true;

    setTimeout(() => {
      let unmasked = this.processedText;

      // Replace full masked phrases (case sensitive exact match)
      this.maskedMapping.forEach(pair => {
        const masked = pair.masked;
        const original = pair.original;

        const escapedMasked = masked.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // escape regex

        // If masked word is long or contains brackets/symbols, allow in-word replacement
        const isSafeToReplaceAnywhere = masked.length > 2 || /\W/.test(masked); // non-word character like [ ] or special chars

        const regex = isSafeToReplaceAnywhere
          ? new RegExp(escapedMasked, 'g')                       // replace anywhere
          : new RegExp(`\\b${escapedMasked}\\b`, 'g');           // word boundary only for short masked word

        unmasked = unmasked.replace(regex, original);
      });

      this.unmaskedResult = unmasked;
      this.resultContent = this.unmaskedResult;

      // Optional: highlight changes
      const processedTokens = this.processedText.trim().split(/\s+/);
      const resultTokens = this.unmaskedResult.trim().split(/\s+/);

      this.processedTokensWithDiff = [];
      this.resultTokensWithDiff = [];

      const len = Math.max(processedTokens.length, resultTokens.length);
      for (let i = 0; i < len; i++) {
        const pWord = processedTokens[i] || '';
        const rWord = resultTokens[i] || '';
        const changed = pWord !== rWord;

        this.processedTokensWithDiff.push({ word: pWord, changed });
        this.resultTokensWithDiff.push({ word: rWord, changed });
      }

      this.fileReady = true;
      this.isGenerating = false;
    }, 300);
  }

}
