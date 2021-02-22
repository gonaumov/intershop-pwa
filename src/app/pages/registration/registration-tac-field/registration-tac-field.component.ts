import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FieldType } from '@ngx-formly/core';

@Component({
  selector: 'ish-registration-tac-field',
  templateUrl: './registration-tac-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistrationTacFieldComponent extends FieldType {}
