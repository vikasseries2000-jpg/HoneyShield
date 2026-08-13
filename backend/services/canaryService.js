// server/services/canaryService.js
const crypto = require('crypto');

class CanaryService {
  // Generate a tracked decoy token
  static generateCanaryToken(sourceTag) {
    const tokenId = crypto.randomBytes(16).toString('hex');
    return `hs_canary_${sourceTag}_${tokenId}`;
  }

  // Verify if an incoming authorization header or parameter contains a canary token
  static inspectToken(tokenString) {
    if (typeof tokenString === 'string' && tokenString.includes('hs_canary_')) {
      return {
        isCanary: true,
        details: 'Canary token access detected! Threat source identified.'
      };
    }
    return { isCanary: false };
  }
}

module.CanaryService = CanaryService;