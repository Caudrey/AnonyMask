import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
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
  styleUrl: './masking-file.scss'
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
  replacementTermsCategory: string[] = [];

  searchTermsAllRandomized: string[] = [];

  searchTermsDataRandomized: string[] = [];
  replacementTermsRandomized: string[] = [];

  replacementLog: { original: string; replaced: string }[] = [];

  customUserReplacements: string[] = [];

  randomizedPreview: Array<{ ori: string, type: string, result: string }> = [];

  allRandomizedPreview: Array<{ ori: string, type: string, result: string }> = [];

  activePreviewType: 'category' | 'value' | 'all' | 'same' | null = null;

  categoryOnlyTable: Array<{ ori: string; type: string; masked: string; count: number }> = [];

  valueOnlyTable: Array<{ ori: string; type: string; masked: string }> = [];

  selectedMaskType: 'partial' | 'full' | null = null;

  clickedPartialButton: string | null = null;

  partialMaskedStats: { word: string; count: number; format?: string }[] = [];
  originalTokensWithDiff: { word: string; changed: boolean }[] = [];
  maskedTokensWithDiff: { word: string; changed: boolean }[] = [];

  isClicked = false;
  clickedButton: string = '';
  maskingStyle: 'redact' | 'full' | 'partial' = 'redact';
  selectedModel: 'explicit' | 'implicit' = 'explicit';

  draggedSelections: string[] = [];
  highlightedOriginalContent: string = '';

  currentSelected: string = '';
  highlightedContent: string = '';

  isAdding: boolean = false;

  @ViewChild('originalContentPre', { static: false }) originalContentPre!: ElementRef;



  constructor(private apiService: ApiService) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString();
  }

  ngOnInit(): void {
    // this.originalContent = `Hi
    // my email
    //  is john@example.com
    //   and phone is 1234567890.
    //   Makan`;
    // this.maskedContent = "[MASKED]";
    // this.replacementLog = [
    //   { original: 'john@example.com', replaced: '[EMAIL]' },
    //   { original: '1234567890', replaced: '[PHONE]' },
    // ];
    // this.generatePreviewTables();
    // this.generateDiffTokens();
    // this.fileReady = true;
  }

  isUserFormVisible = false;

  toggleUserForm(): void {
    this.isUserFormVisible = !this.isUserFormVisible;
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
      'text/csv'
    ];
    // 🔒 Reject unsupported file types BEFORE any processing
    if (!supportedTypes.includes(input.files?.[0].type)) {
      alert(`❌ Unsupported file type: ${input.files?.[0].name}\nPlease upload a .txt, .pdf, .docx, .xlsx, .xls, or .csv file.`);
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
      };
      reader.readAsText(file);

      this.generatePreviewTables();
      this.generateDiffTokens();

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
        this.originalContent = text;
        this.processOriginalContent();
      };
      reader.readAsArrayBuffer(file);

      this.generatePreviewTables();
      this.generateDiffTokens();

    // DOCX
    } else if ( fileType === supportedTypes[2]) {
      reader.onload = async () => {
        const result = await mammoth.extractRawText({ arrayBuffer: reader.result as ArrayBuffer });
        this.originalContent = result.value.replace(/\n\n/g, '\n');
        this.processOriginalContent();
      };

      reader.readAsArrayBuffer(file);

      this.generatePreviewTables();
      this.generateDiffTokens();

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

        this.originalContent = result;
        this.processOriginalContent();
      };
      reader.readAsArrayBuffer(file);

      this.generatePreviewTables();
      this.generateDiffTokens();

    } else {
      alert('Unsupported file type. Please upload .txt, .pdf, or .docx');
    }
  }

  selectModel(modelType: 'explicit' | 'implicit'): void {
    // Don't re-process if the same model is clicked again or if no file is ready

    console.log("Haii" + modelType + this.selectedModel)

    if (!this.fileReady || this.selectedModel === modelType) {
      return;
    }

    this.selectedModel = modelType;

    this.activePreviewType = null;
    this.selectedMaskType = null;
    this.clickedButton = '';
    this.clickedPartialButton = null;

    this.categoryOnlyTable = [];
    this.valueOnlyTable = [];
    this.allRandomizedPreview = [];
    this.randomizedPreview = [];
    this.partialMaskedStats = [];
    this.originalTokensWithDiff = [];
    this.maskedTokensWithDiff = [];

    // **NEW:** Also reset the main masked content display to the original text
    // This provides immediate visual feedback that a reset has occurred.
    if (this.originalContent) {
        this.maskedContent = this.originalContent;
    }

    this.processOriginalContent(); // Re-process the original content with the new model
  }

  processOriginalContent(): void {

    this.maskPrivacy(this.originalContent).subscribe({
          next: (resultString) => {
            // This code runs ONLY after the API call is successful
            console.log("API call successful, result received!");
            this.maskedContent = resultString;


            // The replacementLog is now set by the API response, so we can generate tables
            this.generateDiffTokens();
            this.generatePreviewTables();
            this.addPredictionsToSearchLists(this.replacementLog);
            console.log("Haii" + this.categoryOnlyTable)
            this.fileReady = true;
            this.isGenerating = false;
            console.log("Log generated from APIS:", this.replacementLog)
          },
          error: (err) => {
            console.error("API Error:", err);
            this.isGenerating = false;
            this.fileReady = false; // Optionally show an error state
          }
        });

  }


  // maskPrivacy(content: string): string {
  //   this.replacementLog = []; // Clear previous log
  //   return content.replace(
  //     /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  //     (match) => {
  //       console.log("REPLACE: " + match)
  //       this.replacementLog.push({ original: match, replaced:  '[MASKED_EMAIL]'});
  //       return '[MASKED_EMAIL]';
  //     });
  // }


  maskPrivacy(content: string): Observable<string> {
    if (this.selectedModel == 'explicit') {
        return this.apiService.getPredictionsExplicit(content).pipe(
          map(response => {
            const predictions = response.predictions;

            this.replacementLog = [];

            if (!predictions) {
              return content; // Return original content if there are no predictions
            }

            const sortedPredictions = predictions.sort((a: any, b: any) => a.start - b.start);

            let lastIndex = 0;
            const maskedParts: string[] = [];

            sortedPredictions.forEach((p: { word: string, label: string, start: number, end: number }) => {
                if (p.start > lastIndex) {
                    maskedParts.push(content.substring(lastIndex, p.start));
                }

                const replacement = `[${p.label.replace(/^[BI]_/, '')}]`;
                maskedParts.push(replacement);

                this.replacementLog.push({ original: p.word, replaced: replacement });

                lastIndex = p.end;
            });

            if (lastIndex < content.length) {
                maskedParts.push(content.substring(lastIndex));
            }

            const maskedCont = maskedParts.join('');

            console.log("Log generated from API Explicit:", this.replacementLog);
            return maskedCont;
          })
        );
    } else {
      return this.apiService.getPredictionsImplicit(content).pipe(
        map(response => {
            // The API now returns a list of objects with sentence, topics, start, and end
            const predictions = response.predictions;
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
            sortedPredictions.forEach((prediction: { sentence: string, predicted_topics: string[], start: number, end: number }) => {
                const topics = prediction.predicted_topics.join(', ');
                const replacement = `[IMPLICIT: ${topics.toUpperCase()}]`;

                // Replace the content from start to end with the new mask
                maskedCont = maskedCont.substring(0, prediction.start) + replacement + maskedCont.substring(prediction.end);

                // Add a detailed entry to the log
                this.replacementLog.push({ original: prediction.sentence, replaced: replacement });
            });

            // The replacementLog is built in reverse, so we reverse it back for correct UI display
            this.replacementLog.reverse();

            console.log("Log generated from API Implicit:", this.replacementLog);
            return maskedCont; // Return the fully masked content
        })
      );
    }
  }

  addPredictionsToSearchLists(log: { original: string, replaced: string }[]): void {
    console.log("Updating search lists with AI predictions...");
    log.forEach(entry => {
      const originalTerm = entry.original;
      const categoryTerm = entry.replaced; // e.g., '[SALARY]'

      // Check for duplicates before adding to avoid clutter
      if (!this.searchTermsCategory.includes(originalTerm)) {
        // Add to category lists
        this.searchTermsCategory.push(originalTerm);
        this.replacementTermsCategory.push(categoryTerm);

        // Add to user-defined lists (with a generic replacement)
        this.searchTermsUser.push(originalTerm);
        this.replacementTermsUser.push(categoryTerm);

        // Add to randomized lists so they are included in those functions
        this.searchTermsAllRandomized.push(originalTerm);
        this.searchTermsDataRandomized.push(originalTerm);

        console.log(`Added "${originalTerm}" to search lists.`);
      }
    });
  }

  // <-- FIX: New function to sync changes from the editable table back to the master lists
  updateReplacementsFromTable(): void {
    console.log("Applying changes from the preview table...");

    // Iterate over the table that the user can edit
    this.valueOnlyTable.forEach(tableRow => {
      // Find the index of the original term in our master list for user replacements
      const index = this.searchTermsUser.indexOf(tableRow.ori);

      // If the term exists in our master list...
      if (index !== -1) {
        // ...update the corresponding replacement term with the new value from the input
        this.replacementTermsUser[index] = tableRow.masked;
        console.log(`Updated "${tableRow.ori}" to be replaced with "${tableRow.masked}"`);
      }
    });

    // Re-apply the 'Value' masking immediately to reflect the changes in the main view
    this.userMasking();
  }

  getDiffLines(): { line: string; changed: boolean }[] {
    const originalLines = this.originalContent.split('\n');
    const maskedLines = this.maskedContent.split('\n');
    return originalLines.map((line, idx) => ({
      line: maskedLines[idx] || '',
      changed: line !== maskedLines[idx]
    }));
  }

  getDiffLines2(): { original: string; masked: string; changed: boolean }[] {
    const originalLines = this.originalContent.split('\n');
    const maskedLines = this.maskedContent.split('\n');

    const maxLength = Math.max(originalLines.length, maskedLines.length);
    const result = [];

    for (let i = 0; i < maxLength; i++) {
      const original = originalLines[i] || '';
      const masked = maskedLines[i] || '';
      result.push({
        original,
        masked,
        changed: original !== masked
      });
    }

    return result;
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

    // trigger download mapping original to masked in json format
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
    const maxY = 290; // bottom page limit
    const maxWidth = doc.internal.pageSize.getWidth() - 2 * margin;

    let y = margin;
    const lines = this.maskedContent.split('\n');

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

    doc.save('masked_' + this.fileName);
  }

  downloadDocxFile(): void {
    const doc = new Document({
      sections: [{
        properties: {},
        children: this.maskedContent
          .split('\n')
          .map(line => new Paragraph(line))
      }]
    });

    Packer.toBlob(doc).then(blob => {
      this.triggerDownload(blob, this.fileName);
    });
  }

  downloadXlsxFile(): void {
    if (!this.maskedContent) return;

    const sheets = this.maskedContent.split(/Sheet:\s+/).filter(s => s.trim());
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

    const downloadName = this.fileName.replace(/\.[^/.]+$/, '') + '.xlsx';
    this.triggerDownload(blob, downloadName);
  }

  downloadXlsFile(): void {
    if (!this.maskedContent) return;

    const sheets = this.maskedContent.split(/Sheet:\s+/).filter(s => s.trim());
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

    const downloadName = this.fileName.replace(/\.[^/.]+$/, '') + '.xls';
    this.triggerDownload(blob, downloadName);
  }

  downloadCsvFile(): void {
    if (!this.maskedContent) return;

    const sheetBlocks = this.maskedContent.split(/Sheet:\s+/).filter(s => s.trim());

    sheetBlocks.forEach(sheetBlock => {
      const [sheetNameLine, ...lines] = sheetBlock.trim().split('\n');
      const sheetName = sheetNameLine.trim();
      const csvData = lines.join('\n');

      const blob = new Blob([csvData], { type: 'text/csv' });
      const downloadName =  this.fileName.replace(/\.[^/.]+$/, '') + '.csv';
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

  // user masking
  userMasking(): void {
    this.replacementLog = []; // reset log
    this.activePreviewType = 'value';
    this.randomizedPreview = [];
    this.allRandomizedPreview = [];

    this.maskedContent = this.replaceFromArray(
      this.originalContent,
      this.searchTermsUser,
      this.replacementTermsUser
    );

    this.generatePreviewTables();
    this.generateDiffTokens();
  }

  replaceFromArray(content: string, searchTerms: string[], replacementTerms: string[]): string {
    let result = content;
    this.replacementLog = []; // Clear previous log

    for (let i = 0; i < searchTerms.length; i++) {
    const searchRegex = new RegExp('\\b' + this.escapeRegExp(searchTerms[i]) + '\\b', 'g');

    result = result.replace(searchRegex, (match) => {
          this.replacementLog.push({ original: match, replaced: replacementTerms[i] });
          return replacementTerms[i];
    });

    //   // Regex: cari term yang bisa diikuti tanda baca (tapi bukan bagian dari term)
    //   const searchRegex = new RegExp(`\\b(${this.escapeRegExp(searchTerms[i])})([.,!?;:]?)\\b`, 'g');
    //   result = result.replace(searchRegex, (match, p1, punc) => {
    //   this.replacementLog.push({ original: p1, replaced: replacementTerms[i] });
    //   return replacementTerms[i] + (punc || '');
    // });

    }

    return result;
  }

  escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // randomized
  randomStr(length: number, chars: string): string {
    return Array.from({ length }, () =>
      chars[Math.floor(Math.random() * chars.length)]
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
      case '[Mail]':
      case '[Work_Mail]':
        const userLength = Math.floor(length * 0.6);
        const domainLength = Math.max(3, Math.floor(length * 0.3));
        const user = this.randomStr(userLength, letters + digits);
        const domain = this.randomStr(domainLength, letters);
        return `${user}@${domain}.com`;

      // phone number
      case '[Phone_Number]':
      case '[Work_Phone_Number]':
        const number = Math.max(6, length - 3); // accounting for '+62'
        return '+62' + this.randomStr(number, digits);

      // text only
      case '[Name]':
      case '[Nickname]':
      case '[Location]':
      case '[POB]':
      case '[Parent_Name]':
      case '[Username]':
      case '[Criminal_Hist]':
      case '[Edu_Hist]':
      case '[Med_Hist]':
      case '[Occ_Hist]':
      case '[Asset]':
      case '[Address]':
      case '[Race]':
      case '[Religion]':
      case '[Marr_Status]':
      case '[Gender]':
      case '[Blood_Type]':
        return this.randomStr(length, letters);

      // number only
      case '[Balance]':
      case '[Account]':
      case '[Card_Number]':
      case '[NIP]':
      case '[SSN]':
      case '[Salary]':
        return this.randomStr(length, digits);

      // mixed - text and number
      case '[Score]':
        const lettersAdd = '+-';
        const numLettersAdd = word.includes('+') || word.includes('-') ? 1 : 0;
        const numDigits = this.getDigitLengthOnly(word);
        const numLetters = length - numDigits - numLettersAdd;

        return this.randomStr(numLetters, letters) + this.randomStr(numDigits, digits) + this.randomStr(numLettersAdd, lettersAdd);

      // date
      case '[DOB]':
        //   // Random date between 2000-01-01 and 2025-12-31
        //   const start = new Date(2000, 0, 1).getTime();
        //   const end = new Date(2025, 11, 31).getTime();
        //   const randomTime = start + Math.random() * (end - start);
        //   const date = new Date(randomTime);
        //   return date.toISOString().split('T')[0]; // e.g. '2014-06-19'
        const year = this.getRandomInt(1900, 2100);
        const month = this.getRandomInt(1, 12);
        const day = this.getRandomDay(year, month);
        const mm = month.toString().padStart(2, '0');
        const dd = day.toString().padStart(2, '0');
        return `${year}-${mm}-${dd}`; // e.g., "1992-04-15"

      // cm
      case '[Body_Height]':
        length = this.getDigitLengthOnly(word);
        return `${this.randomStr(length || 3, digits)} cm`;

      // kg
      case '[Body_Weight]':
        length = this.getDigitLengthOnly(word);
        return `${this.randomStr(length || 2, digits)} kg`;

      // number/number
      case '[Blood_Pressure]':
        const bpParts = word.split('/');
        const sysLength = this.getDigitLengthOnly(bpParts[0]);
        const diaLength = this.getDigitLengthOnly(bpParts[1] || '');
        return `${this.randomStr(sysLength || 3, digits)}/${this.randomStr(diaLength || 2, digits)} mmHg`;

      // plat
      case '[Plate]':
        const regionLength = Math.random() < 0.5 ? 1 : 2;
        const region = this.randomStr(regionLength, letters);

        const numberLength = Math.max(1, Math.min(4, length - regionLength - 3));
        const numbers = this.randomStr(numberLength, digits);

        const suffixLength = length - regionLength - numberLength - 1;
        const suffix = this.randomStr(Math.max(0, suffixLength), letters);

        return `${region} ${numbers}${suffix ? ' ' + suffix : ''}`;

      // default empty
      default:
        return '';
    }
  }

  getDigitLengthOnly(word: string): number {
    // Cari hanya angka (bisa desimal, tapi ambil integer untuk panjang digit)
    const match = word.match(/\d+/);
    return match ? match[0].length : 0;
  }

  // Generate random int between min and max (inclusive)
  getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Return a valid day of the month for the given year/month
  getRandomDay(year: number, month: number): number {
    const daysInMonth = new Date(year, month, 0).getDate(); // handles leap years too
    return this.getRandomInt(1, daysInMonth);
  }

  allRandomized(): void {
    let result = this.originalContent;
    this.replacementLog = []; // Clear previous log
    this.randomizedPreview = [];
    this.activePreviewType = 'all';

    for (let i = 0; i < this.searchTermsCategory.length; i++) {
      const term = this.searchTermsCategory[i];
      const type = this.replacementTermsCategory[i] || '[TEXT]';

      const searchRegex = new RegExp(this.escapeRegExp(term), 'g');
      result = result.replace(searchRegex, (match) => {
        const replacement = this.randomizeSpecificContent(type, term);
        this.replacementLog.push({ original: match, replaced: replacement });
        return replacement;
      });
    }

    this.maskedContent = result;
    this.generatePreviewTables();
    this.generateDiffTokens();

    console.log("🔍 All Replacement Log:", this.replacementLog);
    this.replacementLog.forEach(log =>
      console.log(`original: ${log.original} | replaced: ${log.replaced}`)
  );

  // this.isPostMaskingOptionsVisible = true;
  }


  sameDataRandomized(): void {
    this.replacementTermsRandomized = [];
    this.replacementLog = [];
    this.randomizedPreview = [];
    this.activePreviewType = 'same';
    this.allRandomizedPreview = [];

    for (let i = 0; i < this.replacementTermsCategory.length; i++) {
      const original = this.searchTermsDataRandomized[i];
      const type = this.replacementTermsCategory[i];
      const randomized = this.randomizeSpecificContent(type, original);
      this.replacementTermsRandomized.push(randomized);
      this.randomizedPreview.push({
        ori: original,
        type: type,
        result: randomized
      });

      this.generatePreviewTables();
      this.generateDiffTokens();
    }

    this.maskedContent = this.replaceFromArray(this.originalContent, this.searchTermsDataRandomized, this.replacementTermsRandomized);

    console.log('🔍 Same Data Replacement Log:', this.replacementLog);
    this.replacementLog.forEach(log =>
      console.log(`original: ${log.original} | replaced: ${log.replaced}`)
    );
  }

  isCategoryTableVisible = false;
  labelCategoryTable: Array<{ category: string, text: string, count: number }> = [];

  labelCategory(): void {
    this.replacementLog = [];

    this.activePreviewType = 'category';
    this.randomizedPreview = [];
    this.allRandomizedPreview = [];

    this.isCategoryTableVisible = true;
    this.applyLabelCategoryReplacement();

    for (let i = 0; i < this.searchTermsCategory.length; i++) {
      const search = this.searchTermsCategory[i];
      const replace = this.replacementTermsCategory[i];
      const regex = new RegExp(this.escapeRegExp(search), 'g');

      let match;
      while ((match = regex.exec(this.originalContent)) !== null) {
        this.replacementLog.push({ original: match[0], replaced: replace });
      }

      this.generatePreviewTables();
      this.generateDiffTokens();
    }

    const categoryMap = new Map<string, { text: string, count: number }>();
    this.replacementLog.forEach(log => {
      const key = `${log.replaced}||${log.original}`;
      if (categoryMap.has(key)) {
        categoryMap.get(key)!.count++;
      } else {
        categoryMap.set(key, { text: log.original, count: 1 });
      }
    });

    this.labelCategoryTable = Array.from(categoryMap.entries()).map(([key, val]) => {
      const [category, text] = key.split('||');
      return {
        category,
        text,
        count: val.count
      };
    });

  }

  applyLabelCategoryReplacement(): void {
    this.replacementLog = [];
    this.randomizedPreview = [];
    this.allRandomizedPreview = [];

    this.maskedContent = this.replaceFromArray(
      this.originalContent,
      this.searchTermsCategory,
      this.replacementTermsCategory
    );

    console.log('✅ Masking Applied (Kategori)');
    this.replacementLog.forEach(log =>
      console.log(`original: ${log.original} | replaced: ${log.replaced}`)
    );

    this.generateDiffTokens();
  }


  applyMaskingStyle(): void {
    const applyMask = (word: string): string => {
      switch (this.maskingStyle) {
        case 'redact': return '[REDACTED]';
        case 'full': return '*'.repeat(word.length);
        case 'partial':
          const visible = Math.ceil(word.length * 0.3);
          return word.slice(0, visible) + '*'.repeat(word.length - visible);
        default: return word;
      }
    };

    // this.replacementLog = this.replacementLog.map(log => {
    //   if (this.excludedWords.includes(log.original)) return log; // skip if excluded
    //   return { original: log.original, replaced: applyMask(log.original) };
    // });
    // Ulangi masking dengan style baru
    this.maskedContent = this.replaceFromArray(
      this.originalContent,
      this.replacementLog.map(l => l.original),
      this.replacementLog.map(l => l.replaced)
    );

    console.log(`🎭 Applied style '${this.maskingStyle}'`);
  }

  generatePreviewTables(): void {
    this.generateDiffTokens();

    // CATEGORY ONLY Table (1 baris per kategori)
    const mapCat = new Map<string, { examples: Set<string>; count: number; type: string }>();

    for (let log of this.replacementLog) {
      const masked = log.replaced;
      const original = log.original;
      const index = this.searchTermsCategory.findIndex(term => term === original);
      const type = this.replacementTermsCategory[index] || '[UNKNOWN]';



      if (!mapCat.has(masked)) {
        mapCat.set(masked, {
          examples: new Set([original]),
          count: 1,
          type: type // simpan type-nya
        });
      } else {
        mapCat.get(masked)!.examples.add(original);
        mapCat.get(masked)!.count += 1;
        // optional: validasi type-nya sama kalau mau aman
      }
    }


    this.categoryOnlyTable = Array.from(mapCat.entries()).map(([masked, data]) => ({
      ori: Array.from(data.examples).join(', '),
      type: data.type,
      masked,
      count: data.count
    }));

    // VALUE ONLY Table (1 baris per original)
    const mapVal = new Map<string, { type: string, masked: string }>();
    for (let i = 0; i < this.replacementLog.length; i++) {
      const ori = this.replacementLog[i].original;
      const masked = this.replacementLog[i].replaced;

      const index = this.searchTermsCategory.findIndex(term => term === ori);
      const type = this.replacementTermsCategory[index] || '[UNKNOWN]';

      mapVal.set(ori, { type, masked }); // biarkan overwrite → ambil latest masking
    }

    this.valueOnlyTable = Array.from(mapVal.entries()).map(([ori, val]) => ({
      ori,
      type: val.type,
      masked: val.masked
    }));
  }

  onWordClick(word: string): void {
    const alreadyExists = this.searchTermsUser.includes(word);
    if (!alreadyExists) {
      this.searchTermsUser.push(word);
      this.replacementTermsUser.push('[USER_ADDED]');

      // Tambah ke log buat preview table
      this.replacementLog.push({ original: word, replaced: '[USER_ADDED]' });

      this.searchTermsCategory.push(word);
      this.replacementTermsCategory.push('[USER_ADDED]');

      // Add to randomized lists so they are included in those functions
      this.searchTermsAllRandomized.push(word);
      this.searchTermsDataRandomized.push(word);

      this.generatePreviewTables();
      this.generateDiffTokens();

      this.userMasking();

      // --- FIX: Refresh partial mask stats if a partial view is active ---
      if (this.clickedPartialButton) {
          this.handlePartialClick(this.clickedPartialButton as 'redact' | 'prefix-suffix');
      }

      }
    }

  removePreviewRow(word: string): void {
    // Hapus dari searchTerms & replacementTerms
    const idx = this.searchTermsUser.indexOf(word);
    if (idx !== -1) {
      this.searchTermsUser.splice(idx, 1);
      this.replacementTermsUser.splice(idx, 1);

      this.searchTermsCategory.splice(idx, 1);
      this.replacementTermsCategory.splice(idx, 1);

      // Add to randomized lists so they are included in those functions
      this.searchTermsAllRandomized.splice(idx, 1);
      this.searchTermsDataRandomized.splice(idx, 1);
    }

    // Hapus dari replacementLog
    this.replacementLog = this.replacementLog.filter(log => log.original !== word);

    // Regenerate maskedContent & preview
    this.maskedContent = this.replaceFromArray(
      this.originalContent,
      this.replacementLog.map(r => r.original),
      this.replacementLog.map(r => r.replaced)
    );
    this.generatePreviewTables();
    this.renderHighlightedContent();
  }

  handleClick(buttonId: string): void {
    this.clickedButton = buttonId;
  }

  resetAllPreviews() {
    this.activePreviewType = null;
    // this.clickedButton = null;
    this.clickedPartialButton = null;
    // this.replacementLog = [];
    this.categoryOnlyTable = [];
    this.valueOnlyTable = [];
    this.allRandomizedPreview = [];
    this.randomizedPreview = [];
    this.partialMaskedStats = [];
  }

  selectMaskType(type: 'partial' | 'full') {
    this.selectedMaskType = type;
  }

  handlePartialClick(type: 'redact' | 'prefix-suffix') {
    this.clickedPartialButton = type;

    // Create a definitive list of PII to mask, combining AI log and user additions.
    const allPiiToMask = [...this.replacementLog];
    this.replacementLog.forEach(log => {
      if (log.replaced === '[USER_ADDED]' && !allPiiToMask.some(p => p.original === log.original)) {
        allPiiToMask.push(log);
      }
    });

    this.replacementLog = [];
    this.activePreviewType = null;
    this.categoryOnlyTable = [];
    this.valueOnlyTable = [];

    const piiToNewMaskMap = new Map<string, string>();
    const usedMasks = new Map<string, string>(); // Key: mask, Value: original word

    allPiiToMask.forEach(logEntry => {
        const originalPii = logEntry.original;
        if (piiToNewMaskMap.has(originalPii)) {
            return;
        }

        let finalMask = '';

        if (type === 'prefix-suffix') {
            // Helper function to generate the initial mask (e.g., "nasi" -> "n**i")
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
            let revealIndex = originalPii.length - 2; // Start revealing from the character before the last one

            // Check for collisions and resolve them by revealing more characters from right-to-left
            while (usedMasks.has(potentialMask) && usedMasks.get(potentialMask) !== originalPii) {
                // Failsafe: if we run out of characters to reveal, append a unique symbol
                if (revealIndex < 1) {
                    potentialMask += `~`;
                    break;
                }

                // Reveal one more character from right-to-left to create a new mask
                const maskArray = potentialMask.split('');
                maskArray[revealIndex] = originalPii[revealIndex];
                potentialMask = maskArray.join('');

                revealIndex--; // Move to the next character to the left for the next potential collision
            }

            finalMask = potentialMask;
            usedMasks.set(finalMask, originalPii); // Store the final, unique mask

        } else { // type === 'redact'
            finalMask = '*'.repeat(originalPii.length);
        }

        piiToNewMaskMap.set(originalPii, finalMask);
    });

    let finalMaskedContent = this.originalContent;
    const stats: Record<string, { count: number; format?: string }> = {};

    piiToNewMaskMap.forEach((newMask, originalPii) => {
        const searchRegex = new RegExp(this.escapeRegExp(originalPii), 'g');
        finalMaskedContent = finalMaskedContent.replace(searchRegex, (match) => {
            this.replacementLog.push({ original: match, replaced: newMask });
            if (!stats[newMask]) {
                stats[newMask] = { count: 0, format: type === 'prefix-suffix' ? newMask : undefined };
            }
            stats[newMask].count += 1;
            return newMask;
        });
    });

    this.maskedContent = finalMaskedContent;

    this.partialMaskedStats = Object.entries(stats).map(([word, info]) => ({
        word,
        count: info.count,
        format: info.format,
    }));

    // Regenerate other UI components that depend on the masked content or logs.
    this.generatePreviewTables();
    this.generateDiffTokens();

    // const originalWords = this.originalContent.trim().split(/\s+/);
    // const maskedWords = this.maskedContent.trim().split(/\s+/);
    // const stats: Record<string, { count: number; format?: string }> = {};

    // for (let i = 0; i < Math.min(originalWords.length, maskedWords.length); i++) {
    //   if (originalWords[i] !== maskedWords[i]) {
    //     const word = maskedWords[i];

    //     if (!stats[word]) {
    //       stats[word] = { count: 0 };
    //     }

    //     stats[word].count += 1;

    //     if (type === 'prefix-suffix') {
    //       const prefix = word.slice(0, 2);
    //       const suffix = word.slice(-2);
    //       stats[word].format = `${prefix}...${suffix}`;
    //     }
    //   }
    // }

    // this.partialMaskedStats = Object.entries(stats).map(([word, info]) => ({
    //   word,
    //   count: info.count,
    //   format: info.format,
    // }));
  }

  onMaskedValueChange(original: string, newMasked: string): void {
    // Update maskedContent berdasarkan replacementLog terbaru
    const updatedLog = this.replacementLog.map(log =>
      log.original === original
        ? { ...log, replaced: newMasked }
        : log
    );

    this.replacementLog = updatedLog;

    // Regenerate masked content
    this.maskedContent = this.replaceFromArray(
      this.originalContent,
      this.replacementLog.map(r => r.original),
      this.replacementLog.map(r => r.replaced)
    );

    this.generatePreviewTables();
    this.generateDiffTokens();
  }

  generateDiffTokens(): void {
    const targets = this.valueOnlyTable.map(item => item.ori);

    const splitTokens = (text: string) => {
    const regex = /Rp\d+(?:[.,]\d+)+|[\w.+-]+@[\w-]+\.[\w.-]+|\[\w+\]|\d+(?:[.,/]\d+)+|\+?\d[\d\-\/\s]+|\d+ cm|\d+ kg|\d+ mmHg|[A-Z][+-]|[\w*]+|[.,!?;:"'()[\]{}]/g;    const matches = text.match(regex) || [];
      return matches.map(word => ({
        word,
        changed: targets.includes(word.trim())
      }));
    };
  //  const splitTokens = (text: string) =>
  //     text.split(/(\s+)/).map(word => ({
  //       word,
  //       changed: targets.includes(word.trim())
  //     }));

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
      mapping: this.replacementLog.map(entry => ({
        original: entry.original,
        masked: entry.replaced
      }))
    };

    const blob = new Blob([JSON.stringify(jsonStructure, null, 2)], {
      type: 'application/json'
    });

    const downloadFileName = this.fileName.replace(/\.[^/.]+$/, '') + '_masking_log.json';
    this.triggerDownload(blob, downloadFileName);
  }

    getHighlightedHTML(content: string, selections: string[]): string {
  let highlighted = content;

  selections.forEach(sel => {
    // Escape special regex characters
    const safeSel = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${safeSel})`, 'g');
    highlighted = highlighted.replace(regex, `<span class="highlight">$1</span>`);
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

    this.highlightedOriginalContent = this.getHighlightedHTML(this.originalContent, this.draggedSelections);

    this.onWordClick(selectedText);
    this.generatePreviewTables();
    selection?.removeAllRanges();
  }



  confirmCurrentSelection(): void {
    if (this.currentSelected && !this.searchTermsUser.includes(this.currentSelected)) {
      this.searchTermsUser.push(this.currentSelected);
      this.currentSelected = '';
      this.renderHighlightedContent();
    }
  }

  renderHighlightedContent(): void {
    let html = this.originalContent;

    this.searchTermsUser.forEach(term => {
      const safeTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${safeTerm})`, 'g');
      html = html.replace(regex, `<mark class="confirmed">$1</mark>`);
    });

    if (this.currentSelected  && this.isAdding) {
      const safeCurrent = this.currentSelected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${safeCurrent})(?![^<]*<\/mark>)`, 'g'); // skip already marked
      html = html.replace(regex, `<mark class="temporary">$1</mark>`);
    }

    this.highlightedContent = html.replace(/\n/g, '<br>');
  }

    onSelectionBound!: () => void;


  startAdding() {
    this.isAdding = true;
    const pre = this.originalContentPre?.nativeElement;
    if (pre) {
      pre.addEventListener('mouseup', this.onSelectionBound);
    }
  }

  doneAdding() {
    this.isAdding = false;
    const pre = this.originalContentPre?.nativeElement;
    if (pre) {
      pre.removeEventListener('mouseup', this.onSelectionBound);
    }
    this.draggedSelections = [];
  }



}
