const BADGE_IMG = {
  gold: '/badges/gold.png',
  silver: '/badges/silver.png',
  bronze: '/badges/bronze.png',
  none: '/badges/none.png',
};

export function badgeImage(tier) {
  return BADGE_IMG[tier] || BADGE_IMG.none;
}

export function tierForCount(count) {
  if (count >= 10) return { tier: 'gold', tierLabel: '금 배지' };
  if (count >= 5) return { tier: 'silver', tierLabel: '은 배지' };
  if (count >= 1) return { tier: 'bronze', tierLabel: '동 배지' };
  return { tier: 'none', tierLabel: '기록 없음' };
}
