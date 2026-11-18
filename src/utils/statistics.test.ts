import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateExperimentData,
  computeLinearTrend,
  findAccuracySweetSpot,
  parseExperimentCsv,
} from './statistics';

test('computeLinearTrend computes exact slope and intercept', () => {
  const pts = [
    { x: 100, y: 0.01 },
    { x: 200, y: 0.02 },
    { x: 400, y: 0.04 },
  ];
  const res = computeLinearTrend(pts);
  assert.ok(Math.abs(res.slope - 0.0001) < 1e-9);
  assert.ok(Math.abs(res.intercept) < 1e-9);
  assert.ok(Math.abs(res.rSquared - 1) < 1e-9);
});

test('findAccuracySweetSpot picks smallest limit within 2% of max accuracy', () => {
  const pts = [
    { limit: 32, label: '32 tok', limitType: 'num_predict' as const, energyWh: 0.015, accuracyPct: 50, tokensGenerated: 32, whPerCorrect: 0.03 },
    { limit: 64, label: '64 tok', limitType: 'num_predict' as const, energyWh: 0.025, accuracyPct: 67, tokensGenerated: 60, whPerCorrect: 0.037 },
    { limit: 128, label: '128 tok', limitType: 'num_predict' as const, energyWh: 0.042, accuracyPct: 99, tokensGenerated: 112, whPerCorrect: 0.042 },
    { limit: 256, label: '256 tok', limitType: 'num_predict' as const, energyWh: 0.068, accuracyPct: 100, tokensGenerated: 190, whPerCorrect: 0.068 },
  ];
  const result = findAccuracySweetSpot(pts, 2.0);
  const sweet = result.find((p) => p.isSweetSpot);
  assert.ok(sweet);
  assert.equal(sweet.limit, 128);
});

test('parseExperimentCsv handles full 20-column format with Proof-of-Work, idle baseline, input quality, and model comparison', () => {
  const sampleCsv = [
    'run_id,timestamp,model,phase,dataset,prompt_id,context_level,limit_type,max_tokens_limit,input_tokens,output_tokens,latency_sec,energy_wh,correct,cpu_energy_wh,gpu_energy_wh,ram_energy_wh,emissions_gco2eq,expected_answer,response_preview',
    'idle_0,2026-05-10T10:00:00Z,idle,idle_baseline,IdleBaseline,idle_5s,none,unlimited,0,0,0,5.0,0.011806,1,0.003472,0,0.008333,0.004486,n/a,"Idle sleep baseline"',
    'rq1_1,2026-05-10T10:00:06Z,qwen2.5:3b,rq1_sweep,SyntheticSweep,s1,none,num_predict,32,64,32,1.8,0.014,1,0.011,0,0.003,0.005,n/a,"Short output..."',
    'rq1_2,2026-05-10T10:00:09Z,qwen2.5:3b,rq1_sweep,SyntheticSweep,s2,none,num_predict,32,1024,32,6.5,0.056,1,0.045,0,0.011,0.021,n/a,"Short output..."',
    'rq1_3,2026-05-10T10:00:16Z,qwen2.5:3b,rq1_sweep,SyntheticSweep,s3,none,num_predict,256,64,256,11.5,0.088,1,0.069,0,0.019,0.033,n/a,"Longer output..."',
    'rq2a_1,2026-05-10T10:00:28Z,qwen2.5:3b,rq2_output_limits,GSM8K,gsm_1,short,num_predict,32,60,32,1.8,0.015,0,0.012,0,0.003,0.005,18,"Janet has 16 eggs..."',
    'rq2a_2,2026-05-10T10:00:31Z,qwen2.5:3b,rq2_output_limits,GSM8K,gsm_1,short,num_predict,128,60,96,4.5,0.036,1,0.028,0,0.008,0.013,18,"9 x $2 = $18"',
    'rq2in_1,2026-05-10T10:00:36Z,qwen2.5:3b,rq2_input_quality,GSM8K,gsm_1,short,num_predict,256,60,90,4.2,0.034,1,0.027,0,0.007,0.012,18,"Answer is 18"',
    'rq2in_2,2026-05-10T10:00:41Z,qwen2.5:3b,rq2_input_quality,GSM8K,gsm_1,long,num_predict,256,980,95,10.2,0.078,0,0.061,0,0.017,0.029,18,"Answer is 24"',
    'rq3_1,2026-05-10T10:00:52Z,qwen2.5:0.5b,rq3_model_compare,GSM8K,gsm_1,short,num_predict,256,60,64,1.4,0.010,0,0.008,0,0.002,0.004,18,"Profit is 14"',
    'rq3_2,2026-05-10T10:00:55Z,qwen2.5:3b,rq3_model_compare,GSM8K,gsm_1,short,num_predict,256,60,92,4.4,0.035,1,0.028,0,0.007,0.013,18,"Final answer: 18"',
  ].join('\n');

  const rows = parseExperimentCsv(sampleCsv);
  assert.equal(rows.length, 10);

  const agg = aggregateExperimentData(rows, 'ALL');
  // Idle baseline is excluded from inference count
  assert.equal(agg.totalRuns, 9);
  assert.ok(agg.outputToInputSlopeRatio > 5);
  assert.equal(agg.sweetSpot?.limit, 128);
  assert.equal(agg.rq2InputQuality.length, 2);
  assert.equal(agg.inputQualityDropPct, 100);
  assert.equal(agg.rq3ModelComparison.length, 2);
  assert.equal(agg.rq3ModelComparison[0].model, 'qwen2.5:0.5b');
  assert.equal(agg.rq3ModelComparison[1].model, 'qwen2.5:3b');
  assert.equal(agg.hardwareBreakdown.hasComponents, true);
  assert.ok(agg.hardwareBreakdown.idlePowerW !== null && Math.abs(agg.hardwareBreakdown.idlePowerW - 8.5) < 0.2);
  assert.ok(agg.proofTraces.length > 0);
  assert.equal(agg.proofTraces[0].expectedAnswer, '18');
});

test('parseExperimentCsv remains backward-compatible with older minimal CSVs without model or preview columns', () => {
  const legacyCsv = [
    'run_id,phase,dataset,prompt_id,thinking_mode,limit_type,max_tokens_limit,input_tokens,output_tokens,latency_sec,energy_wh,correct',
    'r1,rq2_limits,GSM8K,g1,off,num_predict,64,80,60,3.0,0.025,1',
    'r2,rq2_limits,GSM8K,g1,off,num_predict,128,80,100,4.8,0.042,1',
  ].join('\n');

  const rows = parseExperimentCsv(legacyCsv);
  assert.equal(rows.length, 2);
  const agg = aggregateExperimentData(rows, 'ALL');
  assert.equal(agg.totalRuns, 2);
  assert.equal(agg.sweetSpot?.limit, 64);
  assert.equal(agg.hardwareBreakdown.hasComponents, false);
});
