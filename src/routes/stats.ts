import { Router, Request, Response } from 'express';
import { caseStore } from '../services/cases/caseStore';

export const statsRouter = Router();

// Claude Sonnet 4.6 on AWS Bedrock — estimerte priser per 1M tokens
const PRICE_INPUT_PER_M  = 3.00;
const PRICE_OUTPUT_PER_M = 15.00;

statsRouter.get('/', (_req: Request, res: Response): void => {
  const cases = caseStore.list();

  const kritikalitet: Record<string, number> = { Kritisk: 0, Høy: 0, Middels: 0, Lav: 0 };
  const standpunkt:   Record<string, number> = { Støttes: 0, 'Støttes delvis': 0, Avvises: 0, Uavklart: 0 };
  let vurdert = 0;
  let tokensInput = 0;
  let tokensOutput = 0;
  let scoreSum = 0;
  let scoreCount = 0;

  for (const c of cases) {
    if (c.status === 'vurdert') vurdert++;

    const krit = (c.legeVurdering?.kritikalitet ?? c.analyse.kritikalitet) as string;
    if (krit in kritikalitet) kritikalitet[krit]++;

    const sp = c.analyse.standpunkt as string;
    if (sp in standpunkt) standpunkt[sp]++;

    if (c.tokensInput)  tokensInput  += c.tokensInput;
    if (c.tokensOutput) tokensOutput += c.tokensOutput;
    if (c.analyse.prioritetScore != null) {
      scoreSum += c.analyse.prioritetScore;
      scoreCount++;
    }
  }

  const estimertKostnadUSD =
    (tokensInput  / 1_000_000) * PRICE_INPUT_PER_M +
    (tokensOutput / 1_000_000) * PRICE_OUTPUT_PER_M;

  res.json({
    total:              cases.length,
    vurdert,
    tilVurdering:       cases.length - vurdert,
    kritikalitet,
    standpunkt,
    prioritetScoreSnitt: scoreCount ? Math.round(scoreSum / scoreCount) : 0,
    tokensInput,
    tokensOutput,
    estimertKostnadUSD: Math.round(estimertKostnadUSD * 100) / 100,
    sisteOpplastet:     cases.length
      ? cases.sort((a, b) => b.lastOppTidspunkt.localeCompare(a.lastOppTidspunkt))[0].lastOppTidspunkt
      : null,
  });
});
