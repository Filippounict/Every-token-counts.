import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateExperimentData,
  computeLinearRegression,
  computeMcNemar,
  computeMcNemarFromCounts,
  detectParetoKnee,
  parseExperimentCsv,
} from './statistics';

test('computeLinearRegression computes exact slope, intercept, and R^2', () => {
  const res = computeLinearRegression([
    { x: 100, y: 0.02 },
    { x: 200, y: 0.04 },
    { x: 400, y: 0.08 },
  ]);
  assert.ok(Math.abs(res.slope - 0.0002) < 1e-9);
  assert.ok(Math.abs(res.intercept - 0) < 1e-9);
  assert.ok(Math.abs(res.rSquared - 1) < 1e-9);
});

test('computeMcNemarFromCounts uses exact binomial when discordant < 25', () => {
  // n10 = 2, n01 = 12 => discordant = 14 (<25), exact two-sided binomial p = 2 * sum_{i=0..2} C(14,i)*0.5^14
  // C(14,0)+C(14,1)+C(14,2) = 1 + 14 + 91 = 106 -> 2 * 106 / 16384 = 0.012939453125
  const res = computeMcNemarFromCounts(40, 2, 12, 46);
  assert.equal(res.method, 'exact_binomial');
  assert.equal(res.discordantTotal, 14);
  assert.ok(Math.abs(res.pValue - 0.012939453125) < 1e-6);
  assert.equal(res.significantAt05, true);
});

test('computeMcNemarFromCounts uses Edwards chi-square when discordant >= 25', () => {
  // n10 = 10, n01 = 30 => discordant = 40, chi2 = (|10-30|-1)^2 / 40 = 361 / 40 = 9.025
  const res = computeMcNemarFromCounts(50, 10, 30, 10);
  assert.equal(res.method, 'chi2_edwards');
  assert.ok(Math.abs((res.chiSquare ?? 0) - 9.025) < 1e-9);
  assert.ok(res.pValue < 0.005);
  assert.equal(res.significantAt05, true);
});

test('computeMcNemar pairs correctly', () => {
  const res = computeMcNemar([
    { offCorrect: true, onCorrect: true },
    { offCorrect: false, onCorrect: true },
    { offCorrect: false, onCorrect: true },
    { offCorrect: false, onCorrect: false },
  ]);
  assert.equal(res.n11, 1);
  assert.equal(res.n01, 2);
  assert.equal(res.n10, 0);
  assert.equal(res.n00, 1);
  assert.equal(res.accOffPct, 25);
  assert.equal(res.accOnPct, 75);
});

test('detectParetoKnee identifies the elbow point before accuracy plateau', () => {
  const curve = detectParetoKnee([
    { limit: 32, label: '32 tok', limitType: 'num_predict', energyWh: 0.05, accuracyPct: 18, tokensGenerated: 32, whPerCorrect: 0.27 },
    { limit: 64, label: '64 tok', limitType: 'num_predict', energyWh: 0.09, accuracyPct: 44, tokensGenerated: 62, whPerCorrect: 0.20 },
    { limit: 128, label: '128 tok', limitType: 'num_predict', energyWh: 0.16, accuracyPct: 68, tokensGenerated: 118, whPerCorrect: 0.23 },
    { limit: 256, label: '256 tok', limitType: 'num_predict', energyWh: 0.28, accuracyPct: 75, tokensGenerated: 205, whPerCorrect: 0.37 },
    { limit: 512, label: '512 tok', limitType: 'num_predict', energyWh: 0.52, accuracyPct: 76, tokensGenerated: 360, whPerCorrect: 0.68 },
    { limit: 1024, label: '1024 tok', limitType: 'num_predict', energyWh: 0.96, accuracyPct: 76, tokensGenerated: 620, whPerCorrect: 1.26 },
  ]);
  const knee = curve.find((p) => p.isKnee);
  assert.ok(knee);
  assert.ok(knee.limit === 128 || knee.limit === 256);
});

test('parseExperimentCsv parses valid rows and aggregateExperimentData builds poster metrics', () => {
  const sampleCsv = [
    'run_id,phase,dataset,difficulty,prompt_id,thinking_mode,limit_type,max_tokens_limit,input_tokens,output_tokens,thinking_tokens,answer_tokens,latency_sec,energy_wh,correct',
    'r1,rq1_sweep,SyntheticSweep,0,s1,off,num_predict,64,64,64,0,64,2.1,0.018,1',
    'r2,rq1_sweep,SyntheticSweep,0,s2,off,num_predict,64,512,64,0,64,3.4,0.032,1',
    'r3,rq1_sweep,SyntheticSweep,0,s3,off,num_predict,256,64,256,0,256,7.9,0.072,1',
    'r4,rq2_limits,GSM8K,2,g1,off,num_predict,64,80,64,0,64,2.3,0.020,0',
    'r5,rq2_limits,GSM8K,2,g1,off,num_predict,256,80,180,0,180,6.2,0.056,1',
    'r6,rq2_limits,GSM8K,2,g1,off,num_predict,512,80,210,0,210,7.1,0.064,1',
    'r7,rq3_thinking,GSM8K,2,g1,off,num_predict,1024,80,140,0,140,4.5,0.042,0',
    'r8,rq3_thinking,GSM8K,2,g1,on,num_predict,1024,80,420,310,110,13.5,0.132,1',
  ].join('\n');

  const rows = parseExperimentCsv(sampleCsv);
  assert.equal(rows.length, 8);
  const agg = aggregateExperimentData(rows, 'ALL');
  assert.equal(agg.totalRuns, 8);
  assert.equal(agg.mcNemarOverall.totalPairs, 1);
  assert.equal(agg.mcNemarOverall.n01, 1);
  assert.equal(agg.rq2ParetoCurve.length, 3);
});
