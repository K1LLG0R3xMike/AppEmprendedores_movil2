import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IaPanelPage } from './ia-panel.page';

describe('IaPanelPage', () => {
  let component: IaPanelPage;
  let fixture: ComponentFixture<IaPanelPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(IaPanelPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
