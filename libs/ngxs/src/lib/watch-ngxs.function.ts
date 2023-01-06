import { inject } from '@angular/core';
import { Adapt } from '@state-adapt/rxjs';
import { AdaptNgxs } from './adapt-ngxs.service';

export const watchNgxs: Adapt['watch'] = <T extends any[]>(...args: T) => {
  const adaptDep = inject(AdaptNgxs); // Needs it from NgRx store
  return (adaptDep.watch as any)(...args);
};
