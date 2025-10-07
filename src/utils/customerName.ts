type AnyRecord = Record<string, unknown>;

export const extractAccountSegments = (rawValue?: string | null): string[] => {
  if (!rawValue) {
    return [];
  }

  return String(rawValue)
    .split(/\r?\n+/)
    .flatMap((segment) => segment.split(/[;,]+/))
    .map((segment) =>
      segment
        .replace(/^(account|customer|client)\s*:?\s*/i, '')
        .trim(),
    )
    .filter(Boolean);
};

const normalizeKeyToTokens = (key: string): string[] =>
  key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-.]+/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

const DATE_TIME_INDICATOR_TOKENS = new Set([
  'date',
  'time',
  'expiration',
  'expires',
  'effective',
  'start',
  'end',
  'timestamp',
]);

const ISO_DATE_PATTERN = /^(\d{4}-\d{2}-\d{2})(?:[T\s]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

export const isLikelyAccountKey = (key: string | undefined): key is string => {
  if (!key) {
    return false;
  }

  const tokens = normalizeKeyToTokens(key);
  if (tokens.length === 0) {
    return false;
  }

  const hasAccountToken = tokens.some((token) => token === 'account' || token === 'accounts' || token === 'acct');
  const hasCustomerNameTokens = tokens.includes('customer') && tokens.includes('name');
  const hasClientNameTokens = tokens.includes('client') && tokens.includes('name');

  if (!hasAccountToken && !hasCustomerNameTokens && !hasClientNameTokens) {
    return false;
  }

  const hasExcludedToken = tokens.some((token) => token.startsWith('accounting') || token.startsWith('unaccount'));
  if (hasExcludedToken) {
    return false;
  }

  const hasDateTimeToken = tokens.some((token) => DATE_TIME_INDICATOR_TOKENS.has(token));
  if (hasDateTimeToken) {
    return false;
  }

  return true;
};

export const coerceFieldValueToString = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const coerced = coerceFieldValueToString(entry);
      if (coerced) {
        return coerced;
      }
    }
    return undefined;
  }

  if (value && typeof value === 'object') {
    const record = value as AnyRecord;
    const candidateKeys = ['value', 'label', 'name', 'text', 'display', 'displayValue'] as const;

    for (const key of candidateKeys) {
      if (key in record) {
        const coerced = coerceFieldValueToString(record[key]);
        if (coerced) {
          return coerced;
        }
      }
    }
  }

  return undefined;
};

const ACCOUNT_KEY_PRIORITIES: Array<{ test: (key: string) => boolean; priority: number }> = [
  {
    test: (key) => /account[^a-z0-9]*display/i.test(key) || (/account/i.test(key) && /name/i.test(key)),
    priority: 0,
  },
  {
    test: (key) => /customer/i.test(key) && /name/i.test(key),
    priority: 1,
  },
  {
    test: (key) => /^account$/i.test(key) || /customer[^a-z0-9]*account/i.test(key),
    priority: 2,
  },
  {
    test: (key) => /account/i.test(key) && /number/i.test(key),
    priority: 3,
  },
  {
    test: (key) => /account/i.test(key) && /id/i.test(key),
    priority: 4,
  },
  {
    test: (key) => /account/i.test(key),
    priority: 5,
  },
];

const getAccountPriorityForKey = (keyHint?: string): number => {
  if (!keyHint) {
    return ACCOUNT_KEY_PRIORITIES.length;
  }

  const normalizedKey = keyHint.trim().toLowerCase();
  for (const { test, priority } of ACCOUNT_KEY_PRIORITIES) {
    if (test(normalizedKey)) {
      return priority;
    }
  }

  return ACCOUNT_KEY_PRIORITIES.length + 1;
};

type AccountSearchQueueEntry = {
  value: unknown;
  keyHint?: string;
  fromAccountContext?: boolean;
};

