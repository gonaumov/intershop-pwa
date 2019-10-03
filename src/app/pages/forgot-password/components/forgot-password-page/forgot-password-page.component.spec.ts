import { ComponentFixture, TestBed, async } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MockComponent } from 'ng-mocks';

import { ServerHtmlDirective } from 'ish-core/directives/server-html.directive';
import { coreReducers } from 'ish-core/store/core-store.module';
import { ngrxTesting } from 'ish-core/utils/dev/ngrx-testing';

import { ForgotPasswordFormComponent } from '../forgot-password-form/forgot-password-form.component';

import { ForgotPasswordPageComponent } from './forgot-password-page.component';

describe('Forgot Password Page Component', () => {
  let component: ForgotPasswordPageComponent;
  let fixture: ComponentFixture<ForgotPasswordPageComponent>;
  let element: HTMLElement;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        ForgotPasswordPageComponent,
        MockComponent(ForgotPasswordFormComponent),
        MockComponent(ServerHtmlDirective),
      ],
      imports: [RouterTestingModule, TranslateModule.forRoot(), ngrxTesting({ reducers: coreReducers })],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ForgotPasswordPageComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
    expect(element).toBeTruthy();
    expect(() => fixture.detectChanges()).not.toThrow();
  });

  it('should render forgot-password form on forgot-password page', () => {
    fixture.detectChanges();
    expect(element.querySelector('ish-forgot-password-form')).toBeTruthy();
  });
});
