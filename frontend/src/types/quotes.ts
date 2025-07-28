/**
 * Types for market quotes and pricing data
 */

export interface InstrumentQuote {
  strike: number;
  term: number; // in years
  premium: number; // in decimal format (e.g., 0.0112 = 1.12%)
}

export interface InstrumentQuotes {
  [instrumentType: string]: {
    [strike: string]: {
      [term: string]: number;
    };
  };
}

export interface MarketQuotes {
  CAP: InstrumentQuotes['CAP'];
  FLOOR_SELL: InstrumentQuotes['FLOOR_SELL'];
  FLOOR_BUY: InstrumentQuotes['FLOOR_BUY'];
  IRS_FIX: InstrumentQuotes['IRS_FIX'];
}

// Market data from indicative quotes
export const MARKET_QUOTES: MarketQuotes = {
  CAP: {
    '16': {
      '1': 0.0112, '2': 0.0138, '3': 0.0170, '4': 0.0200, '5': 0.0230,
      '6': 0.0254, '7': 0.0276, '8': 0.0295, '9': 0.0311, '10': 0.0326
    },
    '17': {
      '1': 0.0076, '2': 0.0042, '3': 0.0144, '4': 0.0176, '5': 0.0205,
      '6': 0.0231, '7': 0.0253, '8': 0.0272, '9': 0.0289, '10': 0.0304
    },
    '18': {
      '1': 0.0049, '2': 0.0088, '3': 0.0123, '4': 0.0155, '5': 0.0185,
      '6': 0.0211, '7': 0.0233, '8': 0.0253, '9': 0.0270, '10': 0.0286
    },
    '19': {
      '1': 0.0034, '2': 0.0073, '3': 0.0108, '4': 0.0140, '5': 0.0170,
      '6': 0.0195, '7': 0.0218, '8': 0.0238, '9': 0.0255, '10': 0.0271
    },
    '20': {
      '1': 0.0025, '2': 0.0062, '3': 0.0096, '4': 0.0128, '5': 0.0157,
      '6': 0.0183, '7': 0.0205, '8': 0.0225, '9': 0.0242, '10': 0.0258
    }
  },
  FLOOR_SELL: {
    '16': {
      '1': 0.0187, '2': 0.0310, '3': 0.0353, '4': 0.0371, '5': 0.0383,
      '6': 0.0391, '7': 0.0398, '8': 0.0403, '9': 0.0408, '10': 0.0413
    },
    '17': {
      '1': 0.0276, '2': 0.0389, '3': 0.0434, '4': 0.0451, '5': 0.0460,
      '6': 0.0467, '7': 0.0474, '8': 0.0478, '9': 0.0483, '10': 0.0487
    },
    '18': {
      '1': 0.0340, '2': 0.0475, '3': 0.0520, '4': 0.0535, '5': 0.0542,
      '6': 0.0549, '7': 0.0555, '8': 0.0559, '9': 0.0563, '10': 0.0567
    },
    '19': {
      '1': 0.0434, '2': 0.0569, '3': 0.0613, '4': 0.0625, '5': 0.0630,
      '6': 0.0636, '7': 0.0641, '8': 0.0645, '9': 0.0648, '10': 0.0652
    },
    '20': {
      '1': 0.0531, '2': 0.0665, '3': 0.0708, '4': 0.0718, '5': 0.0724,
      '6': 0.0726, '7': 0.0731, '8': 0.0733, '9': 0.0737, '10': 0.0740
    }
  },
  FLOOR_BUY: {
    '14': {
      '1': 0.0155, '2': 0.0284, '3': 0.0340, '4': 0.0370, '5': 0.0395,
      '6': 0.0415, '7': 0.0434, '8': 0.0449, '9': 0.0464, '10': 0.0476
    },
    '15': {
      '1': 0.0205, '2': 0.0346, '3': 0.0407, '4': 0.0438, '5': 0.0466,
      '6': 0.0487, '7': 0.0507, '8': 0.0523, '9': 0.0538, '10': 0.0552
    },
    '16': {
      '1': 0.0263, '2': 0.0414, '3': 0.0478, '4': 0.0510, '5': 0.0540,
      '6': 0.0562, '7': 0.0583, '8': 0.0600, '9': 0.0616, '10': 0.0630
    },
    '17': {
      '1': 0.0328, '2': 0.0486, '3': 0.0553, '4': 0.0587, '5': 0.0617,
      '6': 0.0641, '7': 0.0662, '8': 0.0680, '9': 0.0696, '10': 0.0711
    },
    '18': {
      '1': 0.0401, '2': 0.0565, '3': 0.0632, '4': 0.0667, '5': 0.0698,
      '6': 0.0723, '7': 0.0745, '8': 0.0763, '9': 0.0779, '10': 0.0794
    }
  },
  IRS_FIX: {
    '18': {
      '1': 0.14526, '2': 0.13301, '3': 0.12981, '4': 0.12984, '5': 0.12994,
      '6': 0.13005, '7': 0.13008, '8': 0.13026, '9': 0.13034, '10': 0.13043
    }
  }
};