export const findAccountFieldValue = (
  record?: AnyRecord
): string | undefined => {
  if (!record) {
    return undefined;
  }

  const visited = new Set<unknown>();
  const queue: AccountSearchQueueEntry[] = [{ value: record }];
  let bestCandidate: { value: string; priority: number } | null = null;

  const considerCandidate = (value: unknown, keyHint?: string) => {
    const stringValue = coerceFieldValueToString(value);
    if (!stringValue) {
      return;
    }

    if (ISO_DATE_PATTERN.test(stringValue)) {
      return;
    }

    const segments = extractAccountSegments(stringValue);
    if (segments.length === 0) {
      return;
    }

    const prioritizedValue = segments[segments.length - 1];
    const priority = getAccountPriorityForKey(keyHint);

    if (!bestCandidate || priority < bestCandidate.priority) {
      bestCandidate = { value: prioritizedValue, priority };
      return;
    }

    if (
      bestCandidate &&
      priority === bestCandidate.priority &&
      prioritizedValue.localeCompare(bestCandidate.value, undefined, { sensitivity: 'base' }) === 0
    ) {
      bestCandidate = { value: prioritizedValue, priority };
    }
  };

  while (queue.length > 0) {
    const { value: current, keyHint, fromAccountContext } = queue.shift()!;

    if (current === undefined || current === null) {
      continue;
    }

    if (typeof current === 'object') {
      if (visited.has(current)) {
        continue;
      }
      visited.add(current);
    }

    if (Array.isArray(current)) {
      for (const entry of current) {
        if (entry && typeof entry === 'object' && !visited.has(entry)) {
          queue.push({ value: entry, keyHint, fromAccountContext });
        } else if (fromAccountContext || isLikelyAccountKey(keyHint)) {
          considerCandidate(entry, keyHint);
        }
      }
      continue;
    }

    if (typeof current === 'object') {
      const recordCandidate = current as AnyRecord;

      for (const [entryKey, value] of Object.entries(recordCandidate)) {
        const keyIsAccount = isLikelyAccountKey(entryKey);
        const nextKeyHint = keyIsAccount ? entryKey : keyHint;
        const nextContext = Boolean(fromAccountContext || keyIsAccount);

        if (keyIsAccount) {
          considerCandidate(value, entryKey);
        } else if (fromAccountContext && !value) {
          continue;
        }

        if (value && typeof value === 'object') {
          if (!visited.has(value)) {
            queue.push({ value, keyHint: nextKeyHint, fromAccountContext: nextContext });
          }
          continue;
        }

        if (nextContext) {
          considerCandidate(value, nextKeyHint);
        }
      }
      continue;
    }

    if (fromAccountContext || isLikelyAccountKey(keyHint)) {
      considerCandidate(current, keyHint);
    }
  }

  return bestCandidate?.value;
};

export const deriveCustomerNameFromFields = (
  fields: Record<string, unknown> | null | undefined,
  fallback?: string | null,
): string | null => {
  const accountValue = findAccountFieldValue(fields ?? undefined);
  if (accountValue && accountValue.trim().length > 0) {
    return accountValue.trim();
  }

  if (fields) {
    const directCustomerKeys = [
      'customer_name',
      'customer-name',
      'customerName',
      'customer name',
      'customer',
      'client_name',
      'client-name',
      'clientName',
      'client name',
    ];

    for (const key of directCustomerKeys) {
      const directCustomer = coerceFieldValueToString((fields as Record<string, unknown>)[key]);
      if (directCustomer && directCustomer.trim().length > 0) {
        return directCustomer.trim();
      }
    }

    for (const [key, value] of Object.entries(fields)) {
      const candidate = coerceFieldValueToString(value);
      if (!candidate) {
        continue;
      }

      const normalizedKey = key.toLowerCase();
      if (normalizedKey.includes('customer') || normalizedKey.includes('client')) {
        return candidate.trim();
      }
    }
  }

  if (fallback && fallback.trim().length > 0) {
    return fallback.trim();
  }

  return null;
};
