import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnmaskingFile } from './unmasking-file';

describe('UnmaskingFile', () => {
  let component: UnmaskingFile;
  let fixture: ComponentFixture<UnmaskingFile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnmaskingFile]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UnmaskingFile);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
