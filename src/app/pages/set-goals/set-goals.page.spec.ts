import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { SetGoalsPage } from './set-goals.page';

describe('SetGoalsPage', () => {
  let component: SetGoalsPage;
  let fixture: ComponentFixture<SetGoalsPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SetGoalsPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(SetGoalsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
