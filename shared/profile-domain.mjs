const clampInteger = (value, fallback = 0) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.trunc(number);
};

const clampNumber = (value, fallback = 0) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return number;
};

const toString = (value) => {
  if (typeof value === 'string') return value.trim();
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const normalizeSkills = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map(toString).filter((item) => item.length > 0);
};

const PROFILE_FIELDS_METADATA = {
  id: {
    type: 'string',
    pattern: /^[a-z0-9][a-z0-9-]{1,63}$/i,
    message: 'Username contains unsupported characters',
  },
  firstName: { type: 'string' },
  lastName: { type: 'string' },
  email: { type: 'string' },
  country: { type: 'string' },
  city: { type: 'string' },
  birthDate: { type: 'string' },
  experienceYears: {
    type: 'integer',
    min: 0,
    max: 60,
    message: 'Experience years must be an integer between 0 and 60',
  },
  primarySkill: { type: 'string' },
  secondarySkills: { type: 'array' },
  weeklyAvailabilityHours: {
    type: 'integer',
    min: 0,
    max: 80,
    message: 'Weekly availability must be an integer between 0 and 80',
  },
  hourlyRate: {
    type: 'number',
    min: 0,
    max: 1000,
    message: 'Hourly rate must be between 0 and 1000',
  },
  currency: { type: 'string' },
  bio: { type: 'string' },
};

const normalizeByMetadata = (key, metadata, value) => {
  if (metadata.type === 'array') return normalizeSkills(value);
  if (metadata.type === 'integer') return clampInteger(value, 0);
  if (metadata.type === 'number') {
    return clampNumber(value, 0);
  }
  const text = toString(value);
  if (key === 'email') return text.toLowerCase();
  if (key === 'currency') return text.toUpperCase();
  return text;
};

const matchesExpectedType = (value, expectedType) => {
  if (expectedType === 'array') return Array.isArray(value);
  if (expectedType === 'integer') return Number.isInteger(value);
  if (expectedType === 'number') return Number.isFinite(value);
  return typeof value === expectedType;
};

const validateField = (value, metadata) => {
  if (metadata.type !== 'number' && metadata.type !== 'integer') return null;
  const outOfRange = value < metadata.min || value > metadata.max;
  const wrongKind =
    metadata.type === 'integer'
      ? !Number.isInteger(value)
      : !Number.isFinite(value);
  return wrongKind || outOfRange ? metadata.message : null;
};

const isValidDate = (value) =>
  value instanceof Date && !Number.isNaN(value.valueOf());

const parseDate = (value) => {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  const parsed = new Date(value);
  if (!isValidDate(parsed)) return null;
  return parsed;
};

const calculateAge = (birthDate, now) => {
  if (!isValidDate(birthDate) || !isValidDate(now)) return null;
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - birthDate.getUTCMonth();
  const dayDelta = now.getUTCDate() - birthDate.getUTCDate();
  if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) {
    age -= 1;
  }
  return age >= 0 ? age : null;
};

const toSlug = (firstName, lastName) => {
  const raw = `${firstName} ${lastName}`.trim().toLowerCase();
  if (!raw) return '';
  return raw
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

const seniorityFromExperience = (years) => {
  const levels = [
    { maxYears: 1, label: 'Junior' },
    { maxYears: 4, label: 'Middle' },
    { maxYears: 9, label: 'Senior' },
  ];
  const match = levels.find(({ maxYears }) => years <= maxYears);
  return match ? match.label : 'Principal';
};

const completeness = (profile) => {
  const profileFieldKeys = Object.keys(PROFILE_FIELDS_METADATA);
  const filled = profileFieldKeys.reduce((acc, key) => {
    const value = profile[key];
    if (Array.isArray(value)) return acc + (value.length > 0 ? 1 : 0);
    if (typeof value === 'number') { return acc + (Number.isFinite(value) ? 1 : 0); }
    return acc + (toString(value).length > 0 ? 1 : 0);
  }, 0);
  return Math.round((filled / profileFieldKeys.length) * 100);
};

const normalizeProfile = (profile) => {
  const source = profile && typeof profile === 'object' ? profile : {};
  const normalized = {};
  for (const [key, metadata] of Object.entries(PROFILE_FIELDS_METADATA)) {
    normalized[key] = normalizeByMetadata(key, metadata, source[key]);
  }
  return normalized;
};

const validateProfile = (profile, now = new Date()) => {
  const errors = {};
  const normalized = normalizeProfile(profile);
  const today = isValidDate(now) ? new Date(now.valueOf()) : new Date();
  const birthDate = parseDate(normalized.birthDate);
  const hasIdPattern = Boolean(PROFILE_FIELDS_METADATA.id.pattern);
  const hasInvalidIdPattern =
    normalized.id &&
    hasIdPattern &&
    !PROFILE_FIELDS_METADATA.id.pattern.test(normalized.id);
  const hasEmptySecondarySkill = normalized.secondarySkills.some(
    (item) => toString(item).length === 0,
  );

  for (const [key, metadata] of Object.entries(PROFILE_FIELDS_METADATA)) {
    if (!matchesExpectedType(normalized[key], metadata.type)) {
      errors[key] = `Expected ${metadata.type} value`;
    }
  }

  if (!normalized.id) errors.id = 'Username is required';
  if (hasInvalidIdPattern) {
    errors.id = PROFILE_FIELDS_METADATA.id.message;
  }
  if (!normalized.firstName) errors.firstName = 'First name is required';
  if (!normalized.lastName) errors.lastName = 'Last name is required';
  if (!normalized.email.includes('@')) errors.email = 'Invalid email';

  for (const [key, metadata] of Object.entries(PROFILE_FIELDS_METADATA)) {
    const fieldError = validateField(normalized[key], metadata);
    if (fieldError) errors[key] = fieldError;
  }

  if (!birthDate) {
    errors.birthDate = 'Birth date is required and must be valid';
  } else if (birthDate >= today) {
    errors.birthDate = 'Birth date must be in the past';
  }

  if (hasEmptySecondarySkill) {
    errors.secondarySkills = 'Secondary skills must contain non-empty strings';
  }

  return errors;
};

const calculateProfile = (profile, now = new Date()) => {
  const normalized = normalizeProfile(profile);
  const birthDate = parseDate(normalized.birthDate);
  const age = calculateAge(birthDate, now);
  const displayName = `${normalized.firstName} ${normalized.lastName}`.trim();
  const monthlyCapacityHours = normalized.weeklyAvailabilityHours * 4;
  const estimatedMonthlyIncome = monthlyCapacityHours * normalized.hourlyRate;

  return {
    displayName,
    age,
    seniorityLevel: seniorityFromExperience(normalized.experienceYears),
    monthlyCapacityHours,
    estimatedMonthlyIncome,
    profileCompleteness: completeness(normalized),
    publicSlug: toSlug(normalized.firstName, normalized.lastName),
  };
};

const buildProfileState = (profile, now = new Date()) => {
  const normalized = normalizeProfile(profile);
  const errors = validateProfile(normalized, now);
  const computed = calculateProfile(normalized, now);
  return {
    profile: normalized,
    computed,
    errors,
    valid: Object.keys(errors).length === 0,
  };
};

export {
  PROFILE_FIELDS_METADATA,
  normalizeProfile,
  validateProfile,
  calculateProfile,
  buildProfileState,
};
