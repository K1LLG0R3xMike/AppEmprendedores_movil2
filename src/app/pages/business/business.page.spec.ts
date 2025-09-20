import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BusinessPage } from './business.page';

describe('BusinessPage', () => {
  let component: BusinessPage;
  let fixture: ComponentFixture<BusinessPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BusinessPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
