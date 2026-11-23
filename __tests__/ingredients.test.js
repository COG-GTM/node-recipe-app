const { countIngredients, formatIngredientCount } = require('../src/ingredients')

describe('countIngredients', () => {
  test('AC2: counts one ingredient per non-empty line', () => {
    expect(countIngredients('flour\nsugar\neggs')).toBe(3)
  })

  test('AC2: ignores blank and whitespace-only lines', () => {
    expect(countIngredients('flour\n\n   \nsugar\n\t\neggs\n')).toBe(3)
  })

  test('AC2: \\r\\n line endings count the same as \\n', () => {
    expect(countIngredients('flour\r\nsugar\r\neggs')).toBe(countIngredients('flour\nsugar\neggs'))
    expect(countIngredients('flour\r\n\r\nsugar\r\n')).toBe(2)
  })

  test('AC4: empty or null ingredients count as 0', () => {
    expect(countIngredients('')).toBe(0)
    expect(countIngredients(null)).toBe(0)
    expect(countIngredients(undefined)).toBe(0)
    expect(countIngredients('  \n \r\n')).toBe(0)
  })
})

describe('formatIngredientCount', () => {
  test('AC3: exactly one ingredient is singular', () => {
    expect(formatIngredientCount(1)).toBe('1 ingredient')
  })

  test('AC3: any other count is plural', () => {
    expect(formatIngredientCount(0)).toBe('0 ingredients')
    expect(formatIngredientCount(2)).toBe('2 ingredients')
    expect(formatIngredientCount(6)).toBe('6 ingredients')
  })
})
