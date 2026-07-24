const BADGE_IMG = {
  gold: '/badges/gold.png',
  silver: '/badges/silver.png',
  bronze: '/badges/bronze.png',
  none: '/badges/none.png',
};

export function badgeImage(tier) {
  return BADGE_IMG[tier] || BADGE_IMG.none;
}

export function computeMonthlyMedals(records) {
  const now = new Date();
  const countsByMonth = {};
  records.forEach((r) => {
    const d = new Date(r.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    countsByMonth[key] = (countsByMonth[key] || 0) + 1;
  });

  const months = [];
  for (let i = 3; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  return months.map((key) => {
    const count = countsByMonth[key] || 0;
    const [, m] = key.split('-');
    let tier = 'none';
    let tierLabel = '기록 없음';
    if (count >= 10) { tier = 'gold'; tierLabel = '금 배지'; }
    else if (count >= 5) { tier = 'silver'; tierLabel = '은 배지'; }
    else if (count >= 1) { tier = 'bronze'; tierLabel = '동 배지'; }
    return { key, monthLabel: `${parseInt(m, 10)}월`, tier, tierLabel, count, dim: count === 0 };
  });
}
