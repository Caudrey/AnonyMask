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

  randomizedPreview: Array<{ term: string, type: string, result: string }> = [];

  allRandomizedPreview: Array<{ term: string, type: string, result: string }> = [];

  activePreviewType: 'label' | 'same' | 'all' | null = null;

  // Tambahan properti:
  isPostMaskingOptionsVisible = false;
  newWord: string = '';
  excludeWord: string = '';
  excludedWords: string[] = [];
  maskingStyle: 'redact' | 'full' | 'partial' = 'redact';

  // onUpload(event: Event): void {
  //   const input = event.target as HTMLInputElement;
  //   if (input.files?.length) {
  //     this.fileReady = true;
  //     this.isGenerating = true;
  //     setTimeout(() => this.isGenerating = false, 2000); // simulate processing
  //   }
  // }

  ngOnInit(): void {
    this.customUserReplacements = this.searchTermsCategory.map(() => '');
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
    this.activePreviewType = null; // 💥 sembunyikan semua preview tabel
    this.randomizedPreview = [];
    this.allRandomizedPreview = [];

    this.maskedContent = this.replaceFromArray(this.originalContent, this.searchTermsUser, this.replacementTermsUser);

    console.log('🧑‍💻 User Replacement Log:', this.replacementLog);
    this.replacementLog.forEach(log =>
      console.log(`original: ${log.original} | replaced: ${log.replaced}`)
    );
    // You can optionally store this for later use in the UI:
    // this.replacementLog = replacementLog;
  }

  applyCustomUserMasking(): void {
    const effectiveReplacements: string[] = this.searchTermsCategory.map((_, i) =>
      this.customUserReplacements[i]?.trim() || this.replacementTermsCategory[i]
    );

    this.maskedContent = this.replaceFromArray(this.originalContent, this.searchTermsCategory, effectiveReplacements);

    console.log('🧑‍💻 Custom User Masking Applied:', this.replacementLog);
    console.log('🧑‍💻 User Replacement Log:', this.replacementLog);
    this.replacementLog.forEach(log =>
      console.log(`original: ${log.original} | replaced: ${log.replaced}`)
    );
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
    }

    return result;
  }

  // Utility to escape special RegExp characters in search terms
  escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // label category
  // labelCategory(): void {
  //   this.maskedContent = this.replaceFromArray(this.originalContent, this.searchTermsCategory, this.replacementTermsCategory);

  //   console.log('🧑‍💻 Label Category Replacement Log:', this.replacementLog);
  //   this.replacementLog.forEach(log =>
  //     console.log(`original: ${log.original} | replaced: ${log.replaced}`)
  //   );
  //   // You can optionally store this for later use in the UI:
  //   // this.replacementLog = replacementLog;
  // }

  // randomized
  randomStr(length: number, chars: string): string {
    return Array.from({ length }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
  }

  // randomizeSpecificContent(
  // typeOrFormat: '[EMAIL]' | '[PHONE]' | '[NAME]' | '[NUMBER]' | '[MIXED]' | '[DATE]' | '[TEXT]' |
  //         'email' | 'phone' | 'text' | 'number' | 'mixed' | 'date',
  // length: number = 8
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

    console.log("🔍 All Replacement Log:", this.replacementLog);
    this.replacementLog.forEach(log =>
      console.log(`original: ${log.original} | replaced: ${log.replaced}`)
  );

  this.isPostMaskingOptionsVisible = true;
}


sameDataRandomized(): void {
  this.replacementTermsRandomized = [];
  this.randomizedPreview = [];
  this.activePreviewType = 'same';

  for (let i = 0; i < this.replacementTermsCategory.length; i++) {
    const original = this.searchTermsDataRandomized[i];
    const type = this.replacementTermsCategory[i];
    const randomized = this.randomizeSpecificContent(type, original.length);    this.replacementTermsRandomized.push(randomized);
    this.randomizedPreview.push({
      term: original,
      type: type,
      result: randomized
    });
  }

    this.maskedContent = this.replaceFromArray(this.originalContent, this.searchTermsDataRandomized, this.replacementTermsRandomized);

  console.log('🔍 Same Data Replacement Log:', this.replacementLog);
  this.replacementLog.forEach(log =>
    console.log(`original: ${log.original} | replaced: ${log.replaced}`)
  );

  this.isPostMaskingOptionsVisible = true;
}


  isCategoryTableVisible = false;
  labelCategoryTable: Array<{ category: string, text: string, count: number }> = [];

  labelCategory(): void {
    this.replacementLog = [];

      // Reset semua tampilan lain
    this.activePreviewType = 'label';
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
    this.maskedContent = this.replaceFromArray(
      this.originalContent,
      this.searchTermsCategory,
      this.replacementTermsCategory
    );

    console.log('✅ Masking Applied (Kategori)');
    this.replacementLog.forEach(log =>
      console.log(`original: ${log.original} | replaced: ${log.replaced}`)
    );

    this.isPostMaskingOptionsVisible = true;
  }

  addNewWord(): void {
  if (this.newWord.trim()) {
    this.searchTermsUser.push(this.newWord.trim());
    this.replacementTermsUser.push('[USER_ADDED]');
    this.newWord = '';
    alert('Word added to masking list.');
  }
}

excludeWordFromMasking(): void {
  if (this.excludeWord.trim()) {
    this.excludedWords.push(this.excludeWord.trim());
    this.excludeWord = '';
    alert('Word excluded from masking.');
  }
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

  this.replacementLog = this.replacementLog.map(log => {
    if (this.excludedWords.includes(log.original)) return log; // skip if excluded
    return { original: log.original, replaced: applyMask(log.original) };
  });

  // Ulangi masking dengan style baru
  this.maskedContent = this.replaceFromArray(
    this.originalContent,
    this.replacementLog.map(l => l.original),
    this.replacementLog.map(l => l.replaced)
  );

  console.log(`🎭 Applied style '${this.maskingStyle}'`);
}


}
