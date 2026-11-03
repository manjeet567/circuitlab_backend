export interface ResistorBandColors {
  band1: string;
  band2: string;
  multiplier: string;
  tolerance: string;
}

const DIGIT_COLORS: Record<number, string> = {
  0: '#111827', // Black
  1: '#78350f', // Brown
  2: '#dc2626', // Red
  3: '#ea580c', // Orange
  4: '#facc15', // Yellow
  5: '#16a34a', // Green
  6: '#2563eb', // Blue
  7: '#9333ea', // Violet
  8: '#6b7280', // Grey
  9: '#ffffff', // White
};

const MULTIPLIER_COLORS: Record<number, string> = {
  [-2]: '#c0c0c0', // Silver (0.01)
  [-1]: '#d97706', // Gold (0.1)
  0: '#111827',    // Black (1)
  1: '#78350f',    // Brown (10)
  2: '#dc2626',    // Red (100)
  3: '#ea580c',    // Orange (1k)
  4: '#facc15',    // Yellow (10k)
  5: '#16a34a',    // Green (100k)
  6: '#2563eb',    // Blue (1M)
  7: '#9333ea',    // Violet (10M)
};

export function getResistorColorBands(resistance: number, tolerance: number = 5): ResistorBandColors {
  if (resistance <= 0) {
    return {
      band1: DIGIT_COLORS[0],
      band2: DIGIT_COLORS[0],
      multiplier: MULTIPLIER_COLORS[0],
      tolerance: '#d97706',
    };
  }

  // Convert resistance to scientific notation: val = mantissa * 10^exp
  const str = resistance.toExponential();
  const [mantissaStr, expStr] = str.split('e');
  const exp = parseInt(expStr, 10);
  const mantissa = parseFloat(mantissaStr);

  // Two significant digits
  const twoDigits = Math.round(mantissa * 10);
  const d1 = Math.floor(twoDigits / 10);
  const d2 = twoDigits % 10;
  const multExp = exp - 1;

  const band1 = DIGIT_COLORS[d1] || DIGIT_COLORS[0];
  const band2 = DIGIT_COLORS[d2] || DIGIT_COLORS[0];
  const multiplier = MULTIPLIER_COLORS[multExp] || '#111827';

  let tolColor = '#d97706'; // Gold 5% default
  if (tolerance === 1) tolColor = '#78350f'; // Brown
  else if (tolerance === 2) tolColor = '#dc2626'; // Red
  else if (tolerance === 10) tolColor = '#c0c0c0'; // Silver

  return { band1, band2, multiplier, tolerance: tolColor };
}
