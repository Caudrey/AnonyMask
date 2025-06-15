import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MaskingFile } from './masking-file';

describe('MaskingFile', () => {
  let component: MaskingFile;
  let fixture: ComponentFixture<MaskingFile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MaskingFile]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MaskingFile);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
