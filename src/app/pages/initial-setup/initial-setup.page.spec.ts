import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { InitialSetupPage } from './initial-setup.page';

describe('InitialSetupPage', () => {
  let component: InitialSetupPage;
  let fixture: ComponentFixture<InitialSetupPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ InitialSetupPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(InitialSetupPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