/**
 * Linear interpolation between two points
 */
const linearInterpolate = (x1: number, y1: number, x2: number, y2: number, x: number): number => {
  return y1 + (y2 - y1) * (x - x1) / (x2 - x1);
};

/**
 * Get premium for a specific instrument, strike and term with interpolation support
 * Supports interpolation both by term and by strike
 */
export const getInstrumentPremium = (
  instrumentType: keyof MarketQuotes,
  strike: number,
  termYears: number
): number | null => {
  const instrument = MARKET_QUOTES[instrumentType];
  if (!instrument) return null;

  // Try exact strike match first
  const exactStrikeData = instrument[strike.toString()];
  if (exactStrikeData) {
    return getTermPremium(exactStrikeData, termYears, instrumentType, strike);
  }

  // If no exact strike match, try strike interpolation
  const availableStrikes = Object.keys(instrument)
    .map(s => parseFloat(s))
    .sort((a, b) => a - b);

  // Find surrounding strikes for interpolation
  let lowerStrike: number | null = null;
  let upperStrike: number | null = null;

  for (const availableStrike of availableStrikes) {
    if (availableStrike < strike) {
      lowerStrike = availableStrike;
    } else if (availableStrike > strike && upperStrike === null) {
      upperStrike = availableStrike;
      break;
    }
  }

  // If we have both lower and upper strikes, interpolate between them
  if (lowerStrike !== null && upperStrike !== null) {
    const lowerStrikeData = instrument[lowerStrike.toString()];
    const upperStrikeData = instrument[upperStrike.toString()];

    if (lowerStrikeData && upperStrikeData) {
      // Get premiums for both strikes at the given term
      const lowerPremium = getTermPremium(lowerStrikeData, termYears, instrumentType, lowerStrike);
      const upperPremium = getTermPremium(upperStrikeData, termYears, instrumentType, upperStrike);

      if (lowerPremium !== null && upperPremium !== null) {
        const interpolatedPremium = linearInterpolate(
          lowerStrike, lowerPremium,
          upperStrike, upperPremium,
          strike
        );
        
        console.log(`📊 Интерполяция по страйкам для ${instrumentType} ${strike}% ${termYears}лет: между ${lowerStrike}%(${(lowerPremium*100).toFixed(2)}%) и ${upperStrike}%(${(upperPremium*100).toFixed(2)}%) = ${(interpolatedPremium*100).toFixed(2)}%`);
        
        return interpolatedPremium;
      }
    }
  }

  // If only lower strike exists, use that
  if (lowerStrike !== null && upperStrike === null) {
    const lowerStrikeData = instrument[lowerStrike.toString()];
    if (lowerStrikeData) {
      return getTermPremium(lowerStrikeData, termYears, instrumentType, lowerStrike);
    }
  }

  // If only upper strike exists, use that
  if (lowerStrike === null && upperStrike !== null) {
    const upperStrikeData = instrument[upperStrike.toString()];
    if (upperStrikeData) {
      return getTermPremium(upperStrikeData, termYears, instrumentType, upperStrike);
    }
  }

  return null;
};

