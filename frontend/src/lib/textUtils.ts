/**
 * Normalization options for TTS messages and chat alerts.
 */
export interface NormalizeOptions {
  readUsername?: boolean;
  username?: string;
  maxCharacters?: number;
  bannedWords?: string[];
}

/**
 * Result of TTS normalization and moderation checks.
 */
export interface NormalizeResult {
  text: string;
  isBlocked: boolean;
  reason?: string;
}

/**
 * Normalizes live chat text before speech synthesis and enforces moderation filters.
 *
 * 1. Banned word filter: Checks case-insensitive presence of any banned words.
 * 2. URL stripping: Removes URLs matching `https?://\S+` or `www\.\S+`.
 * 3. Character repetition clamp: Clamps consecutive identical characters (>2) to 2.
 * 4. Max character truncation: Truncates user text to maxCharacters if specified.
 * 5. Username formatting: Prepends `${username} บอกว่า: ` if enabled.
 */
export function normalizeTtsText(rawText: string, options?: NormalizeOptions): NormalizeResult {
  if (!rawText) {
    return { text: '', isBlocked: false };
  }

  // 1. Banned Words Filter (case-insensitive)
  if (options?.bannedWords && options.bannedWords.length > 0) {
    const lowerRaw = rawText.toLowerCase();
    for (const word of options.bannedWords) {
      const trimmedWord = word.trim().toLowerCase();
      if (trimmedWord.length > 0 && lowerRaw.includes(trimmedWord)) {
        return {
          text: rawText,
          isBlocked: true,
          reason: 'banned_word',
        };
      }
    }
  }

  // 2. URL Stripping: Strip all URLs matching https?://\S+ or www\.\S+
  let processed = rawText
    .replace(/(?:https?:\/\/\S+|www\.\S+)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // 3. Character Repetition Clamp: Clamp excessive repeated characters (> 2) to 2
  processed = processed.replace(/(.)\1{2,}/g, '$1$1');

  // Secondary check for banned words after repeated characters collapsed (e.g. "spppaaammm")
  if (options?.bannedWords && options.bannedWords.length > 0) {
    const lowerProcessed = processed.toLowerCase();
    for (const word of options.bannedWords) {
      const trimmedWord = word.trim().toLowerCase();
      if (trimmedWord.length > 0 && lowerProcessed.includes(trimmedWord)) {
        return {
          text: processed,
          isBlocked: true,
          reason: 'banned_word',
        };
      }
    }
  }

  // 4. Max Characters Truncation
  if (options?.maxCharacters && options.maxCharacters > 0 && processed.length > options.maxCharacters) {
    processed = processed.slice(0, options.maxCharacters);
  }

  // 5. Username Formatting
  if (options?.readUsername && options.username && options.username.trim().length > 0) {
    processed = `${options.username.trim()} บอกว่า: ${processed}`;
  }

  return {
    text: processed,
    isBlocked: false,
  };
}

/**
 * Checks if a user is currently on cooldown for TTS triggering.
 * If user is not on cooldown, records the current timestamp in historyMap.
 *
 * @param userId - Unique identifier for the viewer
 * @param cooldownSeconds - Cooldown threshold in seconds
 * @param historyMap - In-memory map of userId -> lastTimestamp in ms
 * @returns boolean - true if on cooldown, false if allowed
 */
export function isUserOnCooldown(
  userId: string,
  cooldownSeconds: number,
  historyMap: Map<string, number>
): boolean {
  if (!userId || cooldownSeconds <= 0) {
    return false;
  }

  const now = Date.now();
  const lastTimestamp = historyMap.get(userId);

  if (lastTimestamp !== undefined && now - lastTimestamp < cooldownSeconds * 1000) {
    return true;
  }

  historyMap.set(userId, now);
  return false;
}
