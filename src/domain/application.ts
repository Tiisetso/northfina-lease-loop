import type { AssetCategory, Question, QuestionsFile } from '@/data/schemas';
import { ageOnDate, isCalendarDate, validBusinessId } from './application-fields';

export type ApplicationAnswer = string | number | string[];
export type ApplicationAnswers = Record<string, ApplicationAnswer>;
export type ApplicationContext = {
  categories: AssetCategory[];
  financedCents: number;
  monthlyTotalCents: number;
  termMonths: number;
  startDate: string;
  minimumCents: number;
  maximumCents: number;
};
export type ApplicationReason =
  | 'under_age'
  | 'residency'
  | 'affordability'
  | 'business_id'
  | 'financed_limits'
  | 'pep'
  | 'signatory'
  | 'large_amount'
  | 'income_check'
  | 'incomplete'
  | 'blocked_answer';
export type ApplicationAssessment = {
  status: 'approved' | 'rejected' | 'manual_review' | 'incomplete';
  reasons: ApplicationReason[];
  missing: string[];
  answers: ApplicationAnswers;
};

/** Walk the ordered bank once, pruning hidden answers before evaluating dependent questions. */
export function applicationQuestions(
  bank: QuestionsFile,
  context: ApplicationContext,
  raw: ApplicationAnswers
) {
  const answers: ApplicationAnswers = {};
  const questions: Question[] = [];
  for (const question of bank.questions) {
    const applies = question.ask_when.every((condition) => {
      const value =
        condition.field === 'customer_type'
          ? answers.q_customer_type
          : condition.field === 'category'
            ? context.categories
            : condition.field === 'financed_amount_cents'
              ? context.financedCents
              : condition.field === 'term_months'
                ? context.termMonths
                : answers[condition.field.slice('answers.'.length)];
      if (condition.op === 'in')
        return Array.isArray(value)
          ? value.some((part) => condition.value.includes(part))
          : typeof value === 'string' && condition.value.includes(value);
      return (
        typeof value === 'number' &&
        (condition.op === 'gte' ? value >= condition.value : value <= condition.value)
      );
    });
    if (!applies) continue;
    questions.push(question);
    const value = raw[question.id];
    if (value !== undefined)
      answers[question.id] =
        typeof value === 'string'
          ? value.trim()
          : Array.isArray(value)
            ? value.map((part) => part.trim()).filter(Boolean)
            : value;
  }
  return { questions, answers };
}

function validAnswer(question: Question, value: ApplicationAnswer | undefined, date: string) {
  if (question.type === 'money')
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
  if (question.type === 'list') return Array.isArray(value) && value.length > 0;
  if (typeof value !== 'string' || !value.trim()) return false;
  if (question.type === 'choice') return question.options?.includes(value) ?? false;
  if (question.type === 'date') return isCalendarDate(value) && value <= date;
  if (question.type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  return true;
}

/** Bank-supplied blocks plus explicitly documented challenge policies; no clock or I/O. */
export function assessApplication(
  bank: QuestionsFile,
  context: ApplicationContext,
  raw: ApplicationAnswers
): ApplicationAssessment {
  if (
    ![
      context.financedCents,
      context.monthlyTotalCents,
      context.minimumCents,
      context.maximumCents,
    ].every((value) => Number.isSafeInteger(value) && value >= 0) ||
    !isCalendarDate(context.startDate)
  ) {
    throw new RangeError('Invalid application context');
  }
  const { questions, answers } = applicationQuestions(bank, context, raw);
  const missing = questions
    .filter((question) => !validAnswer(question, answers[question.id], context.startDate))
    .map((question) => question.id);
  if (missing.length) return { status: 'incomplete', reasons: ['incomplete'], missing, answers };
  const rejected: ApplicationReason[] = [];
  const review: ApplicationReason[] = [];
  for (const question of questions) {
    for (const rule of question.blocks_application_when ?? []) {
      const value = answers[question.id];
      if (rule.rule === 'age_under' && typeof value === 'string') {
        const age = ageOnDate(value, context.startDate);
        if (age !== null && age < rule.value) rejected.push('under_age');
      }
      if (rule.rule === 'answer_in' && typeof value === 'string' && rule.value.includes(value)) {
        rejected.push(question.id === 'q_country' ? 'residency' : 'blocked_answer');
      }
    }
    if (
      question.validation?.format === 'finnish_business_id' &&
      (typeof answers[question.id] !== 'string' || !validBusinessId(answers[question.id] as string))
    )
      rejected.push('business_id');
  }
  if (context.financedCents < context.minimumCents || context.financedCents > context.maximumCents)
    rejected.push('financed_limits');
  if (answers.q_customer_type === 'consumer') {
    if (typeof answers.q_monthly_income !== 'number') review.push('income_check');
    else if (BigInt(context.monthlyTotalCents) * 100n > BigInt(answers.q_monthly_income) * 30n)
      rejected.push('affordability');
  }
  if (answers.q_pep === 'yes') review.push('pep');
  if (answers.q_customer_type === 'company' && answers.q_can_sign === 'no')
    review.push('signatory');
  // Bank asks for business due diligence at €50,000; this demo routes those cases to people.
  if (context.financedCents >= 5_000_000) review.push('large_amount');
  return {
    status: rejected.length ? 'rejected' : review.length ? 'manual_review' : 'approved',
    reasons: [...new Set(rejected.length ? rejected : review)],
    missing: [],
    answers,
  };
}
