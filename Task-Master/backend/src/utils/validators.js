const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isEmail(email) {
  return EMAIL_RE.test(String(email || '').trim());
}

function inRangeLength(value, min, max) {
  const len = String(value || '').trim().length;
  return len >= min && len <= max;
}

function isCreditHours(value) {
  const num = Number(value);
  return Number.isInteger(num) && num >= 1 && num <= 6;
}

module.exports = {
  isEmail,
  inRangeLength,
  isCreditHours
};