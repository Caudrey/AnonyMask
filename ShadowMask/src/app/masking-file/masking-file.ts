import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph } from 'docx';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '../services/api';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface HighlightRange {
  start: number;
  end: number;
  text: string;
}

@Component({
  selector: 'app-masking-file',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './masking-file.html',
  styleUrl: './masking-file.scss',
})
export class MaskingFile implements OnInit {
  fileReady = false;
  fileName: string = '';
  maskedContent = '';
  originalContent = '';
  isGenerating = false;

  // originalContent = 'My phone number is 123-456-7890 and my email is john@example.com';
  // maskedContent = 'My phone number is ***-***-**** and my email is ****@example.com';

  searchTermsUser: string[] = [];
  replacementTermsUser: string[] = [];

  searchTermsCategory: string[] = [];
  categoryFromModel: string[] = [];
  categoryCounts: Record<string, number> = {};
  replacementTermsCategory: string[] = [];

  searchTermsAllRandomized: string[] = [];

  searchTermsDataRandomized: string[] = [];
  replacementTermsRandomized: string[] = [];

  replacementLog: { original: string; replaced: string }[] = [];

  randomizedPreview: Array<{ ori: string; type: string; result: string }> = [];

  allRandomizedPreview: Array<{ ori: string; type: string; result: string }> =
    [];

  activePreviewType: 'category' | 'value' | 'all' | 'same' | null = null;

  categoryOnlyTable: Array<{
    ori: string;
    type: string;
    masked: string;
    count: number;
  }> = [];

  valueOnlyTable: Array<{ ori: string; type: string; masked: string }> = [];

  selectedMaskType: 'partial' | 'full' | null = null;

  clickedPartialButton: string | null = null;

  partialMaskedStats: {
    word: string;
    count: number;
    format?: string;
    originalMatchedWords?: string;
  }[] = [];
  maskedTokensWithDiff: { word: string; changed: boolean }[] = [];
  originalTokensWithDiff: { word: string; changed: boolean }[] = [];

  clickedButton: string = '';
  selectedModel: 'explicit' | 'implicit' = 'explicit';

  draggedSelections: string[] = [];

  currentSelected: string = '';
  highlightedContent: string = '';

  isAdding: boolean = false;

  highlightedMaskedContent: string = '';

  aiDetectedPii: { original: string; category: string; replaced: string }[] =
    [];

