import { VaultCredential } from '../store/vaultStore';

const COMMON_PASSWORDS = [
  'password', '123456', 'password123', 'qwerty',
  'abc123', 'letmein', 'monkey', '1234567890',
  'iloveyou', 'admin', 'welcome', 'login',
  'dragon', 'master', 'hello', 'shadow',
];

export interface AuditIssue {
  id: string;
  credential: VaultCredential;
  type: 'breached' | 'weak' | 'reused' | 'old';
  reason: string;
  tagText: string;
  tagColor: string;
  priority: number; // 1: breached, 2: weak, 3: reused, 4: old
}

export interface SecurityAuditResult {
  score: number;
  breachedCount: number;
  weakCount: number;
  reusedCount: number;
  oldCount: number;
  issues: AuditIssue[];
  totalProblems: number;
}

export function analyzeVaultSecurity(credentials: VaultCredential[]): SecurityAuditResult {
  const total = credentials.length;
  if (total === 0) {
    return {
      score: 100,
      breachedCount: 0,
      weakCount: 0,
      reusedCount: 0,
      oldCount: 0,
      issues: [],
      totalProblems: 0,
    };
  }

  // Count password occurrences for reuse detection
  const passMap: Record<string, VaultCredential[]> = {};
  credentials.forEach((c) => {
    if (c.password) {
      const pw = c.password;
      if (!passMap[pw]) passMap[pw] = [];
      passMap[pw].push(c);
    }
  });

  let breachedCount = 0;
  let weakCount = 0;
  let reusedCount = 0;
  let oldCount = 0;

  const issueMap = new Map<string, AuditIssue>();
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  credentials.forEach((c) => {
    const pw = c.password || '';
    const issuesForCred: {
      type: 'breached' | 'weak' | 'reused' | 'old';
      reason: string;
      priority: number;
      tagText: string;
      tagColor: string;
    }[] = [];

    // 1. Breached
    if (c.breached) {
      breachedCount++;
      issuesForCred.push({
        type: 'breached',
        reason: 'Appears in known data breaches',
        priority: 1,
        tagText: 'BREACHED',
        tagColor: '#ff4d6d',
      });
    }

    // 2. Weak
    const isWeak =
      pw.length < 10 ||
      /^[a-z]+$/.test(pw) ||
      /^[A-Z]+$/.test(pw) ||
      /^[0-9]+$/.test(pw) ||
      COMMON_PASSWORDS.includes(pw.toLowerCase());

    if (isWeak) {
      weakCount++;
      issuesForCred.push({
        type: 'weak',
        reason: pw.length < 10 ? 'Password is shorter than 10 characters' : 'Password is weak or common',
        priority: 2,
        tagText: 'WEAK',
        tagColor: '#f5a623',
      });
    }

    // 3. Reused
    const sharedWith = passMap[pw]?.filter((other) => other.id !== c.id);
    if (sharedWith && sharedWith.length > 0) {
      reusedCount++;
      const otherName = sharedWith[0].name || 'another account';
      issuesForCred.push({
        type: 'reused',
        reason: `Same password as ${otherName}`,
        priority: 3,
        tagText: 'REUSED',
        tagColor: '#f5a623',
      });
    }

    // 4. Old (365 days+)
    const createdDate = new Date(c.createdAt || c.lastAccessed || now).getTime();
    if (now - createdDate >= oneYearMs) {
      oldCount++;
      issuesForCred.push({
        type: 'old',
        reason: 'Not changed for over 1 year',
        priority: 4,
        tagText: 'OLD',
        tagColor: '#06d6a0',
      });
    }

    if (issuesForCred.length > 0) {
      issuesForCred.sort((a, b) => a.priority - b.priority);
      const worst = issuesForCred[0];
      issueMap.set(c.id, {
        id: c.id,
        credential: c,
        type: worst.type,
        reason: worst.reason,
        tagText: worst.tagText,
        tagColor: worst.tagColor,
        priority: worst.priority,
      });
    }
  });

  const issues = Array.from(issueMap.values()).sort((a, b) => a.priority - b.priority);

  // Score formula: Start at 100, -25 breached, -12 weak, -8 reused, -4 old
  let score = 100 - (breachedCount * 25) - (weakCount * 12) - (reusedCount * 8) - (oldCount * 4);
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    breachedCount,
    weakCount,
    reusedCount,
    oldCount,
    issues,
    totalProblems: issues.length,
  };
}