/**
 * Get premium for a specific term with term interpolation
 */
const getTermPremium = (
  strikeData: { [term: string]: number },
  termYears: number,
  instrumentType: keyof MarketQuotes,
  strike: number
): number | null => {
  // Try to get exact match first
  const exactPremium = strikeData[termYears.toString()];
  if (exactPremium !== undefined) {
    return exactPremium;
  }

  // If no exact match, try term interpolation
  const availableTerms = Object.keys(strikeData)
    .map(term => parseInt(term))
    .sort((a, b) => a - b);

  // Find surrounding terms for interpolation
  let lowerTerm: number | null = null;
  let upperTerm: number | null = null;

  for (const term of availableTerms) {
    if (term < termYears) {
      lowerTerm = term;
    } else if (term > termYears && upperTerm === null) {
      upperTerm = term;
      break;
    }
  }

  // If we have both lower and upper bounds, interpolate
  if (lowerTerm !== null && upperTerm !== null) {
    const lowerPremium = strikeData[lowerTerm.toString()];
    const upperPremium = strikeData[upperTerm.toString()];
    
    if (lowerPremium !== undefined && upperPremium !== undefined) {
      const interpolatedPremium = linearInterpolate(
        lowerTerm, lowerPremium,
        upperTerm, upperPremium,
        termYears
      );
      
      console.log(`📊 Интерполяция по срокам для ${instrumentType} ${strike}% ${termYears}лет: между ${lowerTerm}лет(${(lowerPremium*100).toFixed(2)}%) и ${upperTerm}лет(${(upperPremium*100).toFixed(2)}%) = ${(interpolatedPremium*100).toFixed(2)}%`);
      
      return interpolatedPremium;
    }
  }

  // If only lower bound exists, use that (extrapolation down)
  if (lowerTerm !== null && upperTerm === null) {
    const lowerPremium = strikeData[lowerTerm.toString()];
    if (lowerPremium !== undefined) {
      console.log(`📊 Используем ближайший нижний срок для ${instrumentType} ${strike}% ${termYears}лет: ${lowerTerm}лет = ${(lowerPremium*100).toFixed(2)}%`);
      return lowerPremium;
    }
  }

  // If only upper bound exists, use that (extrapolation up)
  if (lowerTerm === null && upperTerm !== null) {
    const upperPremium = strikeData[upperTerm.toString()];
    if (upperPremium !== undefined) {
      console.log(`📊 Используем ближайший верхний срок для ${instrumentType} ${strike}% ${termYears}лет: ${upperTerm}лет = ${(upperPremium*100).toFixed(2)}%`);
      return upperPremium;
    }
  }

  return null;
};

/**
 * Get available strikes for an instrument
 */
export const getAvailableStrikes = (instrumentType: keyof MarketQuotes): number[] => {
  const instrument = MARKET_QUOTES[instrumentType];
  if (!instrument) return [];

  return Object.keys(instrument).map(strike => parseInt(strike)).sort((a, b) => a - b);
};

/**
 * Get available terms for an instrument and strike
 */
export const getAvailableTerms = (instrumentType: keyof MarketQuotes, strike: number): number[] => {
  const instrument = MARKET_QUOTES[instrumentType];
  if (!instrument) return [];

  const strikeData = instrument[strike.toString()];
  if (!strikeData) return [];

  return Object.keys(strikeData).map(term => parseInt(term)).sort((a, b) => a - b);
};

/**
 * Format premium as percentage string
 */
export const formatPremium = (premium: number): string => {
  return `${(premium * 100).toFixed(2)}%`;
};