  constructor(private apiService: ApiService, private cdr: ChangeDetectorRef) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  }

  ngOnInit(): void {
    // this.originalContent = `Hi
    // my email
    //   is john@example.com
    //   and phone is 1234567890.
    //   My name is Alice.
    //   Her name is Alice.
    //   Makan nasi.
    //   Dia lahir pada 1990-05-10.
    //   Alamatnya adalah Jalan Merdeka No. 10.
    //   Gaji per bulan 5000000.
    //   Nomor rekening 123456789.
    //   Berat badan 65 kg, tinggi 170 cm.
    //   Tekanan darah 120/80 mmHg.
    //   Plat nomor B 1234 ABC.`;
    // this.maskedContent = '[MASKED]'; // Ini akan di-update oleh processOriginalContent
    // this.replacementLog = []; // Kosongkan, akan diisi dari API

    // this.fileReady = true;

    this.processOriginalContent();

    if (this.replacementLog.length === 0) {
      console.warn(
        '⚠️ replacementLog kosong. Pastikan Anda belum klik Fully Mask sebelum ini.'
      );
    }
  }

  onUpload(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files?.[0]) return;

    const supportedTypes = [
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ];
    // 🔒 Reject unsupported file types BEFORE any processing
    if (!supportedTypes.includes(input.files?.[0].type)) {
      alert(
        `❌ Unsupported file type: ${input.files?.[0].name}\nPlease upload a .txt, .pdf, .docx, .xlsx, .xls, or .csv file.`
      );
      input.value = '';
      this.fileName = '';
      this.fileReady = false;
      return;
    }

    this.isGenerating = true;
    const file = input.files?.[0];
    this.fileName = file.name;
    const fileType = file.type;
    const reader = new FileReader();

    // TXT
    if (fileType === supportedTypes[0]) {
      reader.onload = () => {
        this.originalContent = reader.result as string;
        this.processOriginalContent();
        this.renderHighlightedContent();
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
              if (Math.abs(y - lastY) > 25) {
                strings.push('\n');
              }
            }

            strings.push(text);
            lastY = y;
          });
          text += strings.join('') + '\n';
        }
        this.originalContent = text;
        this.processOriginalContent();
      };
      reader.readAsArrayBuffer(file);

      // DOCX
    } else if (fileType === supportedTypes[2]) {
      reader.onload = async () => {
        const result = await mammoth.extractRawText({
          arrayBuffer: reader.result as ArrayBuffer,
        });
        this.originalContent = result.value.replace(/\n\n/g, '\n');
        this.processOriginalContent();
      };

      reader.readAsArrayBuffer(file);

      // XLSX / XLS / CSV
    } else if (
      fileType === supportedTypes[3] ||
      fileType === supportedTypes[4] ||
      fileType === supportedTypes[5]
    ) {
      reader.onload = (e) => {
        const data = new Uint8Array(reader.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        let result = '';
        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
          }) as any[][]; // array of arrays

          result += `Sheet: ${sheetName}\n`;

          if (jsonData.length > 0) {
            const headers = jsonData[0];
            const rows = jsonData.slice(1);

            headers.forEach((header: string, index: number) => {
              const values = rows
                .map((row) => row[index])
                .filter((v) => v !== undefined && v !== null);
              result += `${header}: ${values.join(' | ')}.\n`;
            });
          }

          result += '\n';
        });

        this.originalContent = result;
        this.processOriginalContent();
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert('Unsupported file type. Please upload .txt, .pdf, or .docx');
    }
  }

  selectModel(modelType: 'explicit' | 'implicit'): void {
    console.log('Haii' + modelType + this.selectedModel);

    this.selectedModel = modelType;

    if (!this.fileReady) {
      return;
    }
    this.isGenerating = true;

    this.resetAllMaskingStates();

    this.clickedButton = '';
    this.clickedPartialButton = null;

    if (this.originalContent) {
      this.maskedContent = this.originalContent;
    }

    this.processOriginalContent();
  }

  resetCategoryCounts(): void {
    Object.keys(this.categoryCounts).forEach((key) => {
      this.categoryCounts[key] = 0;
    });
    // check for calling
  }

  resetAllMaskingStates(): void {
    this.activePreviewType = null;
    this.selectedMaskType = null;
    // this.clickedButton = '';
    // this.clickedPartialButton = null;

    this.categoryOnlyTable = [];
    this.valueOnlyTable = [];
    this.allRandomizedPreview = [];
    this.randomizedPreview = [];
    this.partialMaskedStats = [];
    this.maskedTokensWithDiff = [];
    this.originalTokensWithDiff = [];

    this.replacementLog = [];
    this.aiDetectedPii = [];
    this.searchTermsUser = [];
    this.replacementTermsUser = [];
    this.searchTermsCategory = [];
    this.categoryFromModel = [];
    this.replacementTermsCategory = [];
    this.searchTermsAllRandomized = [];
    this.searchTermsDataRandomized = [];
    this.replacementTermsRandomized = [];

    this.draggedSelections = [];
    this.currentSelected = '';
    this.isAdding = false;
    this.highlightedContent = '';
    this.highlightedMaskedContent = '';
  }

  processOriginalContent(): void {
    this.resetCategoryCounts();
    this.maskPrivacy(this.originalContent).subscribe({
          next: (resultString) => {
            // This code runs ONLY after the API call is successful
            console.log("API call successful, result received!");
            this.maskedContent = resultString;
            console.log(resultString)

            // aiDetectedPii dari replacementLog yang dihasilkan API
            this.aiDetectedPii = [];
            this.replacementLog.forEach((logEntry) => {
            // Ekstrak kategori dari `replaced` string jika formatnya `[CATEGORY_X]`
            const categoryMatch = logEntry.replaced.match(/\[(.*?)_?\d*\]/);
            const category = categoryMatch ? categoryMatch[1] : 'UNKNOWN'; // Default 'UNKNOWN' jika tidak sesuai format
            this.aiDetectedPii.push({
              original: logEntry.original,
              category: category,
              replaced: logEntry.replaced,
            });
              
            // The replacementLog is now set by the API response, so we can generate tables
//             this.generateDiffTokens();
//             this.generatePreviewTables();
//             this.addPredictionsToSearchLists(this.replacementLog);
//             this.generateHighlightedMaskedContent();
//             console.log("Haii" + this.categoryOnlyTable)
//             this.fileReady = true;
//             this.isGenerating = false;
//             console.log("Log generated from APIS:", this.replacementLog)
          },
          error: (err) => {
            console.error("API Error:", err);
            this.isGenerating = false;
            this.fileReady = false; // Optionally show an error state
          }
        });

        this.searchTermsCategory = this.aiDetectedPii.map((p) => p.original);
        this.categoryFromModel = this.aiDetectedPii.map((p) => p.category);
        this.replacementTermsCategory = this.aiDetectedPii.map(
          (p) => p.replaced
        );
        this.searchTermsAllRandomized = this.aiDetectedPii.map(
          (p) => p.original
        );
        this.searchTermsDataRandomized = this.aiDetectedPii.map(
          (p) => p.original
        );

        this.generateDiffTokens();
        this.generatePreviewTables();
        this.addPredictionsToSearchLists(this.replacementLog); // aiDetectedPii lebih jadi sumber utama
        this.generateHighlightedMaskedContent();
        console.log('Haii' + this.categoryOnlyTable);
        this.fileReady = true;
        this.isGenerating = false;
        this.renderHighlightedContent();
        console.log('Log generated from APIS:', this.replacementLog);

        this.selectMaskType('full');
        this.handleClick('category');
        this.clickedButton = 'category';
        this.activePreviewType = 'category';
        this.selectedMaskType = 'full';
        this.clickedPartialButton = null;

        this.cdr.detectChanges();

        this.handleClick('category');
      },
      error: (err) => {
        console.error('API Error:', err);
        this.isGenerating = false;
        this.fileReady = false;
        alert(
          'Failed to connect to masking API. Please ensure the backend is running.'
        );
      },
    });
  }

  clearTermAndReplacement() {
    this.searchTermsUser = [];
    this.replacementTermsUser = [];

    this.searchTermsCategory = [];
    this.categoryFromModel = [];
    this.replacementTermsCategory = [];

    this.searchTermsAllRandomized = [];

    this.searchTermsDataRandomized = [];
    this.replacementTermsRandomized = [];
  }

  maskPrivacy(content: string): Observable<string> {
    this.replacementLog = [];
    if (this.selectedModel == 'explicit') {
      return this.apiService.getPredictionsExplicit(content).pipe(
        map((response) => {
          const predictions = response.predictions;

          if (!predictions) {
            return content;
          }

          const sortedPredictions = predictions.sort(
            (a: any, b: any) => a.start - b.start
          );

          let lastIndex = 0;
          const maskedParts: string[] = [];
          const localCategoryCounts: Record<string, number> = {};

          sortedPredictions.forEach(
            (p: {
              word: string;
              label: string;
              start: number;
              end: number;
            }) => {
              if (p.start > lastIndex) {
                maskedParts.push(content.substring(lastIndex, p.start));
              }

              const category = p.label.replace(/^[BI]_/, '');
              const count = localCategoryCounts[category] || 0;
              localCategoryCounts[category] = count + 1;
              const replacement =
                count === 0 ? `[${category}]` : `[${category}_${count + 1}]`;

              maskedParts.push(replacement);

              this.replacementLog.push({
                original: p.word,
                replaced: replacement,
              });

              lastIndex = p.end;
            }
          );

          if (lastIndex < content.length) {
            maskedParts.push(content.substring(lastIndex));
          }

          const maskedCont = maskedParts.join('');

          console.log('Log generated from API Explicit:', this.replacementLog);
          return maskedCont;
        })
      );
    } else {
      // Implicit
      return this.apiService.getPredictionsImplicit(content).pipe(
//         map((response) => {
//           const predictions = response.predictions;

//           if (
//             !predictions ||
//             !Array.isArray(predictions) ||
//             predictions.length === 0
//           ) {
//             return content;
//           }
        map(response => {
            // The API now returns a list of objects with sentence, topics, start, and end
            const predictions: any[] = response.predictions;

            console.log("Received predictions from backend:", predictions);

            console.log(response.predictions)
            this.replacementLog = [];

            // This handles cases where the API returns {} or an empty list [].
            if (!predictions || !Array.isArray(predictions) || predictions.length === 0) {
                return content;
            }

            // 3. Sort predictions in REVERSE order of their start position.
            // This is critical to avoid messing up the indices of subsequent replacements.
            const sortedPredictions = predictions.sort((a: any, b: any) => b.start - a.start);
            let maskedCont = content;

            // 4. Loop through the predictions and replace the original sentence with a mask
            // sortedPredictions.forEach((prediction: { sentence: string, predicted_topics: string[], start: number, end: number }) => {
            //     const topics = prediction.predicted_topics.join(', ');
            //     const category = topics;
            //     this.categoryFromModel.push(category);
            //     const replacement = this.checkCategoryCount(category, prediction.sentence);
            //     console.log("replace: " + prediction.sentence + " , " + replacement);

            //     // Replace the content from start to end with the new mask
            //     maskedCont = maskedCont.substring(0, prediction.start) + replacement + maskedCont.substring(prediction.end);

            //     // Add a detailed entry to the log
            //     this.replacementLog.push({ original: prediction.sentence, replaced: replacement });
            // });

            sortedPredictions.forEach((prediction: any) => { // Treat each prediction as 'any' type

            // --- THE KEY CHANGE IS HERE ---
            // Extract the 'topic' string from each object in the array, then join.
              const topics = prediction.predicted_topics
                  .map((topicObj: any) => topicObj.topic) // Map the array of objects to an array of strings
                  .join(', ');                            // Join the strings: "Card_Number, BankAccount"

              const category = topics;
              this.categoryFromModel.push(category);

              const replacement = this.checkCategoryCount(category, prediction.sentence);
              console.log(`Replacing sentence: "${prediction.sentence}" with mask: "${replacement}"`);

              // This replacement logic is correct.
              maskedCont = maskedCont.substring(0, prediction.start) + replacement + maskedCont.substring(prediction.end);

              this.replacementLog.push({ original: prediction.sentence, replaced: replacement });
            });

          const sortedPredictions = predictions.sort(
            (a: any, b: any) => b.start - a.start
          );
          let maskedCont = content;
          // Gunakan localCategoryCounts untuk API call ini
          const localCategoryCounts: Record<string, number> = {};

          sortedPredictions.forEach(
            (prediction: {
              sentence: string;
              predicted_topics: string[];
              start: number;
              end: number;
            }) => {
              const topics = prediction.predicted_topics.join(', ');
              const category = topics;
              // Gunakan localCategoryCounts
              const count = localCategoryCounts[category] || 0;
              localCategoryCounts[category] = count + 1;
              const replacement =
                count === 0 ? `[${category}]` : `[${category}_${count + 1}]`;

              maskedCont =
                maskedCont.substring(0, prediction.start) +
                replacement +
                maskedCont.substring(prediction.end);

              this.replacementLog.push({
                original: prediction.sentence,
                replaced: replacement,
              });
            }
          );

          console.log('Log generated from API Implicit:', this.replacementLog);
          return maskedCont;
        })
      );
    }
  }

  checkCategoryCount(category: string, word: string): string {
    const count = this.aiDetectedPii.filter(
      (p) => p.category === category
    ).length;
    return count === 0 ? `[${category}]` : `[${category}_${count}]`;
  }

  addPredictionsToSearchLists(
    log: { original: string; replaced: string }[]
  ): void {
    console.log('Updating search lists with AI predictions...');
    log.forEach((entry) => {
      const originalTerm = entry.original;
      const categoryTerm = entry.replaced; // e.g., '[SALARY]'

      if (
        !this.searchTermsCategory.includes(originalTerm) &&
        !this.aiDetectedPii.some((p) => p.original === originalTerm)
      ) {
        this.searchTermsCategory.push(originalTerm);
        this.replacementTermsCategory.push(categoryTerm);

        this.searchTermsUser.push(originalTerm);
        this.replacementTermsUser.push(categoryTerm);

        this.searchTermsAllRandomized.push(originalTerm);
        this.searchTermsDataRandomized.push(originalTerm);

        console.log(`Added "${originalTerm}" to search lists.`);
      }
    });
  }

  updateReplacementsFromTable(): void {
    console.log('Applying changes from the preview table...');

    this.valueOnlyTable.forEach((tableRow) => {
      const aiEntry = this.aiDetectedPii.find(
        (entry) => entry.original === tableRow.ori
      );
      if (aiEntry) {
        aiEntry.replaced = tableRow.masked;
      }

      const userIndex = this.searchTermsUser.indexOf(tableRow.ori);
      if (userIndex !== -1) {
        this.replacementTermsUser[userIndex] = tableRow.masked;
        console.log(
          `Updated user-defined "${tableRow.ori}" to be replaced with "${tableRow.masked}"`
        );
      } else {
        console.log(
          `Updated AI-detected "${tableRow.ori}" to be replaced with "${tableRow.masked}"`
        );
      }
    });

    this.userMasking();
  }

  onDownload(): void {
    if (!this.fileName || !this.fileName.includes('.')) {
      console.error('Unknown file type.');
      return;
    }

    if (!this.fileName || !this.maskedContent) {
      alert('No file to download.');
      return;
    }

    const extension = this.fileName.split('.').pop()?.toLowerCase();

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

    this.downloadJsonMapping();
  }

  downloadTextFile(): void {
    const blob = new Blob([this.maskedContent], { type: 'text/plain' });
    this.triggerDownload(blob, this.fileName);
  }

  downloadPdfFile(): void {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);

    const margin = 20;
    const lineHeight = 8;
    const maxY = 290;
    const maxWidth = doc.internal.pageSize.getWidth() - 2 * margin;

    let y = margin;
    const lines = this.maskedContent.split('\n');

    lines.forEach((line) => {
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

    doc.save('masked_' + this.fileName);
  }

  downloadDocxFile(): void {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: this.maskedContent
            .split('\n')
            .map((line) => new Paragraph(line)),
        },
      ],
    });

    Packer.toBlob(doc).then((blob) => {
      this.triggerDownload(blob, this.fileName);
    });
  }

  downloadXlsxFile(): void {
    if (!this.maskedContent) return;

    const sheets = this.maskedContent
      .split(/Sheet:\s+/)
      .filter((s) => s.trim());
    const workbook = XLSX.utils.book_new();

    sheets.forEach((sheetBlock) => {
      const [sheetNameLine, ...lines] = sheetBlock.trim().split('\n');
      const sheetName = sheetNameLine.trim();

      const rows = lines
        .filter((line) => line.trim())
        .map((line) => line.split(','));

      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const downloadName = this.fileName.replace(/\.[^/.]+$/, '') + '.xlsx';
    this.triggerDownload(blob, downloadName);
  }

  downloadXlsFile(): void {
    if (!this.maskedContent) return;

    const sheets = this.maskedContent
      .split(/Sheet:\s+/)
      .filter((s) => s.trim());
    const workbook = XLSX.utils.book_new();

    sheets.forEach((sheetBlock) => {
      const [sheetNameLine, ...lines] = sheetBlock.trim().split('\n');
      const sheetName = sheetNameLine.trim();
      const rows = lines.map((line) => line.split(','));
      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    const wbout = XLSX.write(workbook, { bookType: 'xls', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.ms-excel',
    });

    const downloadName = this.fileName.replace(/\.[^/.]+$/, '') + '.xls';
    this.triggerDownload(blob, downloadName);
  }

  downloadCsvFile(): void {
    if (!this.maskedContent) return;

    const sheetBlocks = this.maskedContent
      .split(/Sheet:\s+/)
      .filter((s) => s.trim());

    sheetBlocks.forEach((sheetBlock) => {
      const [sheetNameLine, ...lines] = sheetBlock.trim().split('\n');
      const sheetName = sheetNameLine.trim();
      const csvData = lines.join('\n');

      const blob = new Blob([csvData], { type: 'text/csv' });
      const downloadName = this.fileName.replace(/\.[^/.]+$/, '') + '.csv';
      this.triggerDownload(blob, downloadName);
    });
  }

  triggerDownload(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'masked_' + filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  userMasking(): void {
    this.activePreviewType = 'value';
    this.randomizedPreview = [];
    this.allRandomizedPreview = [];
    this.partialMaskedStats = [];

    let currentMaskedContent = this.originalContent;
    this.replacementLog = [];

    const termsToMaskMap = new Map<string, string>();

    this.aiDetectedPii.forEach(entry => {
      termsToMaskMap.set(entry.original, entry.replaced);
    });

    this.searchTermsUser.forEach((term, idx) => {
      termsToMaskMap.set(term, this.replacementTermsUser[idx]);
    });

    const sortedTermsToMask = Array.from(termsToMaskMap.entries()).sort(
      (a, b) => b[0].length - a[0].length
    );

    sortedTermsToMask.forEach(([term, replacement]) => {
      const escapedTerm = this.escapeRegExp(term);
      const isWordBoundaryNeeded = !/\s|[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]/.test(
        term
      );
      const regex = isWordBoundaryNeeded
        ? new RegExp(`\\b${escapedTerm}\\b`, 'g')
        : new RegExp(escapedTerm, 'g');

      // currentMaskedContent = currentMaskedContent.replace(
      //   regex,
      //   (matchFound) => {
      //     const existingLogEntry = this.replacementLog.find(
      //       (log) => log.original === matchFound
      //     );
      //     if (existingLogEntry) {
      //       existingLogEntry.replaced = replacement;
      //     } else {
      //       this.replacementLog.push({
      //         original: matchFound,
      //         replaced: replacement,
      //       });
      //     }
      //     return replacement;
      //   }
      // );

      currentMaskedContent = currentMaskedContent.replace(regex, (matchFound) => {
        // Ini akan selalu push nilai `replacement` yang sudah diambil dari `termsToMaskMap`
        // Yang mana `termsToMaskMap` sudah berisi nilai terbaru dari `aiDetectedPii`
        this.replacementLog.push({ original: matchFound, replaced: replacement });
        return replacement;
      });
    });

    this.maskedContent = currentMaskedContent;
    this.generatePreviewTables();
    this.generateDiffTokens();
    this.generateHighlightedMaskedContent();
    console.log('User Masking Log:', this.replacementLog);
  }

  replaceFromArray(
    content: string,
    searchTerms: string[],
    replacementTerms: string[]
  ): string {
    let result = content;

    for (let i = 0; i < searchTerms.length; i++) {
      const search = searchTerms[i];
      const replacement = replacementTerms[i];

      const escapedSearch = this.escapeRegExp(search);

      const isSafeToReplaceAnywhere = search.length > 2 || /\W/.test(search);

      const regex = isSafeToReplaceAnywhere
        ? new RegExp(escapedSearch, 'g')
        : new RegExp(`\\b${escapedSearch}\\b`, 'g');

      result = result.replace(regex, (match) => {
        return replacement;
      });
    }

    return result;
  }

  escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // randomized
  randomStr(length: number, chars: string): string {
    return Array.from(
      { length },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join('');
  }

  // randomizeSpecificContent(
  randomizeSpecificContent(
    typeOrFormat: string = 'mixed',
    word: string
  ): string {
    let length = word.length;
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';

    switch (typeOrFormat) {
      // email
      case 'Mail':
      case 'Work_Mail':
        const userLength = Math.max(1, Math.floor(length * 0.6) - 4);
        const domainLength = Math.max(1, Math.floor(length * 0.3));
        const user = this.randomStr(userLength, letters + digits);
        const domain = this.randomStr(domainLength, letters);
        return `${user}@${domain}.com`;

      // phone number
      case 'Phone_Number':
      case 'Work_Phone_Number':
        const number = Math.max(6, length - 3);
        return '+62' + this.randomStr(number, digits);

      // text only
      case 'Name':
      case 'Nickname':
      case 'Location':
      case 'POB':
      case 'Parent_Name':
      case 'Username':
      case 'Criminal_Hist':
      case 'Edu_Hist':
      case 'Med_Hist':
      case 'Occ_Hist':
      case 'Asset':
      case 'Address':
      case 'Race':
      case 'Religion':
      case 'Marr_Status':
      case 'Gender':
      case 'Blood_Type':
        return this.randomStr(length, letters);

      // number only
      case 'Balance':
      case 'Account':
      case 'Card_Number':
      case 'NIP':
      case 'SSN':
      case 'Salary':
        return this.randomStr(length, digits);

      // mixed - text and number
      case 'Score':
        const lettersAdd = '+-';
        const numLettersAdd = word.includes('+') || word.includes('-') ? 1 : 0;
        const numDigits = this.getDigitLengthOnly(word);
        const numLetters = length - numDigits - numLettersAdd;

        return (
          this.randomStr(numLetters, letters) +
          this.randomStr(numDigits, digits) +
          this.randomStr(numLettersAdd, lettersAdd)
        );

      // date
      case 'DOB':
        const year = this.getRandomInt(1900, 2100);
        const month = this.getRandomInt(1, 12);
        const day = this.getRandomDay(year, month);
        const mm = month.toString().padStart(2, '0');
        const dd = day.toString().padStart(2, '0');
        return `${year}-${mm}-${dd}`; // e.g., "1992-04-15"

      // cm
      case 'Body_Height':
        length = this.getDigitLengthOnly(word);
        return `${this.randomStr(length || 3, digits)} cm`;

      // kg
      case 'Body_Weight':
        length = this.getDigitLengthOnly(word);
        return `${this.randomStr(length || 2, digits)} kg`;

      // number/number
      case 'Blood_Pressure':
        const bpParts = word.split('/');
        const sysLength = this.getDigitLengthOnly(bpParts[0]);
        const diaLength = this.getDigitLengthOnly(bpParts[1] || '');
        return `${this.randomStr(sysLength || 3, digits)}/${this.randomStr(
          diaLength || 2,
          digits
        )} mmHg`;

      // plat
      case 'Plate':
        const plateParts = word.split(' ');
        let randPlate = '';
        if (plateParts.length >= 2) {
          const regionPart = plateParts[0];
          const numberPart = plateParts[1];
          const suffixPart = plateParts.length > 2 ? plateParts[2] : '';

          randPlate += this.randomStr(regionPart.length, letters).toUpperCase();
          randPlate += ' ' + this.randomStr(numberPart.length, digits);
          if (suffixPart) {
            randPlate +=
              ' ' + this.randomStr(suffixPart.length, letters).toUpperCase();
          }
        } else {
          randPlate = this.randomStr(length, letters + digits).toUpperCase();
        }
        return randPlate;

      default:
        return this.randomStr(length, letters);
    }
  }

  getDigitLengthOnly(word: string): number {
    const match = word.match(/\d+/);
    return match ? match[0].length : 0;
  }

  getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  getRandomDay(year: number, month: number): number {
    const daysInMonth = new Date(year, month, 0).getDate();
    return this.getRandomInt(1, daysInMonth);
  }

  allRandomized(): void {
    let result = this.originalContent;
    this.replacementLog = [];
    this.randomizedPreview = [];
    this.allRandomizedPreview = [];
    this.partialMaskedStats = [];
    this.activePreviewType = 'all';

    const termsToRandomize = [...this.aiDetectedPii].sort(
      (a, b) => b.original.length - a.original.length
    );

    termsToRandomize.forEach((entry) => {
      const term = entry.original;
      const type = entry.category;

      const replacement = this.randomizeSpecificContent(type, term);

      const escapedTerm = this.escapeRegExp(term);
      const isWordBoundaryNeeded = !/\s|[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]/.test(
        term
      );
      const regex = isWordBoundaryNeeded
        ? new RegExp(`\\b${escapedTerm}\\b`, 'g')
        : new RegExp(escapedTerm, 'g');

      result = result.replace(regex, (matchFound) => {
        // this.replacementLog.push({
        //   original: matchFound,
        //   replaced: replacement,
        // });
        const replacement = this.randomizeSpecificContent(type, matchFound);
        this.replacementLog.push({
          original: matchFound,
          replaced: replacement,
        });

        if (
          !this.allRandomizedPreview.some(
            (p) => p.ori === matchFound && p.result === replacement
          )
        ) {
          this.allRandomizedPreview.push({
            ori: matchFound,
            type: type,
            result: replacement,
          });
        }
        return replacement;
      });
    });

    this.maskedContent = result;
    this.generatePreviewTables();
    this.generateDiffTokens();
    this.generateHighlightedMaskedContent();

    this.allRandomizedPreview.sort((a, b) => a.ori.localeCompare(b.ori));

    console.log('🔍 All Replacement Log:', this.replacementLog);
  }

  sameDataRandomized(): void {
    this.replacementLog = [];
    this.randomizedPreview = [];
    this.allRandomizedPreview = [];
    this.partialMaskedStats = [];
    this.activePreviewType = 'same';

    const termsToRandomize = [...this.aiDetectedPii].sort(
      (a, b) => b.original.length - a.original.length
    );
    const uniqueRandomizedMap = new Map<string, string>();

    termsToRandomize.forEach((entry) => {
      const original = entry.original;
      const type = entry.category;

      let randomizedValue: string;
      if (uniqueRandomizedMap.has(original)) {
        randomizedValue = uniqueRandomizedMap.get(original)!;
      } else {
        randomizedValue = this.randomizeSpecificContent(type, original);
        uniqueRandomizedMap.set(original, randomizedValue);
      }

      if (
        !this.randomizedPreview.some(
          (p) => p.ori === original && p.result === randomizedValue
        )
      ) {
        this.randomizedPreview.push({
          ori: original,
          type: type,
          result: randomizedValue,
        });
      }
    });

    let currentMaskedContentTemp = this.originalContent;
    uniqueRandomizedMap.forEach((randomizedValue, original) => {
      const escapedOriginal = this.escapeRegExp(original);
      const isWordBoundaryNeeded = !/\s|[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]/.test(
        original
      );
      const regex = isWordBoundaryNeeded
        ? new RegExp(`\\b${escapedOriginal}\\b`, 'g')
        : new RegExp(escapedOriginal, 'g');

      currentMaskedContentTemp = currentMaskedContentTemp.replace(
        regex,
        (matchFound) => {
          this.replacementLog.push({
            original: matchFound,
            replaced: randomizedValue,
          });
          return randomizedValue;
        }
      );
    });

    this.maskedContent = currentMaskedContentTemp;
    this.generatePreviewTables();
    this.generateDiffTokens();
    this.generateHighlightedMaskedContent();

    this.randomizedPreview.sort((a, b) => a.ori.localeCompare(b.ori));

    console.log('🔍 Same Data Replacement Log:', this.replacementLog);
  }

  labelCategoryTable: Array<{ category: string; text: string; count: number }> =
    [];

  labelCategory(): void {
    this.replacementLog = [];
    this.randomizedPreview = [];
    this.allRandomizedPreview = [];
    this.partialMaskedStats = []; // Kosongkan juga partial stats
    this.activePreviewType = 'category';

    const termsToCategorize = [...this.aiDetectedPii].sort(
      (a, b) => b.original.length - a.original.length
    );

    let currentMaskedContentTemp = this.originalContent;

    termsToCategorize.forEach((entry) => {
      const original = entry.original;
      const categoryReplacement = entry.replaced;

      const escapedOriginal = this.escapeRegExp(original);
      const isWordBoundaryNeeded = !/\s|[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]/.test(
        original
      );
      const regex = isWordBoundaryNeeded
        ? new RegExp(`\\b${escapedOriginal}\\b`, 'g')
        : new RegExp(escapedOriginal, 'g');

      currentMaskedContentTemp = currentMaskedContentTemp.replace(
        regex,
        (matchFound) => {
          this.replacementLog.push({
            original: matchFound,
            replaced: categoryReplacement,
          });
          return categoryReplacement;
        }
      );
    });

    this.maskedContent = currentMaskedContentTemp;
    this.generatePreviewTables();
    this.generateDiffTokens();
    this.generateHighlightedMaskedContent();

    // const categoryMap = new Map<string, { text: string, count: number }>();
    // this.replacementLog.forEach(log => {
    //   const key = `${log.replaced}||${log.original}`;
    //   if (categoryMap.has(key)) {
    //     categoryMap.get(key)!.count++;
    //   } else {
    //     categoryMap.set(key, { text: log.original, count: 1 });
    //   }
    // });

    console.log('✅ Label Category Log:', this.replacementLog);
  }

  applyLabelCategoryReplacement(): void {
    // Fungsi ini tidak lagi dibutuhkan karena logikanya sudah digabungkan ke `labelCategory()`
    // dan tidak lagi menggunakan `replaceFromArray` di sini secara langsung.
    // this.replacementLog = [];
    // this.randomizedPreview = [];
    // this.allRandomizedPreview = [];
    // this.maskedContent = this.replaceFromArray(
    //   this.originalContent,
    //   this.searchTermsCategory,
    //   this.replacementTermsCategory
    // );
    // console.log('✅ Masking Applied (Kategori)');
    // this.replacementLog.forEach(log =>
    //   console.log(`original: ${log.original} | replaced: ${log.replaced}`)
    // );
    // this.generateDiffTokens();
  }

  generatePreviewTables(): void {
    // CATEGORY ONLY Table (1 baris per kategori)
    this.categoryOnlyTable = [];
    const mapCat = new Map<
      string,
      { examples: Set<string>; count: number; type: string }
    >();

    // Iterasi melalui replacementLog yang aktif
    for (let log of this.replacementLog) {
      const masked = log.replaced;
      const original = log.original;
      // Dapatkan kategori dari aiDetectedPii sebagai sumber kebenaran
      const aiEntry = this.aiDetectedPii.find(
        (entry) => entry.original === original
      );
      const type = aiEntry ? aiEntry.category : '[UNKNOWN]'; // Fallback jika tidak ditemukan di aiDetectedPii

      if (!mapCat.has(masked)) {
        mapCat.set(masked, {
          examples: new Set([original]),
          count: 1,
          type: type,
        });
      } else {
        mapCat.get(masked)!.examples.add(original);
        mapCat.get(masked)!.count += 1;
      }
    }
    this.categoryOnlyTable = Array.from(mapCat.entries())
      .map(([masked, data]) => ({
        ori: Array.from(data.examples).join(', '),
        type: data.type,
        masked,
        count: data.count,
      }))
      .sort((a, b) => a.ori.localeCompare(b.ori));

    // VALUE ONLY Table (1 baris per original)
    this.valueOnlyTable = []; // Kosongkan dulu
    const mapVal = new Map<string, { type: string; masked: string }>();
    for (let entry of this.aiDetectedPii) {
      const ori = entry.original;
      const currentMasked =
        this.replacementLog.find((log) => log.original === ori)?.replaced ||
        entry.replaced;
      const type = entry.category;

      mapVal.set(ori, { type, masked: currentMasked });
    }

    this.valueOnlyTable = Array.from(mapVal.entries())
      .map(([ori, val]) => ({
        ori,
        type: val.type,
        masked: val.masked,
      }))
      .sort((a, b) => a.ori.localeCompare(b.ori));
  }

  onWordClick(word: string): void {
    const alreadyExists = this.searchTermsUser.includes(word);
    const alreadyExistsInAi = this.aiDetectedPii.some(
      (entry) => entry.original === word
    );

    if (!alreadyExists && !alreadyExistsInAi) {
      const category = this.checkCategoryCount('USER_ADDED', word);

      this.searchTermsUser.push(word);
      this.replacementTermsUser.push(category);

      this.aiDetectedPii.push({
        original: word,
        category: 'USER_ADDED',
        replaced: category,
      });

      if (this.activePreviewType === 'value') {
        this.userMasking();
      } else if (this.activePreviewType === 'category') {
        this.labelCategory();
      } else if (this.activePreviewType === 'all') {
        this.allRandomized();
      } else if (this.activePreviewType === 'same') {
        this.sameDataRandomized();
      } else if (
        this.selectedMaskType === 'partial' &&
        this.clickedPartialButton
      ) {
        this.handlePartialClick(
          this.clickedPartialButton as 'redact' | 'prefix-suffix'
        );
      } else {
        this.reapplyInitialAiMasking();
      }

      this.generatePreviewTables();
      this.generateDiffTokens();
      this.generateHighlightedMaskedContent();
      this.renderHighlightedContent();
    }
  }

  removePreviewRow(word: string): void {
    this.aiDetectedPii = this.aiDetectedPii.filter(
      (entry) => entry.original !== word
    );

    const userIdx = this.searchTermsUser.indexOf(word);
    if (userIdx !== -1) {
      this.searchTermsUser.splice(userIdx, 1);
      this.replacementTermsUser.splice(userIdx, 1);
    }

    const catIdx = this.searchTermsCategory.indexOf(word);
    if (catIdx !== -1) {
      this.searchTermsCategory.splice(catIdx, 1);
      this.categoryFromModel.splice(catIdx, 1);
      this.replacementTermsCategory.splice(catIdx, 1);
    }
    const allRandIdx = this.searchTermsAllRandomized.indexOf(word);
    if (allRandIdx !== -1) {
      this.searchTermsAllRandomized.splice(allRandIdx, 1);
    }
    const dataRandIdx = this.searchTermsDataRandomized.indexOf(word);
    if (dataRandIdx !== -1) {
      this.searchTermsDataRandomized.splice(dataRandIdx, 1);
    }

    if (this.activePreviewType === 'category') {
      this.labelCategory();
    } else if (this.activePreviewType === 'value') {
      this.userMasking();
    } else if (this.activePreviewType === 'all') {
      this.allRandomized();
    } else if (this.activePreviewType === 'same') {
      this.sameDataRandomized();
    } else if (
      this.selectedMaskType === 'partial' &&
      this.clickedPartialButton
    ) {
      this.handlePartialClick(
        this.clickedPartialButton as 'redact' | 'prefix-suffix'
      );
    } else {
      this.reapplyInitialAiMasking();
    }
    this.renderHighlightedContent();
  }

  handleClick(buttonId: string): void {
    this.clickedButton = buttonId;
    this.clickedPartialButton = null;

    if (buttonId === 'category') {
      this.labelCategory();
    } else if (buttonId === 'value') {
      this.userMasking();
    } else if (buttonId === 'all-randomized') {
      this.allRandomized();
    } else if (buttonId === 'same-randomized') {
      this.sameDataRandomized();
    }
  }

  resetAllPreviews() {
    this.activePreviewType = null;
    // this.clickedButton = null;
    this.clickedButton = '';
    // this.clickedPartialButton = null;
    // replacementLog tidak lagi direset di sini, tapi di resetAllMaskingStates atau tiap fungsi masking utama
    // this.replacementLog = [];
    this.categoryOnlyTable = [];
    this.valueOnlyTable = [];
    this.allRandomizedPreview = [];
    this.randomizedPreview = [];
    this.partialMaskedStats = [];
  }

  selectMaskType(type: 'partial' | 'full'): void {
    this.selectedMaskType = type;

    if (type === 'partial') {
      this.clickedButton = '';
      this.clickedPartialButton = this.clickedPartialButton;
      this.activePreviewType = null;
    } else {
      // type === 'full'
      this.clickedButton = 'category';
      this.clickedPartialButton = null;
      this.activePreviewType = 'category';
    }

    this.partialMaskedStats = [];

    this.resetAllPreviews();

    if (type === 'full') {
      this.reapplyInitialAiMasking(); // Ini akan men-trigger labelCategory() secara internal
    } else {
      // type === 'partial'
      // this.handlePartialClick(this.clickedPartialButton as 'redact' | 'prefix-suffix'); // Ini akan dipanggil dari HTML
    }

    this.cdr.detectChanges();
  }

  reapplyInitialAiMasking(): void {
    this.replacementLog = [];
    let tempMaskedContent = this.originalContent;

    this.maskedContent = tempMaskedContent;
    this.generateDiffTokens();
    this.generateHighlightedMaskedContent();
    this.generatePreviewTables();

    this.selectedMaskType = 'full';
    this.activePreviewType = 'category';
    this.clickedButton = 'category';
    this.clickedPartialButton = null;

    this.cdr.detectChanges();
    this.handleClick('category');
  }

  handlePartialClick(type: 'redact' | 'prefix-suffix') {
    console.log('[DEBUG] handlePartialClick called with:', type);
    console.log('[DEBUG] selectedMaskType', this.selectedMaskType);

    this.clickedPartialButton = type;
    this.clickedButton = '';
    this.activePreviewType = null;

    const allPiiToMask = [...this.aiDetectedPii];

    this.searchTermsUser.forEach((term) => {
      if (!allPiiToMask.some((p) => p.original === term)) {
        const userReplacement =
          this.replacementTermsUser[this.searchTermsUser.indexOf(term)];
        const categoryMatch = userReplacement.match(/\[(.*?)_?\d*\]/);
        const category = categoryMatch ? categoryMatch[1] : 'USER_ADDED';
        allPiiToMask.push({
          original: term,
          category: category,
          replaced: userReplacement,
        });
      }
    });

    this.replacementLog = [];
    this.partialMaskedStats = [];
    this.categoryOnlyTable = [];
    this.valueOnlyTable = [];
    this.allRandomizedPreview = [];
    this.randomizedPreview = [];

    allPiiToMask.sort((a, b) => b.original.length - a.original.length);

    let finalMaskedContent = this.originalContent;
    const stats: Record<
      string,
      { count: number; format?: string; originalWords: Set<string> }
    > = {};
    const usedMasks = new Map<string, string>();

    allPiiToMask.forEach((piiEntry) => {
      const originalPii = piiEntry.original;

      if (!finalMaskedContent.includes(originalPii)) {
        const existingLogEntry = this.replacementLog.find(
          (log) => log.original === originalPii
        );
        if (existingLogEntry) {
          const maskedWord = existingLogEntry.replaced;
          if (!stats[maskedWord]) {
            stats[maskedWord] = {
              count: 0,
              format: type === 'prefix-suffix' ? maskedWord : undefined,
              originalWords: new Set<string>(),
            };
          }
          stats[maskedWord].count += 1;
          stats[maskedWord].originalWords.add(originalPii);
        }
      }

      let finalMask = '';

      if (type === 'prefix-suffix') {
        const generateInitialMask = (word: string): string => {
          if (word.length <= 2) {
            return word.slice(0, 1) + '*'.repeat(word.length - 1);
          }
          const firstChar = word.slice(0, 1);
          const lastChar = word.slice(-1);
          const middleStars = '*'.repeat(word.length - 2);
          return `${firstChar}${middleStars}${lastChar}`;
        };

        let potentialMask = generateInitialMask(originalPii);
        let revealIndex = originalPii.length - 2;

        while (
          usedMasks.has(potentialMask) &&
          usedMasks.get(potentialMask) !== originalPii
        ) {
          if (revealIndex < 1) {
            potentialMask += `~`;
            break;
          }

          const maskArray = potentialMask.split('');
          maskArray[revealIndex] = originalPii[revealIndex];
          potentialMask = maskArray.join('');

          revealIndex--;
        }

        finalMask = potentialMask;
        usedMasks.set(finalMask, originalPii);
      } else {
        // type === 'redact'
        finalMask = '*'.repeat(originalPii.length);
      }

      const escapedOriginalPii = this.escapeRegExp(originalPii);
      const isWordBoundaryNeeded = !/\s|[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]/.test(
        originalPii
      );
      const regex = isWordBoundaryNeeded
        ? new RegExp(`\\b${escapedOriginalPii}\\b`, 'g')
        : new RegExp(escapedOriginalPii, 'g');

      finalMaskedContent = finalMaskedContent.replace(regex, (matchFound) => {
        const existingLogIndex = this.replacementLog.findIndex(
          (log) => log.original === originalPii
        );
        if (existingLogIndex === -1) {
          this.replacementLog.push({
            original: originalPii,
            replaced: finalMask,
          });
        } else {
          this.replacementLog[existingLogIndex].replaced = finalMask;
        }

        if (!stats[finalMask]) {
          stats[finalMask] = {
            count: 0,
            format: type === 'prefix-suffix' ? finalMask : undefined,
            originalWords: new Set<string>(), // Set untuk melacak kata original
          };
        }
        stats[finalMask].count += 1;
        stats[finalMask].originalWords.add(originalPii); // Tambahkan kata original
        return finalMask;
      });
    });

    this.maskedContent = finalMaskedContent;
    this.generateHighlightedMaskedContent();

    this.partialMaskedStats = Object.entries(stats).map(
      ([maskedWord, info]) => ({
        word: maskedWord,
        count: info.count,
        format: info.format,
        originalMatchedWords: Array.from(info.originalWords).join(', '),
      })
    );

    this.partialMaskedStats.sort((a, b) =>
      a.originalMatchedWords!.localeCompare(b.originalMatchedWords!)
    );

    this.generatePreviewTables();
    this.generateDiffTokens();

    console.log('Replacement log:', this.replacementLog);
    console.log('Partial stats:', this.partialMaskedStats);
  }

  generateDiffTokens(): void {
    const targets = this.valueOnlyTable.map((item) => item.ori);

    const splitTokens = (text: string) => {
      const regex =
        /Rp\d+(?:[.,]\d+)+|[\w.+-]+@[\w-]+\.[\w.-]+|\[\w+(_\d+)?\]|\d+(?:[.,/]\d+)+|\+?\d[\d\-\/\s]+|\d+\s*cm|\d+\s*kg|\d+\s*mmHg|[A-Z][+-]|[\w*]+|[.,!?;:"'()[\]{}]/g;
      const matches = text.match(regex) || [];
      return matches.map((word) => ({
        word,
        changed: targets.includes(word.trim()),
      }));
    };

    this.originalTokensWithDiff = splitTokens(this.originalContent);
    this.maskedTokensWithDiff = splitTokens(this.maskedContent);
  }

  downloadJsonMapping(): void {
    if (!this.replacementLog || this.replacementLog.length === 0) {
      alert('No replacement log available.');
      return;
    }

    const jsonStructure = {
      fileName: this.fileName,
      modelUsed: this.selectedModel,
      mapping: this.replacementLog.map((entry) => ({
        original: entry.original,
        masked: entry.replaced,
      })),
    };

    const blob = new Blob([JSON.stringify(jsonStructure, null, 2)], {
      type: 'application/json',
    });

    const downloadFileName =
      this.fileName.replace(/\.[^/.]+$/, '') + '_masking_log.json';
    this.triggerDownload(blob, downloadFileName);
  }

  getHighlightedHTML(content: string, selections: string[]): string {
    let highlighted = content;

    selections.forEach((sel) => {
      // Escape special regex characters
      const safeSel = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${safeSel})`, 'g');
      highlighted = highlighted.replace(
        regex,
        `<span class="highlight">$1</span>`
      );
    });

    return highlighted;
  }

  onSelection(): void {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (selectedText) {
      this.currentSelected = selectedText;
      this.renderHighlightedContent();
    }

    if (!this.isAdding || !selectedText) return;

    if (!this.draggedSelections.includes(selectedText)) {
      this.draggedSelections.push(selectedText);
    }

    this.onWordClick(selectedText);
    selection?.removeAllRanges();
  }

  onMaskedValueChange(original: string, newMasked: string): void {
    // Update aiDetectedPii
    const aiEntry = this.aiDetectedPii.find(
      (entry) => entry.original === original
    );
    if (aiEntry) {
      aiEntry.replaced = newMasked;
    }

    const userIndex = this.searchTermsUser.indexOf(original);
    if (userIndex !== -1) {
        this.replacementTermsUser[userIndex] = newMasked;
    }


    if (this.activePreviewType === 'value') {
      this.userMasking();
    } else if (this.activePreviewType === 'all') {
      this.allRandomized();
    } else if (this.activePreviewType === 'same') {
      this.sameDataRandomized();
    } else if (
      this.selectedMaskType === 'partial' &&
      this.clickedPartialButton
    ) {
      this.handlePartialClick(
        this.clickedPartialButton as 'redact' | 'prefix-suffix'
      );
    } else {
      this.reapplyInitialAiMasking();
    }

    this.generatePreviewTables();
    this.generateDiffTokens();
    this.generateHighlightedMaskedContent();
  }

  // renderHighlightedContent(): void {
  //   let html = this.originalContent;

  //   this.searchTermsUser.forEach((term) => {
  //     const safeTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  //     const regex = new RegExp(`(${safeTerm})`, 'g');
  //     html = html.replace(regex, `<mark class="confirmed">$1</mark>`);
  //   });

  //   if (this.currentSelected && this.isAdding) {
  //     const safeCurrent = this.currentSelected.replace(
  //       /[.*+?^${}()|[\]\\]/g,
  //       '\\$&'
  //     );
  //     const regex = new RegExp(`(${safeCurrent})(?![^<]*<\/mark>)`, 'g'); // skip already marked
  //     html = html.replace(regex, `<mark class="temporary">$1</mark>`);
  //   }

  //   this.highlightedContent = html.replace(/\n/g, '<br>');
  // }

  renderHighlightedContent(): void {
    let html = this.originalContent;

    const allTermsToHighlight = new Set<string>();
    this.aiDetectedPii.forEach(entry => allTermsToHighlight.add(entry.original)); // Dari AI
    this.searchTermsUser.forEach(term => allTermsToHighlight.add(term)); // Dari pengguna

    allTermsToHighlight.forEach((term) => {
      const safeTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regexString = /[^\w\s]|\s/.test(term) ? `(${safeTerm})` : `\\b(${safeTerm})\\b`;
      const regex = new RegExp(regexString, 'g');
      html = html.replace(regex, `<mark class="confirmed">$1</mark>`);
    });

    if (this.currentSelected && this.isAdding) {
      const safeCurrent = this.currentSelected.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      );
      const regex = new RegExp(`(${safeCurrent})(?![^<]*<\\/mark>)`, 'g');
      html = html.replace(regex, `<mark class="temporary">$1</mark>`);
    }

    this.highlightedContent = html.replace(/\n/g, '<br>');
  }

  startAdding() {
    this.isAdding = true;
    this.currentSelected = '';
    this.draggedSelections = [];
    this.renderHighlightedContent();
  }

  doneAdding() {
    this.isAdding = false;
    this.draggedSelections = [];
    this.currentSelected = '';
    this.renderHighlightedContent();
    this.generatePreviewTables();
  }

  // private generateHighlightedMaskedContent(): void {
  //   let tempHighlightedContent = this.maskedContent;
  //   const maskedValuesToHighlight = new Set(
  //     this.replacementLog.map((log) => log.replaced)
  //   );

  //   maskedValuesToHighlight.forEach((maskedWord) => {
  //     const safeMaskedWord = maskedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  //     const regex = new RegExp(
  //       `(?<!<mark[^>]*>)(?<=\\b)(${safeMaskedWord})(?!<\\/mark)(?=\\b)`,
  //       'g'
  //     );

  //     tempHighlightedContent = tempHighlightedContent.replace(
  //       regex,
  //       `<mark class="highlight-masked">$1</mark>`
  //     );
  //   });

  //   this.highlightedMaskedContent = tempHighlightedContent.replace(
  //     /\n/g,
  //     '<br>'
  //   );
  //   console.log(
  //     'Generated highlightedMaskedContent:',
  //     this.highlightedMaskedContent
  //   );
  // }

  private generateHighlightedMaskedContent(): void {
    let tempHighlightedContent = this.maskedContent;
    const maskedValuesToHighlight = new Set(
      this.replacementLog.map((log) => log.replaced)
    );

    maskedValuesToHighlight.forEach((maskedWord) => {
      const safeMaskedWord = maskedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      let regex: RegExp;

      const needsWordBoundary = !/[^\w\s]/.test(maskedWord);

      if (needsWordBoundary) {
        regex = new RegExp(`(?<!<mark[^>]*>)\\b(${safeMaskedWord})\\b(?!<\\/mark)`, 'g');
      } else {
        regex = new RegExp(`(?<!<mark[^>]*>)(${safeMaskedWord})(?!<\\/mark)`, 'g');
      }

      tempHighlightedContent = tempHighlightedContent.replace(
        regex,
        `<mark class="highlight-masked">$1</mark>`
      );
    });

    this.highlightedMaskedContent = tempHighlightedContent.replace(
      /\n/g,
      '<br>'
    );
    console.log(
      'Generated highlightedMaskedContent:',
      this.highlightedMaskedContent
    );
  }
}
