import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BottomNavigationPage } from './bottom-navigation.page';

describe('BottomNavigationPage', () => {
  let component: BottomNavigationPage;
  let fixture: ComponentFixture<BottomNavigationPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BottomNavigationPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
