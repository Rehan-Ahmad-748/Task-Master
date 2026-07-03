const { isEmail, inRangeLength, isCreditHours } = require('../src/utils/validators');

describe('Boundary Value Validation', () => {
  test('password boundaries: 8 and 32 accepted, 7 and 33 rejected', () => {
    expect(inRangeLength('12345678', 8, 32)).toBe(true);
    expect(inRangeLength('12345678901234567890123456789012', 8, 32)).toBe(true);
    expect(inRangeLength('1234567', 8, 32)).toBe(false);
    expect(inRangeLength('123456789012345678901234567890123', 8, 32)).toBe(false);
  });

  test('course code boundaries: 3 and 10 accepted, 2 and 11 rejected', () => {
    expect(inRangeLength('CS1', 3, 10)).toBe(true);
    expect(inRangeLength('CS-301-AB1', 3, 10)).toBe(true);
    expect(inRangeLength('A1', 3, 10)).toBe(false);
    expect(inRangeLength('COURSE-CODE', 3, 10)).toBe(false);
  });

  test('task title boundaries: 3 and 80 accepted, 2 and 81 rejected', () => {
    expect(inRangeLength('Lab', 3, 80)).toBe(true);
    expect(inRangeLength('A'.repeat(80), 3, 80)).toBe(true);
    expect(inRangeLength('Hi', 3, 80)).toBe(false);
    expect(inRangeLength('A'.repeat(81), 3, 80)).toBe(false);
  });

  test('credit hours boundaries: 1 and 6 accepted, 0 and 7 rejected', () => {
    expect(isCreditHours(1)).toBe(true);
    expect(isCreditHours(6)).toBe(true);
    expect(isCreditHours(0)).toBe(false);
    expect(isCreditHours(7)).toBe(false);
  });

  test('email validator', () => {
    expect(isEmail('demo@university.edu')).toBe(true);
    expect(isEmail('invalid-email')).toBe(false);
  });
});