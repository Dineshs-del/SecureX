/**
 * AI Password Generator
 * Context-aware generation based on account type
 */

export type AccountType = 'banking' | 'social' | 'work' | 'shopping' | 'gaming' | 'general';

export interface GeneratorOptions {
  length?: number;
  includeUppercase?: boolean;
  includeLowercase?: boolean;
  includeNumbers?: boolean;
  includeSymbols?: boolean;
  accountType?: AccountType;
  mode?: 'password' | 'passphrase';
}

// EFF wordlist (shortened for mobile)
const WORDLIST = [
  'apple', 'brave', 'cloud', 'dance', 'eagle', 'flame', 'grace', 'happy',
  'ideal', 'joker', 'karma', 'lemon', 'magic', 'noble', 'ocean', 'peace',
  'quest', 'river', 'solar', 'tiger', 'ultra', 'vivid', 'watch', 'xenon',
  'yacht', 'zebra', 'alpha', 'bravo', 'crisp', 'delta', 'ember', 'frost',
  'gleam', 'haven', 'ivory', 'jewel', 'knack', 'lunar', 'maple', 'nexus',
  'orbit', 'prism', 'quick', 'radar', 'storm', 'tower', 'unity', 'valor',
  'vivid', 'willow', 'xerox', 'yield', 'zesty', 'amber', 'blaze', 'cedar',
  'dusk', 'echo', 'fable', 'glyph', 'haste', 'ingot', 'jade', 'kneel',
  'lark', 'mirth', 'nymph', 'oasis', 'pixel', 'quilt', 'raven', 'slate',
];

// Account type profiles
const ACCOUNT_PROFILES: Record<AccountType, GeneratorOptions> = {
  banking: { length: 20, includeUppercase: true, includeLowercase: true, includeNumbers: true, includeSymbols: true },
  work: { length: 16, includeUppercase: true, includeLowercase: true, includeNumbers: true, includeSymbols: true },
  social: { length: 14, includeUppercase: true, includeLowercase: true, includeNumbers: true, includeSymbols: false },
  shopping: { length: 12, includeUppercase: true, includeLowercase: true, includeNumbers: true, includeSymbols: false },
  gaming: { length: 12, includeUppercase: true, includeLowercase: true, includeNumbers: true, includeSymbols: false },
  general: { length: 16, includeUppercase: true, includeLowercase: true, includeNumbers: true, includeSymbols: true },
};

export class PasswordGenerator {

  static generate(options: GeneratorOptions = {}): string {
    const accountType = options.accountType || 'general';
    const profile = ACCOUNT_PROFILES[accountType];
    const config = { ...profile, ...options };

    if (config.mode === 'passphrase') {
      return this.generatePassphrase();
    }

    return this.generatePassword(config);
  }

  static generatePassword(config: GeneratorOptions): string {
    const { length = 16, includeUppercase = true, includeLowercase = true,
      includeNumbers = true, includeSymbols = true } = config;

    let charset = '';
    let guaranteed = '';

    if (includeLowercase) { charset += 'abcdefghijklmnopqrstuvwxyz'; guaranteed += 'a'; }
    if (includeUppercase) { charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; guaranteed += 'A'; }
    if (includeNumbers) { charset += '0123456789'; guaranteed += '1'; }
    if (includeSymbols) { charset += '!@#$%^&*()_+-=[]{}|;:,.<>?'; guaranteed += '!'; }

    if (!charset) charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    let password = guaranteed;
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Shuffle to avoid guaranteed chars being at start
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Generates a memorable passphrase (e.g. "tiger-maple-frost-42")
   * More memorable AND stronger than most passwords
   */
  static generatePassphrase(wordCount: number = 4): string {
    const words: string[] = [];
    for (let i = 0; i < wordCount; i++) {
      words.push(WORDLIST[Math.floor(Math.random() * WORDLIST.length)]);
    }
    const number = Math.floor(Math.random() * 99) + 1;
    return [...words, number.toString()].join('-');
  }

  /**
   * Detects account type from website name
   */
  static detectAccountType(websiteName: string): AccountType {
    const name = websiteName.toLowerCase();
    if (/bank|finance|credit|invest|paypal|chase|wells|citi/.test(name)) return 'banking';
    if (/facebook|instagram|twitter|tiktok|snapchat|reddit|linkedin/.test(name)) return 'social';
    if (/slack|jira|github|gitlab|office|microsoft|google|zoom/.test(name)) return 'work';
    if (/amazon|ebay|shop|store|walmart|target|etsy/.test(name)) return 'shopping';
    if (/steam|epic|xbox|playstation|riot|blizzard|ea\./.test(name)) return 'gaming';
    return 'general';
  }
}