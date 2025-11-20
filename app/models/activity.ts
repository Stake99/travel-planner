import { ActivityType, Suitability } from '../types/enums.js'

/**
 * Ranked activity with suitability score based on weather conditions
 */
export class RankedActivity {
  public readonly type: ActivityType
  public readonly score: number
  public readonly suitability: Suitability
  public readonly reason: string

  constructor(type: ActivityType, score: number, reason: string) {
    // Validate required fields
    if (!type) {
      throw new Error('RankedActivity type is required')
    }
    if (score === undefined || score === null) {
      throw new Error('RankedActivity score is required')
    }
    if (!reason || reason.trim().length === 0) {
      throw new Error('RankedActivity reason is required')
    }

    // Validate score range
    if (score < 0 || score > 100) {
      throw new Error('RankedActivity score must be between 0 and 100')
    }

    // Validate activity type
    if (!Object.values(ActivityType).includes(type)) {
      throw new Error(`Invalid activity type: ${type}`)
    }

    this.type = type
    this.score = score
    this.suitability = this.calculateSuitability(score)
    this.reason = reason.trim()
  }

  /**
   * Calculates suitability level based on score
   * @param score - Activity score (0-100)
   * @returns Suitability level
   */
  private calculateSuitability(score: number): Suitability {
    if (score >= 80) {
      return Suitability.EXCELLENT
    }
    if (score >= 60) {
      return Suitability.GOOD
    }
    if (score >= 40) {
      return Suitability.FAIR
    }
    return Suitability.POOR
  }
}
