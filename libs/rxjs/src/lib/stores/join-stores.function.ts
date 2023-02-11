import { merge, using } from 'rxjs';

import {
  combineSelectors,
  createSelectorsCache,
  Flat,
  memoizeWithProxy,
  Selectors,
  SelectorsCache,
  joinAdapters,
} from '@state-adapt/core';

import {
  AddNewBlock,
  EntriesState,
  JoinedSelectors,
  NewBlockAdder,
  StoreBuilder,
  StoreEntries,
} from './join-stores.types';

/**
  ## ![StateAdapt](https://miro.medium.com/max/4800/1*qgM6mFM2Qj6woo5YxDMSrA.webp|width=14) `joinStores`

  `joinStores` is a function that takes in a `StoreEntries extends { [index: string]: StoreLike }` object and returns a `StoreBuilder` function.
  The `StoreBuilder` function can be called again and again with more selector definitions, and finally with no arguments to create a store.

  `joinStores` syntax is identical to that of {@link joinAdapters} so that you can easily switch between the two.
  The difference is that `joinStores` can only define selectors, while `joinAdapters` can define both selectors and reactions.

  #### Example: Combining states from two stores

  ```typescript
  import { joinStores } from '@state-adapt/rxjs';
  import { adapt } from '../configure-state-adapt.ts';

  const store1 = adapt('store1', 1);
  const store2 = adapt('store2', 2);

  const joinedStore = joinStores({ store1, store2 })();

  joinedStore.state$.subscribe(console.log);
  // { store1: 1, store2: 2 }
  ```

  #### Example: Combining selectors from two stores

  ```typescript
  import { createAdapter } from '@state-adapt/core';
  import { joinStores } from '@state-adapt/rxjs';
  import { adapt } from '../configure-state-adapt.ts';

  const adapter = createAdapter<number>()({
    selectors: {
      double: s => s * 2,
    }
  });

  const store1 = adapt(['store1', 1], adapter);
  const store2 = adapt(['store2', 2], adapter);

  const joinedStore = joinStores({ store1, store2 })({
    sum: s => s.store1Double + s.store2Double,
  })();

  joinedStore.sum$.subscribe(console.log);
  // 6
 */
// state => easy
// joined selectors => Map—Grab from each store, prefix object, do merge trick
//
export function joinStores<SE extends StoreEntries>(
  storeEntries: SE,
): NewBlockAdder<Flat<EntriesState<SE>>, JoinedSelectors<SE>, SE> {
  // The initial selectors defined in `combineSelectors` are selecting against State.
  // Here, we are defining the initial selectors. The result includes
  // a selector for each piece of state. The developer only defines the 2nd+ selector group.

  const namespaces = Object.keys(storeEntries) as (string & keyof SE)[];
  const joinedSelectors: Selectors<any> = {};

  const cache = createSelectorsCache();
  const getCacheOverride = (sharedChildCache: SelectorsCache) => {
    // Use this join's cache instead of the one from future joins
    // But register future joins' caches as children
    if (sharedChildCache) {
      cache.__children[sharedChildCache.__id] = sharedChildCache;
    }
    return cache;
  };

  joinedSelectors.state = memoizeWithProxy()(
    'state',
    joinedSelectors,
    s => {
      const newState = {} as any;
      namespaces.forEach(key => {
        newState[key] = s[key];
      });
      return newState;
    },
    getCacheOverride,
  );

  namespaces.forEach(namespace => {
    // Already cached selectors to be made available under new names
    // to be used in subsequent selector definitions.
    const fullSelectors = storeEntries[namespace].__.fullSelectors;
    for (const selectorName in fullSelectors) {
      const selector = fullSelectors[selectorName];
      if (selectorName === 'state') {
        joinedSelectors[namespace] = selector;
      } else {
        const newSelectorName = `${namespace}${
          selectorName.charAt(0).toUpperCase() + selectorName.substr(1)
        }`;
        joinedSelectors[newSelectorName] = selector;
      }
    }
  });

  return addNewBlock({
    storeEntries,
    namespaces,
    selectors: joinedSelectors,
    getCacheOverride,
  });
}

function addNewBlock<SB extends StoreBuilder<any, any, any>>(
  builder: SB,
): ReturnType<AddNewBlock<any, any, any>> {
  return <NewS extends Selectors<any>>(newS?: NewS) => {
    if (newS)
      return addNewBlock({
        ...builder,
        selectors: combineSelectors<any>()<any, any, any>(
          builder.selectors,
          newS,
          // These new selectors will ignore the cache objects (if any) given to them
          // Instead, attach that cache object as a child of this joined store's cache object
          builder.getCacheOverride,
        ),
      });

    // Done
    const { namespaces, selectors, storeEntries } = builder;
    const select = storeEntries[namespaces[0]].__.select;

    const requireAllSources$ = merge(
      ...namespaces.map(namespace => storeEntries[namespace].__.requireSources$),
    );

    const joinedStore = {
      __: {
        fullSelectors: selectors,
        requireSources$: requireAllSources$,
        select: select,
      },
    } as any;

    for (const selectorName in selectors) {
      joinedStore[selectorName + '$'] = using(
        () => requireAllSources$.subscribe(),
        () => select(selectors[selectorName]),
      );
    }

    return joinedStore;
  };
}
