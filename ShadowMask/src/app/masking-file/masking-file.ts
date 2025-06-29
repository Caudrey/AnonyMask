import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-masking-file',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './masking-file.html',
  styleUrl: './masking-file.scss'
})
export class MaskingFile implements OnInit {
  fileReady = false;
  fileName: String = '';
  // maskedContent = '';
  // originalContent = '';
  //   isGenerating = false;

  originalContent = 'My phone number is 123-456-7890 and my email is john@example.com';
  maskedContent = 'My phone number is ***-***-**** and my email is ****@example.com';

  searchTermsUser: string[] = ['john@example.com', '123-456-7890', 'John', 'ShadowMask'];
  replacementTermsUser: string[] = ['testing@test.com', '0987654321', 'Ash', 'Masked'];

  searchTermsCategory: string[] = ['john@example.com', '123-456-7890', 'John', 'ShadowMask'];
  replacementTermsCategory: string[] = ['[EMAIL]', '[PHONE]', '[NAME]', '[NAME]'];

  searchTermsAllRandomized: string[] = ['john@example.com', '123-456-7890', 'John', 'ShadowMask'];

  searchTermsDataRandomized: string[] = ['john@example.com', '123-456-7890', 'John', 'ShadowMask'];
  replacementTermsRandomized: string[] = [];

  replacementLog: { original: string; replaced: string }[] = [];

  customUserReplacements: string[] = [];

  randomizedPreview: Array<{ ori: string, type: string, result: string }> = [];

  allRandomizedPreview: Array<{ ori: string, type: string, result: string }> = [];

  activePreviewType: 'valueCategory' | 'category' | 'value' | 'all' | 'same' | null = null;

  valueCategoryTable: Array<{ ori: string; type: string; masked: string; count: number }> = [];

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

  ngOnInit(): void {
    this.originalContent = `Hi
    my email
     is john@example.com
      and phone is 1234567890.
      Makan`;
    this.maskedContent = "[MASKED]";
    this.replacementLog = [
      { original: 'john@example.com', replaced: '[EMAIL]' },
      { original: '1234567890', replaced: '[PHONE]' },
    ];
    this.generatePreviewTables();
    this.generateDiffTokens();
    this.fileReady = true;
  }

  isUserFormVisible = false;

  toggleUserForm(): void {
    this.isUserFormVisible = !this.isUserFormVisible;
  }


  onUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.originalContent = reader.result as string;
        this.maskedContent = this.maskPrivacy(this.originalContent);
        console.log("🔍 First Replacement Log:", this.replacementLog);
        this.replacementLog.forEach(log =>
          console.log(`original: ${log.original} | replaced: ${log.replaced}`)
        );
        this.fileName = file.name;
        this.fileReady = true;
      };
      reader.readAsText(file);

      this.generatePreviewTables();
      this.generateDiffTokens();
    }

    console.log("TESTING RANDOMIZED CONTENT")
    console.log(this.randomizeSpecificContent('number', 6)); // "274931"
    console.log(this.randomizeSpecificContent('text', 10));  // "bnksurtyeo"
    console.log(this.randomizeSpecificContent('email', 12)); // "ah6z7q@mjgd.com"
    console.log(this.randomizeSpecificContent('phone', 12)); // "+62892731095"
    console.log(this.randomizeSpecificContent('mixed', 10)); // "zxtqp73920"
    console.log(this.randomizeSpecificContent('date'));     // '2014-06-19'

  }

  maskPrivacy(content: string): string {
    this.replacementLog = []; // Clear previous log
    return content.replace(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      (match) => {
        console.log("REPLACE: " + match)
        this.replacementLog.push({ original: match, replaced:  '[MASKED_EMAIL]'});
        return '[MASKED_EMAIL]';
      });
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
    console.log('Downloading compared file...');
    const blob = new Blob([this.maskedContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'masked-file.txt';
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
    const searchRegex = new RegExp(this.escapeRegExp(searchTerms[i]), 'g');

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
  length: number = 8
  ): string {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    let format: 'email' | 'phone' | 'text' | 'number' | 'mixed' | 'date' = 'text';

    switch (typeOrFormat) {
      case '[EMAIL]':
        format = 'email';
        break;
      case '[PHONE]':
        format = 'phone';
        break;
      case '[NAME]':
        format = 'text';
        break;
      case '[NUMBER]':
        format = 'number';
        break;
      case '[MIXED]':
        format = 'mixed';
        break;
      case '[DATE]':
        format = 'date';
        break;
      default:
        format = typeOrFormat as typeof format;
        break;
    }

    switch (format) {
      case 'number':
        return this.randomStr(length, digits);

      case 'text':
        return this.randomStr(length, letters);

      case 'email': {
        const userLength = Math.floor(length * 0.6);
        const domainLength = Math.max(3, Math.floor(length * 0.3));
        const user = this.randomStr(userLength, letters + digits);
        const domain = this.randomStr(domainLength, letters);
        return `${user}@${domain}.com`;
      }

      case 'phone': {
        const numDigits = Math.max(6, length - 3); // accounting for '+62'
        return '+62' + this.randomStr(numDigits, digits);
      }

      case 'mixed': {
        const numLetters = Math.floor(length / 2);
        const numDigits = length - numLetters;
        return this.randomStr(numLetters, letters) + this.randomStr(numDigits, digits);
      }

      // case 'date': {
      //   // Random date between 2000-01-01 and 2025-12-31
      //   const start = new Date(2000, 0, 1).getTime();
      //   const end = new Date(2025, 11, 31).getTime();
      //   const randomTime = start + Math.random() * (end - start);
      //   const date = new Date(randomTime);
      //   return date.toISOString().split('T')[0]; // e.g. '2014-06-19'
      // }
      case 'date': {
        const year = this.getRandomInt(1900, 2100);
        const month = this.getRandomInt(1, 12);
        const day = this.getRandomDay(year, month);
        const mm = month.toString().padStart(2, '0');
        const dd = day.toString().padStart(2, '0');
        return `${year}-${mm}-${dd}`; // e.g., "1992-04-15"
      }

      default:
        return '';
    }
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
          const replacement = this.randomizeSpecificContent(type, term.length);
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
      const randomized = this.randomizeSpecificContent(type, original.length);    this.replacementTermsRandomized.push(randomized);
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

    this.isCategoryTableVisible = true;
  }

  applyLabelCategoryReplacement(): void {
    this.activePreviewType = 'valueCategory';

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
    // VALUE + CATEGORY Table
    const mapVC = new Map<string, { type: string, masked: string, count: number }>();
    for (let i = 0; i < this.replacementLog.length; i++) {
      const ori = this.replacementLog[i].original;
      const masked = this.replacementLog[i].replaced;

      // Ambil tipe/kategori berdasarkan index dari searchTermsCategory
      const index = this.searchTermsCategory.findIndex(term => term === ori);
      const type = this.replacementTermsCategory[index] || '[UNKNOWN]';

      if (!mapVC.has(ori)) {
        mapVC.set(ori, { type, masked, count: 1 });
      } else {
        mapVC.get(ori)!.count += 1;
      }
    }

    this.generateDiffTokens();

    this.valueCategoryTable = Array.from(mapVC.entries()).map(([ori, val]) => ({
      ori,
      type: val.type,
      masked: val.masked,
      count: val.count
    }));

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

      this.generatePreviewTables();
      this.generateDiffTokens();
      }
    }

  removePreviewRow(word: string): void {
    // Hapus dari searchTerms & replacementTerms
    const idx = this.searchTermsUser.indexOf(word);
    if (idx !== -1) {
      this.searchTermsUser.splice(idx, 1);
      this.replacementTermsUser.splice(idx, 1);
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
  }

  handleClick(buttonId: string): void {
    this.clickedButton = buttonId;
  }

  resetAllPreviews() {
  this.activePreviewType = null;
  // this.clickedButton = null;
  this.clickedPartialButton = null;
  this.replacementLog = [];
  this.valueCategoryTable = [];
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

    this.replacementLog = [];
    this.activePreviewType = null;
    this.valueCategoryTable = [];
    this.categoryOnlyTable = [];
    this.valueOnlyTable = [];

    const originalWords = this.originalContent.trim().split(/\s+/);
    const maskedWords = this.maskedContent.trim().split(/\s+/);
    const stats: Record<string, { count: number; format?: string }> = {};

    for (let i = 0; i < Math.min(originalWords.length, maskedWords.length); i++) {
      if (originalWords[i] !== maskedWords[i]) {
        const word = maskedWords[i];

        if (!stats[word]) {
          stats[word] = { count: 0 };
        }

        stats[word].count += 1;

        if (type === 'prefix-suffix') {
          const prefix = word.slice(0, 2);
          const suffix = word.slice(-2);
          stats[word].format = `${prefix}...${suffix}`;
        }
      }
    }

    this.partialMaskedStats = Object.entries(stats).map(([word, info]) => ({
      word,
      count: info.count,
      format: info.format,
    }));
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

    const splitTokens = (text: string) =>
      text.split(/(\s+)/).map(word => ({
        word,
        changed: targets.includes(word.trim())
      }));

    this.originalTokensWithDiff = splitTokens(this.originalContent);
    this.maskedTokensWithDiff = splitTokens(this.maskedContent);
  }

}
