/**
 * HVAC RenewIQ — Renewal Probability Engine & Churn Detection
 *
 * Analyzes service frequency, agreement age, payment history, and customer
 * engagement to produce renewal probability and churn risk scores (0-100).
 * Uses GPT-4 when available, falls back to deterministic scoring.
 */
import { query } from '../../config/database';
import { callGPT4 } from './index';

// Scoring weights for deterministic fallback
const WEIGHTS = {
  serviceFrequency: 0.25,
  agreementAge: 0.15,
  paymentHistory: 0.20,
  engagementScore: 0.15,
  equipmentAge: 0.15,
  customerTenure: 0.10,
};

interface CustomerProfile {
  id: string;
  company_id: string;
  agreement_id: string;
  total_services: number;
  services_per_year: number;
  agreement_age_months: number;
  months_since_last_service: number;
  late_payments: number;
  equipment_count: number;
  avg_equipment_age: number;
  agreement_count: number;
  is_active: boolean;
}

/**
 * Fetch customer profile data for AI analysis.
 */
async function getCustomerProfile(customerId: string, companyId: string): Promise<CustomerProfile | null> {
  const { rows } = await query(
    `SELECT
       c.id,
       c.company_id,
       ma.id as agreement_id,
       (SELECT COUNT(*) FROM service_calls sc WHERE sc.customer_id = c.id AND sc.company_id = $2) as total_services,
       COALESCE(
         (SELECT COUNT(*) FROM service_calls sc WHERE sc.customer_id = c.id AND sc.company_id = $2)
         / NULLIF(EXTRACT(YEAR FROM age(CURRENT_DATE, MIN(ma.start_date))), 0), 0
       ) as services_per_year,
       EXTRACT(MONTH FROM age(CURRENT_DATE, ma.start_date)) as agreement_age_months,
       EXTRACT(DAY FROM age(CURRENT_DATE, COALESCE(ma.renewal_date, ma.start_date))) as months_since_last_service,
       (SELECT COUNT(*) FROM invoices i WHERE i.customer_id = c.id AND i.status = 'overdue') as late_payments,
       (SELECT COUNT(*) FROM equipment e WHERE e.customer_id = c.id) as equipment_count,
       COALESCE((SELECT AVG(e.age_years) FROM equipment e WHERE e.customer_id = c.id), 0) as avg_equipment_age,
       (SELECT COUNT(*) FROM maintenance_agreements ma2 WHERE ma2.customer_id = c.id) as agreement_count,
       c.is_active
     FROM customers c
     JOIN maintenance_agreements ma ON ma.customer_id = c.id AND ma.company_id = $2
     WHERE c.id = $1 AND c.company_id = $2
     LIMIT 1`,
    [customerId, companyId]
  );
  return rows.length > 0 ? (rows[0] as unknown as CustomerProfile) : null;
}

/**
 * Deterministic renewal probability scoring.
 */
