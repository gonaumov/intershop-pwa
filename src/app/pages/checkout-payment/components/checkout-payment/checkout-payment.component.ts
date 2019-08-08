import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FormlyFormOptions } from '@ngx-formly/core';
import { Subject } from 'rxjs';
import { filter, take, takeUntil } from 'rxjs/operators';

import { FeatureToggleService } from 'ish-core/feature-toggle.module';
import { Basket } from 'ish-core/models/basket/basket.model';
import { HttpError } from 'ish-core/models/http-error/http-error.model';
import { PaymentInstrument } from 'ish-core/models/payment-instrument/payment-instrument.model';
import { PaymentMethod } from 'ish-core/models/payment-method/payment-method.model';
import { markAsDirtyRecursive } from 'ish-shared/forms/utils/form-utils';

/**
 * The Checkout Payment Component renders the checkout payment page. On this page the user can select a payment method. Some payment methods require the user to enter some additional data, like credit card data. For some payment methods there is special javascript functionality necessary provided by an external payment host. See also {@link CheckoutPaymentPageContainerComponent}
 *
 * @example
 * <ish-checkout-payment
 [basket]="basket$ | async"
 [paymentMethods]="paymentMethods$ | async"
 [error]="basketError$ | async"
 (updatePaymentMethod)="updateBasketPaymentMethod($event)"
 (createPaymentInstrument)="createBasketPaymentInstrument($event)"
 (deletePaymentInstrument)="deletePaymentInstrument($event)"
 (nextStep)="nextStep()"
></ish-checkout-payment>
 */
