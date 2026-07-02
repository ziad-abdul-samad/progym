import { describe, expect, it } from 'vitest';

import { getPaginationItems } from './pagination-utils';

describe('getPaginationItems', () => {
  it('shows every page for short lists', () => {
    expect(getPaginationItems(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('keeps the final page directly accessible from page one', () => {
    expect(getPaginationItems(1, 12)).toEqual([1, 2, 3, 4, 5, 'ellipsis', 12]);
  });

  it('keeps neighboring pages visible in the middle', () => {
    expect(getPaginationItems(6, 12)).toEqual([1, 'ellipsis', 5, 6, 7, 'ellipsis', 12]);
  });
});