function calculateDeterministicRenewal(profile: CustomerProfile): number {
  let score = 50; // baseline

  // Service frequency: more is better (up to +15)
  if (profile.services_per_year >= 2) score += 15;
  else if (profile.services_per_year >= 1) score += 8;
  else if (profile.services_per_year < 0.5) score -= 10;

  // Agreement age: longer is better (up to +10)
  if (profile.agreement_age_months >= 36) score += 10;
  else if (profile.agreement_age_months >= 12) score += 5;
  else if (profile.agreement_age_months < 6) score -= 5;

  // Late payments: penalty (up to -15)
  score -= Math.min(profile.late_payments * 5, 15);

  // Recent service: recency matters (up to +10)
  if (profile.months_since_last_service <= 3) score += 10;
  else if (profile.months_since_last_service <= 6) score += 5;
  else if (profile.months_since_last_service >= 12) score -= 8;

  // Equipment investment: more equipment = more likely to renew (up to +8)
  score += Math.min(profile.equipment_count * 2, 8);

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Deterministic churn risk scoring (inverse of renewal with different weights).
 */
function calculateDeterministicChurn(profile: CustomerProfile): number {
  let score = 20; // baseline low churn

  // Low service frequency increases churn risk
  if (profile.services_per_year < 0.5) score += 25;
  else if (profile.services_per_year < 1) score += 15;

  // No recent service increases churn risk
  if (profile.months_since_last_service >= 12) score += 20;
  else if (profile.months_since_last_service >= 6) score += 10;

  // Late payments indicate potential churn
  if (profile.late_payments > 0) score += Math.min(profile.late_payments * 8, 20);

  // Short agreement tenure increases churn
  if (profile.agreement_age_months < 6) score += 10;
  else if (profile.agreement_age_months < 12) score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Get AI-powered renewal probability and churn risk for a customer.
 */
export async function predictRenewal(
  customerId: string,
  companyId: string
): Promise<{
  renewalProbability: number;
  churnRisk: number;
  reasoning: string;
  source: 'ai' | 'deterministic';
}> {
  const profile = await getCustomerProfile(customerId, companyId);
  if (!profile) {
    return { renewalProbability: 50, churnRisk: 25, reasoning: 'Insufficient data', source: 'deterministic' };
  }

  // Try GPT-4 first
  const gptPrompt = `Analyze this HVAC customer's renewal likelihood (0-100) and churn risk (0-100):
- Total services: ${profile.total_services}
- Services per year: ${profile.services_per_year.toFixed(1)}
- Agreement age: ${profile.agreement_age_months.toFixed(0)} months
- Months since last service: ${profile.months_since_last_service.toFixed(0)}
- Late payments: ${profile.late_payments}
- Equipment count: ${profile.equipment_count}
- Average equipment age: ${profile.avg_equipment_age.toFixed(1)} years

Return JSON: {"renewalProbability": number, "churnRisk": number, "reasoning": "brief explanation"}`;

  const gptResult = await callGPT4(gptPrompt, 'You are an HVAC business analyst. Return ONLY valid JSON.');
  if (gptResult) {
    try {
      const parsed = JSON.parse(gptResult);
      return {
        renewalProbability: Math.max(0, Math.min(100, parsed.renewalProbability)),
        churnRisk: Math.max(0, Math.min(100, parsed.churnRisk)),
        reasoning: parsed.reasoning || 'AI-generated analysis',
        source: 'ai',
      };
    } catch {
      // Fall through to deterministic
    }
  }

  // Deterministic fallback
  return {
    renewalProbability: calculateDeterministicRenewal(profile),
    churnRisk: calculateDeterministicChurn(profile),
    reasoning: 'Deterministic scoring based on service frequency, payment history, and engagement',
    source: 'deterministic',
  };
}

/**
 * Update renewal probability and churn risk scores in the database.
 */
export async function updateAgreementScores(agreementId: string): Promise<void> {
  const { rows } = await query(
    'SELECT customer_id, company_id FROM maintenance_agreements WHERE id = $1',
    [agreementId]
  );
  if (rows.length === 0) return;

  const { customer_id, company_id } = rows[0] as { customer_id: string; company_id: string };
  const result = await predictRenewal(customer_id, company_id);

  await query(
    `UPDATE maintenance_agreements SET
       renewal_probability = $1,
       churn_risk_score = $2,
       updated_at = NOW()
     WHERE id = $3`,
    [result.renewalProbability, result.churnRisk, agreementId]
  );
}

/**
 * Batch update all active agreements with AI scores.
 */
export async function batchUpdateScores(companyId?: string): Promise<{ updated: number }> {
  let whereClause = 'WHERE ma.status IN (\'active\', \'expiring_soon\')';
  const params: unknown[] = [];
  if (companyId) {
    whereClause += ' AND ma.company_id = $1';
    params.push(companyId);
  }

  const { rows } = await query(
    `SELECT ma.id, ma.customer_id, ma.company_id FROM maintenance_agreements ma ${whereClause}`,
    params
  );

  let updated = 0;
  for (const row of rows as { id: string; customer_id: string; company_id: string }[]) {
    const result = await predictRenewal(row.customer_id, row.company_id);
    await query(
      `UPDATE maintenance_agreements SET renewal_probability = $1, churn_risk_score = $2, updated_at = NOW() WHERE id = $3`,
      [result.renewalProbability, result.churnRisk, row.id]
    );
    updated++;
  }

  return { updated };
}