@Component({
  selector: 'ish-checkout-payment',
  templateUrl: './checkout-payment.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutPaymentComponent implements OnInit, OnChanges, OnDestroy {
  @Input() basket: Basket;
  @Input() paymentMethods: PaymentMethod[];
  @Input() error: HttpError;

  @Output() updatePaymentMethod = new EventEmitter<string>();
  @Output() createPaymentInstrument = new EventEmitter<PaymentInstrument>();
  @Output() deletePaymentInstrument = new EventEmitter<string>();
  @Output() nextStep = new EventEmitter<void>();

  paymentForm: FormGroup;
  model = {};
  options: FormlyFormOptions = {};

  filteredPaymentMethods: PaymentMethod[] = [];

  nextSubmitted = false;
  formSubmitted = false;
  experimental = false;

  redirectStatus: string;

  private openFormIndex = -1; // index of the open parameter form

  private destroy$ = new Subject();

  constructor(private route: ActivatedRoute, private router: Router, private featureToggle: FeatureToggleService) {}

  /**
   * create payment form
   */
  ngOnInit() {
    // if experimental feature is on, payment redirect payment method is allowed
    this.experimental = this.featureToggle.enabled('experimental');

    this.paymentForm = new FormGroup({
      name: new FormControl(this.getBasketPayment()),
      parameters: new FormGroup({}),
    });

    // trigger update payment method if payment selection changes and there are no form parameters
    this.paymentForm
      .get('name')
      .valueChanges.pipe(
        filter(paymentInstrumentId => paymentInstrumentId !== this.getBasketPayment()),
        takeUntil(this.destroy$)
      )
      .subscribe(id => this.updatePaymentMethod.emit(id));

    // if page is shown after cancelled/faulty redirect determine error message variable
    this.route.queryParamMap.pipe(take(1)).subscribe(params => {
      const redirect = params.get('redirect');
      this.redirectStatus = redirect;
    });
  }

  get parameterForm(): FormGroup {
    return this.paymentForm.get('parameters') as FormGroup;
  }

  private getBasketPayment(): string {
    return this.basket && this.basket.payment ? this.basket.payment.paymentInstrument.id : '';
  }

  ngOnChanges(c: SimpleChanges) {
    if (c.basket) {
      this.setPaymentSelectionFromBasket();
    }

    if (c.paymentMethods) {
      this.filterPaymentMethods();
    }
  }

  /**
   * Reset payment selection with current values from basket
   * Should be used for initialization when basket data is changed
   * invoked by `ngOnChanges()`, important in case of an error
   */
  private setPaymentSelectionFromBasket() {
    if (!this.paymentForm) {
      return;
    }

    this.paymentForm.get('name').setValue(this.getBasketPayment(), { emitEvent: false });
    this.openFormIndex = -1; // close parameter form after successfully basket changed
    this.parameterForm.reset();
  }

  /**
   * filter out payment methods with capability `RedirectBeforeCheckout`, if experimental features are not enabled
   */
  private filterPaymentMethods() {
    if (this.experimental) {
      this.filteredPaymentMethods = this.paymentMethods;
    } else {
      this.filteredPaymentMethods = this.paymentMethods.filter(
        pm => !pm.capabilities || !pm.capabilities.some(cap => cap.startsWith('Redirect') && pm.id.startsWith('ISH'))
      );
    }
  }

  /**
   * Determine whether payment parameter form for a payment method is opened or not
   * @param index Numerical index of the parameter form to get info from
   */
  formIsOpen(index: number): boolean {
    return index === this.openFormIndex;
  }

  /**
   * Determine whether payment cost threshold has been reached
   * for usage in template
   */
  paymentCostThresholdReached(paymentMethod: PaymentMethod) {
    return (
      paymentMethod.paymentCostsThreshold && paymentMethod.paymentCostsThreshold.value <= this.basket.totals.total.value
    );
  }

  /**
   * Determine whether there are payment methods present
   * for usage in template
   */
  get hasPaymentMethods() {
    return this.filteredPaymentMethods && this.filteredPaymentMethods.length > 0;
  }

  /**
   * opens the payment parameter form for a payment method to create a new payment instrument
   */
  openPaymentParameterForm(index: number) {
    this.formSubmitted = false;
    this.openFormIndex = index;

    // enable / disable the appropriate parameter form controls
    Object.keys(this.parameterForm.controls).forEach(key => {
      this.filteredPaymentMethods[index].parameters.find(param => param.key === key)
        ? this.parameterForm.controls[key].enable()
        : this.parameterForm.controls[key].disable();
    });
  }

  /**
   * cancel new payment instrument, hides parameter form
   */
  cancelNewPaymentInstrument() {
    this.openFormIndex = -1;
  }

  /**
   * creates a new payment instrument
   */
  createNewPaymentInstrument(parameters: { name: string; value: string }[]) {
    this.createPaymentInstrument.emit({
      id: undefined,
      paymentMethod: this.filteredPaymentMethods[this.openFormIndex].id,
      parameters,
    });
  }

  /**
   * submits a payment parameter form
   */
  submitParameterForm() {
    if (this.paymentForm.invalid) {
      this.formSubmitted = true;
      markAsDirtyRecursive(this.parameterForm);
      return;
    }

    if (this.openFormIndex === -1) {
      // should never happen
      return;
    }

    const parameters = Object.entries(this.parameterForm.controls)
      .filter(([, control]) => control.enabled && control.value)
      .map(([key, control]) => ({ name: key, value: control.value }));

    this.createNewPaymentInstrument(parameters);
  }

  /**
   * deletes a basket instrument and related payment
   */
  deleteBasketPayment(paymentInstrumentId: string) {
    if (paymentInstrumentId) {
      this.deletePaymentInstrument.emit(paymentInstrumentId);
    }
  }

  /**
   * leads to next checkout page (checkout review)
   */
  goToNextStep() {
    this.nextSubmitted = true;
    if (this.nextDisabled) {
      return;
    }

    if (this.paymentRedirectRequired) {
      // do a hard redirect to payment redirect URL
      location.assign(this.basket.payment.redirectUrl);
    } else {
      this.nextStep.emit();
    }
  }

  get paymentRedirectRequired() {
    return (
      this.basket.payment.capabilities &&
      this.basket.payment.capabilities.includes('RedirectBeforeCheckout') &&
      this.basket.payment.redirectUrl &&
      this.basket.payment.redirectRequired
    );
  }

  get nextDisabled() {
    return (!this.basket || !this.basket.payment) && this.nextSubmitted;
  }

  get submitDisabled() {
    return this.paymentForm.invalid && this.formSubmitted;
  }

  ngOnDestroy() {
    this.destroy$.next();
  }
}
