/**
 * HVAC RenewIQ — Replacement Opportunity Detection Engine
 *
 * Analyzes equipment age, warranty status, service frequency, repair costs,
 * and condition to generate opportunity scores for equipment replacement upsells.
 */
import OpenAI from 'openai';
import { query } from '../../config/database';
import { callGPT4 } from './index';

interface EquipmentProfile {
  id: string;
  customer_id: string;
  company_id: string;
  type: string;
  manufacturer: string | null;
  age_years: number | null;
  warranty_expired: boolean;
  condition_score: number | null;
  service_count: number;
  total_repair_cost: number;
  months_since_last_service: number;
}

interface OpportunityResult {
  equipmentId: string;
  score: number;
  reason: string;
  estimatedValue: number;
  priority: 'high' | 'medium' | 'low';
  source: 'ai' | 'deterministic';
}

/**
 * Fetch equipment profile with service history.
 */
async function getEquipmentProfile(equipmentId: string): Promise<EquipmentProfile | null> {
  const { rows } = await query(
    `SELECT
       e.id, e.customer_id, e.company_id, e.type, e.manufacturer,
       e.age_years, e.condition_score,
       e.warranty_expiration < CURRENT_DATE as warranty_expired,
       (SELECT COUNT(*) FROM service_calls sc WHERE sc.equipment_id = e.id) as service_count,
       COALESCE((SELECT SUM(sc.total_cost) FROM service_calls sc WHERE sc.equipment_id = e.id), 0) as total_repair_cost,
       EXTRACT(DAY FROM age(CURRENT_DATE, COALESCE(e.last_service_date, e.installation_date))) as months_since_last_service
     FROM equipment e
     WHERE e.id = $1`,
    [equipmentId]
  );
  return rows.length > 0 ? (rows[0] as unknown as EquipmentProfile) : null;
}

/**
 * Deterministic replacement opportunity scoring.
 */
function calculateDeterministicScore(profile: EquipmentProfile): OpportunityResult {
  let score = 0;
  let estimatedValue = 0;

  // Age-based scoring
  if (profile.age_years !== null) {
    if (profile.age_years >= 15) { score += 35; estimatedValue = 5000; }
    else if (profile.age_years >= 10) { score += 25; estimatedValue = 3500; }
    else if (profile.age_years >= 7) { score += 15; estimatedValue = 2500; }
  }

  // Warranty status
  if (profile.warranty_expired) score += 15;

  // Condition score
  if (profile.condition_score !== null) {
    if (profile.condition_score <= 3) score += 20;
    else if (profile.condition_score <= 5) score += 10;
    else if (profile.condition_score >= 8) score -= 10;
  }

  // Service frequency: many repairs indicate aging equipment
  if (profile.service_count >= 5) { score += 15; estimatedValue = Math.max(estimatedValue, 4000); }
  else if (profile.service_count >= 3) { score += 10; estimatedValue = Math.max(estimatedValue, 3000); }

  // Repair costs relative to replacement value
  if (profile.total_repair_cost > 2000) score += 10;
  if (profile.total_repair_cost > 1000) score += 5;

  // Equipment type adjustments
  const typeBonuses: Record<string, number> = {
    furnace: 5, ac: 5, heat_pump: 8, boiler: 5,
  };
  score += typeBonuses[profile.type] || 0;

  const clampedScore = Math.max(0, Math.min(100, score));
  const priority = clampedScore >= 50 ? 'high' : clampedScore >= 25 ? 'medium' : 'low';

  return {
    equipmentId: profile.id,
    score: clampedScore,
    reason: `Age: ${profile.age_years ?? 'unknown'}yr, Warranty: ${profile.warranty_expired ? 'expired' : 'active'}, Service calls: ${profile.service_count}`,
    estimatedValue,
    priority,
    source: 'deterministic',
  };
}

/**
 * Score a replacement opportunity for a piece of equipment.
 */
export async function scoreReplacementOpportunity(
  equipmentId: string,
  customerId: string,
  companyId: string
): Promise<OpportunityResult> {
  const profile = await getEquipmentProfile(equipmentId);
  if (!profile) {
    return {
      equipmentId, score: 0, reason: 'Equipment not found',
      estimatedValue: 0, priority: 'low', source: 'deterministic',
    };
  }

  // Try GPT-4
  const gptPrompt = `Score this HVAC equipment's replacement likelihood (0-100):
- Type: ${profile.type}
- Manufacturer: ${profile.manufacturer || 'Unknown'}
- Age: ${profile.age_years ?? 'Unknown'} years
- Warranty expired: ${profile.warranty_expired}
- Condition score (1-10): ${profile.condition_score ?? 'Unknown'}
- Service calls: ${profile.service_count}
- Total repair costs: $${profile.total_repair_cost}
- Months since last service: ${profile.months_since_last_service.toFixed(0)}

Return JSON: {"score": number (0-100), "reason": "brief explanation", "estimatedValue": number}`;

  const gptResult = await callGPT4(gptPrompt, 'You are an HVAC equipment analyst. Return ONLY valid JSON.');
  if (gptResult) {
    try {
      const parsed = JSON.parse(gptResult);
      const clampedScore = Math.max(0, Math.min(100, parsed.score));
      return {
        equipmentId,
        score: clampedScore,
        reason: parsed.reason || 'AI analysis',
        estimatedValue: parsed.estimatedValue || 0,
        priority: clampedScore >= 50 ? 'high' : clampedScore >= 25 ? 'medium' : 'low',
        source: 'ai',
      };
    } catch {
      // Fall through
    }
  }

  return calculateDeterministicScore(profile);
}

/**
 * Create or update replacement opportunity records in the database.
 */
export async function generateOpportunities(
  companyId: string,
  customerId?: string
): Promise<{ created: number }> {
  let whereClause = 'WHERE e.company_id = $1 AND e.is_active = true';
  const params: unknown[] = [companyId];
  let paramIdx = 2;

  if (customerId) {
    whereClause += ` AND e.customer_id = $${paramIdx}`;
    params.push(customerId);
  }

  const { rows } = await query(
    `SELECT e.id, e.customer_id, e.company_id FROM equipment e ${whereClause}`,
    params
  );

  let created = 0;
  for (const row of rows as { id: string; customer_id: string; company_id: string }[]) {
    const result = await scoreReplacementOpportunity(row.id, row.customer_id, row.company_id);

    // Only create opportunities for meaningful scores
    if (result.score >= 20) {
      const title = `${result.priority === 'high' ? 'URGENT: ' : ''}Replace ${result.equipmentId.substring(0, 8)}`;
      const { v4: uuidv4 } = require('uuid');
      const id = uuidv4();

      await query(
        `INSERT INTO replacement_opportunities (id, company_id, customer_id, equipment_id, title, description, status, estimated_value, probability_score, priority_score, source, notes)
         VALUES ($1, $2, $3, $4, $5, $6, 'new', $7, $8, $8, $9, $10)
         ON CONFLICT DO NOTHING`,
        [id, row.company_id, row.customer_id, row.id, title, result.reason, result.estimatedValue, result.score, result.source, JSON.stringify({ generated_by: 'ai_engine', timestamp: new Date().toISOString() })]
      );
      created++;
    }
  }

  return { created };
}