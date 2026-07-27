// 인용구/영감 기록을 정사각형 PNG 카드 이미지로 그려주는 순수 canvas 렌더러.
const SIZE = 1080;
const PADDING = 90;

const COLORS = {
  bgFrom: '#e7f6f3',
  bgTo: '#cdeae5',
  quoteMark: '#a9dbd3',
  text: '#1f2724',
  sub: '#5f5d52',
  accent700: '#2f6f69',
  divider: 'rgba(31,39,36,0.12)',
  pillBg: '#ffffff',
};

let iconImagePromise = null;
function loadIcon() {
  if (!iconImagePromise) {
    iconImagePromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = '/icon.png';
    });
  }
  return iconImagePromise;
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function fitQuote(ctx, text, maxWidth, maxHeight) {
  let fontSize = 64;
  let lines = [];
  let lineHeight = 0;
  while (fontSize > 28) {
    ctx.font = `600 ${fontSize}px 'Barlow Condensed'`;
    lineHeight = fontSize * 1.32;
    lines = wrapText(ctx, text, maxWidth);
    if (lines.length * lineHeight <= maxHeight) break;
    fontSize -= 4;
  }
  return { fontSize, lines, lineHeight };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function renderQuoteImage({ text, type, bookTitle, author }) {
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch { /* 폰트 로딩 실패 시 기본 폰트로 진행 */ }
  }

  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  grad.addColorStop(0, COLORS.bgFrom);
  grad.addColorStop(1, COLORS.bgTo);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.fillStyle = COLORS.quoteMark;
  ctx.font = '700 220px Georgia, serif';
  ctx.textBaseline = 'top';
  ctx.fillText('“', PADDING - 20, PADDING - 60);

  const pillLabel = type === 'quote' ? '인용구' : '영감';
  ctx.font = "600 28px 'Barlow'";
  const pillPadX = 26;
  const pillHeight = 52;
  const pillWidth = ctx.measureText(pillLabel).width + pillPadX * 2;
  const pillX = PADDING;
  const pillY = PADDING + 140;
  ctx.fillStyle = COLORS.pillBg;
  roundRect(ctx, pillX, pillY, pillWidth, pillHeight, pillHeight / 2);
  ctx.fill();
  ctx.fillStyle = COLORS.accent700;
  ctx.textBaseline = 'middle';
  ctx.fillText(pillLabel, pillX + pillPadX, pillY + pillHeight / 2 + 2);

  const textAreaX = PADDING;
  const textAreaY = pillY + pillHeight + 60;
  const textAreaWidth = SIZE - PADDING * 2;
  const textAreaHeight = 560;
  const { fontSize, lines, lineHeight } = fitQuote(ctx, text, textAreaWidth, textAreaHeight);
  ctx.fillStyle = COLORS.text;
  ctx.font = `600 ${fontSize}px 'Barlow Condensed'`;
  ctx.textBaseline = 'alphabetic';
  lines.forEach((line, i) => {
    ctx.fillText(line, textAreaX, textAreaY + fontSize + i * lineHeight);
  });

  const dividerY = SIZE - 220;
  ctx.strokeStyle = COLORS.divider;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PADDING, dividerY);
  ctx.lineTo(SIZE - PADDING, dividerY);
  ctx.stroke();

  ctx.fillStyle = COLORS.text;
  ctx.font = "600 34px 'Barlow Condensed'";
  ctx.fillText(bookTitle || '', PADDING, dividerY + 56);
  if (author) {
    ctx.fillStyle = COLORS.sub;
    ctx.font = "400 26px 'Barlow'";
    ctx.fillText(author, PADDING, dividerY + 94);
  }

  try {
    const icon = await loadIcon();
    const iconSize = 56;
    const iconX = SIZE - PADDING - iconSize;
    const iconY = SIZE - PADDING - iconSize + 10;
    ctx.save();
    ctx.beginPath();
    ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(icon, iconX, iconY, iconSize, iconSize);
    ctx.restore();

    ctx.fillStyle = COLORS.accent700;
    ctx.font = "600 26px 'Barlow Condensed'";
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('똑똑', iconX - 12, iconY + iconSize / 2);
    ctx.textAlign = 'left';
  } catch {
    // 아이콘 로드 실패 시 워터마크 없이 진행
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}
