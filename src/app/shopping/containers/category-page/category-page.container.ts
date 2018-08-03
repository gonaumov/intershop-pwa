import { ChangeDetectionStrategy, Component, EventEmitter, OnDestroy, OnInit } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { combineLatest, Observable, Subject } from 'rxjs';
import { filter, map, takeUntil, withLatestFrom } from 'rxjs/operators';
import { CategoryView } from '../../../models/category-view/category-view.model';
import { Product } from '../../../models/product/product.model';
import { ViewType } from '../../../models/viewtype/viewtype.types';
import { getCategoryLoading, getSelectedCategory, getSelectedCategoryId } from '../../store/categories';
import { getLoadingStatus } from '../../store/filter';
import { LoadMoreProductsForCategory } from '../../store/products';
import { ShoppingState } from '../../store/shopping.state';
import {
  canRequestMore,
  ChangeSortBy,
  ChangeViewType,
  getPagingLoading,
  getPagingPage,
  getSortBy,
  getSortKeys,
  getTotalItems,
  getViewType,
  getVisibleProducts,
  isEndlessScrollingEnabled,
} from '../../store/viewconf';

@Component({
  selector: 'ish-category-page-container',
  templateUrl: './category-page.container.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryPageContainerComponent implements OnInit, OnDestroy {
  category$: Observable<CategoryView>;
  categoryLoading$: Observable<boolean>;
  loadingMore$: Observable<boolean>;
  products$: Observable<Product[]>;
  totalItems$: Observable<number>;
  viewType$: Observable<ViewType>;
  sortBy$: Observable<string>;
  sortKeys$: Observable<string[]>;

  loadMore = new EventEmitter<void>();
  canRequestMore$: Observable<boolean>;
  currentPage$: Observable<number>;
  endlessScrolling$: Observable<boolean>;

  private destroy$ = new Subject();

  constructor(private store: Store<ShoppingState>) {}

  ngOnInit() {
    this.category$ = this.store.pipe(select(getSelectedCategory), filter(e => !!e));
    this.loadingMore$ = this.store.pipe(select(getPagingLoading));
    this.categoryLoading$ = combineLatest(
      this.store.pipe(select(getCategoryLoading)),
      this.store.pipe(select(getLoadingStatus)),
      this.loadingMore$
    ).pipe(map(([a, b, c]) => (a || b) && !c));

    this.products$ = this.store.pipe(select(getVisibleProducts));
    this.totalItems$ = this.store.pipe(select(getTotalItems));
    this.viewType$ = this.store.pipe(select(getViewType));
    this.sortBy$ = this.store.pipe(select(getSortBy));
    this.sortKeys$ = this.store.pipe(select(getSortKeys));

    this.canRequestMore$ = this.store.pipe(select(canRequestMore));
    this.endlessScrolling$ = this.store.pipe(select(isEndlessScrollingEnabled));
    this.loadMore
      .pipe(
        withLatestFrom(this.store.pipe(select(getSelectedCategoryId)), this.canRequestMore$, this.endlessScrolling$),
        filter(([, , moreAvailable, endlessScrolling]) => moreAvailable && endlessScrolling),
        takeUntil(this.destroy$)
      )
      .subscribe(([, categoryUniqueId]) => this.store.dispatch(new LoadMoreProductsForCategory(categoryUniqueId)));

    this.currentPage$ = this.store.pipe(select(getPagingPage), map(x => x + 1));
  }

  ngOnDestroy() {
    this.destroy$.next();
  }

  changeViewType(viewType: ViewType) {
    this.store.dispatch(new ChangeViewType(viewType));
  }

  changeSortBy(sortBy: string) {
    this.store.dispatch(new ChangeSortBy(sortBy));
  }
}
