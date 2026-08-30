import { describe, expect, it } from 'bun:test'
import {
  coefficientOfVariation,
  contractionRate,
  headingShape,
  proseWords,
  punctuationDensity,
  repeatedOpenerShare,
  typeTokenRatio,
} from '../../../skills/hogwash/scripts/scan/measures.js'

describe('coefficientOfVariation', () => {
  it.each([
    { values: [2, 2, 2], expected: 0 },
    { values: [1, 1, 3, 3], expected: 0.5 },
    { values: [], expected: 0 },
    { values: [0, 0], expected: 0 },
  ])('is $expected for $values', ({ values, expected }) => {
    expect(coefficientOfVariation(values)).toBeCloseTo(expected, 10)
  })
})

describe('typeTokenRatio', () => {
  it.each([
    { words: ['a', 'a', 'b', 'b', 'c', 'c'], window: 2, expected: 0.7 },
    { words: ['The', 'the'], window: 2, expected: 0.5 },
    { words: ['a', 'b'], window: 40, expected: 1 },
  ])('is $expected for $words over a window of $window', ({ words, window, expected }) => {
    expect(typeTokenRatio(words, window)).toBeCloseTo(expected, 10)
  })
})

describe('contractionRate', () => {
  it.each([
    { words: ["don't", 'we', 'are', 'here'], expected: 25 },
    { words: ['plain', 'words'], expected: 0 },
    { words: [], expected: 0 },
  ])('is $expected for $words', ({ words, expected }) => {
    expect(contractionRate(words)).toBeCloseTo(expected, 10)
  })
})

describe('punctuationDensity', () => {
  it.each([
    { prose: 'a — b; c', words: 4, expected: 50 },
    { prose: 'a - b – c: d', words: 4, expected: 0 },
    { prose: 'anything', words: 0, expected: 0 },
  ])('is $expected for $prose over $words words', ({ prose, words, expected }) => {
    expect(punctuationDensity(prose, words)).toBeCloseTo(expected, 10)
  })
})

describe('repeatedOpenerShare', () => {
  it.each([
    { openers: ['We', 'The', 'we'], expected: 1 / 3 },
    { openers: ['The', 'the', 'The'], expected: 2 / 3 },
    { openers: ['A', 'B', 'C', 'D'], expected: 0 },
    { openers: [], expected: 0 },
  ])('is $expected for $openers', ({ openers, expected }) => {
    expect(repeatedOpenerShare(openers)).toBeCloseTo(expected, 10)
  })
})

describe('headingShape', () => {
  it.each([
    { heading: 'What breaks first?', expected: '?' },
    { heading: 'Building the pipeline', expected: 'ing' },
    { heading: 'Staffing', expected: 'ing' },
    { heading: 'King of the hill', expected: 'king' },
    { heading: 'The rollout plan', expected: 'the' },
    { heading: 'THE ROLLOUT PLAN', expected: 'the' },
    { heading: '   ', expected: null },
  ])('is $expected for "$heading"', ({ heading, expected }) => {
    expect(headingShape(heading)).toBe(expected)
  })
})

describe('proseWords', () => {
  it('splits on the shared word pattern', () => {
    expect(proseWords('Use  two, words.')).toEqual(['Use', 'two', 'words'])
  })
})
