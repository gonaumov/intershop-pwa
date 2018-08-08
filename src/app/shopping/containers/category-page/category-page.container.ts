import { ChangeDetectionStrategy, Component, EventEmitter, OnDestroy, OnInit } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { combineLatest, Observable, Subject } from 'rxjs';
import { filter, map, takeUntil, withLatestFrom } from 'rxjs/operators';
import { CategoryView } from '../../../models/category-view/category-view.model';
import { getCategoryLoading, getSelectedCategory, getSelectedCategoryId } from '../../store/categories';
import { getFilterLoading } from '../../store/filter';
import { LoadMoreProductsForCategory } from '../../store/products';
import { ShoppingState } from '../../store/shopping.state';
import { getPagingLoading } from '../../store/viewconf';

@Component({
  selector: 'ish-category-page-container',
  templateUrl: './category-page.container.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryPageContainerComponent implements OnInit, OnDestroy {
  category$: Observable<CategoryView>;
  categoryLoading$: Observable<boolean>;

  loadMore = new EventEmitter<void>();

  private destroy$ = new Subject();

  constructor(private store: Store<ShoppingState>) {}

  ngOnInit() {
    this.category$ = this.store.pipe(select(getSelectedCategory), filter(e => !!e));

    this.categoryLoading$ = combineLatest(
      this.store.pipe(select(getCategoryLoading)),
      this.store.pipe(select(getFilterLoading)),
      this.store.pipe(select(getPagingLoading))
    ).pipe(map(([a, b, c]) => (a || b) && !c));

    this.loadMore
      .pipe(withLatestFrom(this.store.pipe(select(getSelectedCategoryId))), takeUntil(this.destroy$))
      .subscribe(([, categoryUniqueId]) => this.store.dispatch(new LoadMoreProductsForCategory(categoryUniqueId)));
  }

  ngOnDestroy() {
    this.destroy$.next();
  }
}
