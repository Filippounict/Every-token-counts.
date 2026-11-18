import PptxGenJS from 'pptxgenjs';
import type { AggregatedPosterData, PosterMetadata, ProofOfWorkManifest } from '../types/experiment';
import { svgElementToPngDataUrl } from './svgExport';

// True ISO A0 Portrait dimensions in inches (841 mm x 1189 mm = 84.1 cm x 118.9 cm)
const A0_W = 33.11;
const A0_H = 46.81;

const MARGIN = 0.75;
const GUTTER = 0.61;
const COL_W = 15.5;
const COL_L = MARGIN;
const COL_R = MARGIN + COL_W + GUTTER; // 16.86"

const FONT_HEAD = 'Calibri';
const FONT_BODY = 'Calibri';
const FONT_MONO = 'Consolas';

const C_NAVY = '0F172A';
const C_SLATE_DARK = '1E293B';
const C_SLATE_TEXT = '334155';
const C_SLATE_MUTED = '64748B';
const C_BORDER = 'CBD5E1';
const C_BG_PAGE = 'F1F5F9';
const C_BG_SUBTLE = 'F8FAFC';
const C_WHITE = 'FFFFFF';
const C_TEAL = '0F766E';
const C_TEAL_LIGHT = '5EEAD4';
const C_TEAL_BG = 'F0FDFA';
const C_RED = 'B91C1C';
const C_RED_BG = 'FEF2F2';
const C_AMBER_LIGHT = 'FCD34D';

function drawSectionCard(
  slide: PptxGenJS.Slide,
  pres: PptxGenJS,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string
): void {
  slide.addShape(pres.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    rectRadius: 0.04,
    fill: { color: C_WHITE },
    line: { color: C_BORDER, width: 1.2 },
  });

  slide.addText(title, {
    x: x + 0.35,
    y: y + 0.22,
    w: w - 0.7,
    h: 0.55,
    fontFace: FONT_HEAD,
    fontSize: 23,
    bold: true,
    color: C_NAVY,
    valign: 'middle',
  });

  slide.addShape(pres.ShapeType.line, {
    x: x + 0.35,
    y: y + 0.82,
    w: w - 0.7,
    h: 0,
    line: { color: 'E2E8F0', width: 1.2 },
  });
}

function fitImageBox(
  imgW: number,
  imgH: number,
  maxW: number,
  maxH: number,
  boxX: number,
  boxY: number
): { x: number; y: number; w: number; h: number } {
  const ratio = imgW / Math.max(1, imgH);
  let w = maxW;
  let h = w / ratio;
  if (h > maxH) {
    h = maxH;
    w = h * ratio;
  }
  return {
    x: boxX + (maxW - w) / 2,
    y: boxY + (maxH - h) / 2,
    w,
    h,
  };
}

export interface ExportA0PptxParams {
  data: AggregatedPosterData;
  metadata: PosterMetadata;
  isCustomData: boolean;
  datasetFilter: string;
  proofManifest: ProofOfWorkManifest | null;
}

export async function exportPosterToA0Pptx({
  data,
  metadata,
  isCustomData,
  datasetFilter,
  proofManifest,
}: ExportA0PptxParams): Promise<void> {
  // Rasterize all 5 live SVG charts at 4x resolution (~300 DPI on A0 print)
  const [pipelineImg, fig1Img, fig2Img, fig3Img, fig4Img] = await Promise.all([
    svgElementToPngDataUrl('fig-pipeline-svg', 4),
    svgElementToPngDataUrl('fig1-token-scaling-svg', 4),
    svgElementToPngDataUrl('fig2-heatmap-svg', 4),
    svgElementToPngDataUrl('fig3-output-caps-svg', 4),
    svgElementToPngDataUrl('fig4-input-quality-svg', 4),
  ]);

  const pres = new PptxGenJS();
  pres.author = metadata.authors;
  pres.company = metadata.affiliation;
  pres.subject = metadata.courseContext;
  pres.title = metadata.title;

  pres.defineLayout({ name: 'ISO_A0_PORTRAIT', width: A0_W, height: A0_H });
  pres.layout = 'ISO_A0_PORTRAIT';

  const slide = pres.addSlide();
  slide.background = { color: C_BG_PAGE };

  const rq3 = data.rq3Thinking;
  const rq3Arms = [rq3.direct, rq3.thinking].filter(
    (arm): arm is NonNullable<typeof arm> => arm !== null
  );
  const posterProofRows = data.proofTraces.slice(0, 4);

  // =========================================================================
  // 1. FULL-WIDTH HEADER BANNER (y = 0 to 6.35")
  // =========================================================================
  slide.addShape(pres.ShapeType.rect, {
    x: 0,
    y: 0,
    w: A0_W,
    h: 6.23,
    fill: { color: C_NAVY },
    line: { color: C_NAVY, width: 0 },
  });
  slide.addShape(pres.ShapeType.rect, {
    x: 0,
    y: 6.23,
    w: A0_W,
    h: 0.12,
    fill: { color: C_TEAL },
    line: { color: C_TEAL, width: 0 },
  });

  const kicker = `${metadata.courseContext.toUpperCase()}  ·  ISO A0 PORTRAIT  ·  ${
    isCustomData ? 'REAL LOCAL MEASUREMENT' : 'EXAMPLE PRELIMINARY PREVIEW'
  }${datasetFilter !== 'ALL' ? `  ·  TASK: ${datasetFilter}` : ''}`;

  slide.addText(kicker, {
    x: 0.85,
    y: 0.36,
    w: 22.8,
    h: 0.42,
    fontFace: FONT_MONO,
    fontSize: 19,
    bold: true,
    color: C_TEAL_LIGHT,
  });

  slide.addText(metadata.title, {
    x: 0.85,
    y: 0.82,
    w: 22.8,
    h: 1.72,
    fontFace: FONT_HEAD,
    fontSize: 48,
    bold: true,
    color: C_WHITE,
    valign: 'top',
  });

  slide.addText(metadata.subtitle, {
    x: 0.85,
    y: 2.58,
    w: 22.8,
    h: 1.0,
    fontFace: FONT_BODY,
    fontSize: 21,
    color: 'CBD5E1',
    valign: 'top',
  });

  const modelText = data.modelsTested.length > 0 ? data.modelsTested.join(' vs. ') : metadata.modelLabel;
  const hwText = proofManifest?.hardware?.os
    ? `${proofManifest.hardware.os} (${proofManifest.hardware.machine ?? ''}) · CodeCarbon`
    : metadata.hardwareLabel;

  slide.addText(
    [
      { text: `${metadata.authors}\n`, options: { bold: true, fontSize: 23, color: C_WHITE } },
      { text: `${metadata.affiliation}\n`, options: { fontSize: 19, color: 'CBD5E1' } },
      { text: `${modelText}\n`, options: { fontFace: FONT_MONO, fontSize: 18, color: C_TEAL_LIGHT } },
      { text: hwText, options: { fontFace: FONT_MONO, fontSize: 16, color: '94A3B8' } },
    ],
    {
      x: 24.0,
      y: 0.82,
      w: 8.3,
      h: 2.75,
      align: 'right',
      valign: 'top',
      paraSpaceAfter: 6,
    }
  );

  // Header divider
  slide.addShape(pres.ShapeType.line, {
    x: 0.85,
    y: 3.78,
    w: 31.41,
    h: 0,
    line: { color: '334155', width: 1.2 },
  });

  // 4-Column Key Findings Strip inside Header (y = 3.98" to 5.88")
  const kpiCards = [
    {
      label: 'Output vs. Input Cost (RQ1)',
      value: data.outputToInputSlopeRatio > 0 ? `${data.outputToInputSlopeRatio.toFixed(1)}×` : '—',
      sub: 'more per output token',
      accent: C_WHITE,
    },
    {
      label: 'Output Sweet Spot (RQ2a)',
      value: data.sweetSpot ? `${data.sweetSpot.limit} tokens` : '—',
      sub: data.sweetSpot ? `(${data.sweetSpot.accuracyPct.toFixed(0)}% accuracy)` : '',
      accent: C_TEAL_LIGHT,
    },
    {
      label: 'Long Input Effect (RQ2b)',
      value:
        data.rq2InputQuality.length >= 2
          ? `${data.inputQualityDropPct > 0 ? '-' : '+'}${Math.abs(data.inputQualityDropPct).toFixed(0)}%`
          : '—',
      sub: 'accuracy (Short → Long)',
      accent: C_AMBER_LIGHT,
    },
    {
      label: 'Thinking Mode (RQ3)',
      value: rq3.hasBothModes && rq3.energyMultiplier > 0 ? `${rq3.energyMultiplier.toFixed(1)}×` : '—',
      sub: rq3.hasBothModes
        ? `energy (${rq3.accuracyGainPct >= 0 ? '+' : ''}${rq3.accuracyGainPct.toFixed(0)}% acc)`
        : '',
      accent: C_TEAL_LIGHT,
    },
  ];

  const kpiW = 7.55;
  const kpiGap = 0.4;
  kpiCards.forEach((kpi, idx) => {
    const kx = 0.85 + idx * (kpiW + kpiGap);
    slide.addShape(pres.ShapeType.roundRect, {
      x: kx,
      y: 3.98,
      w: kpiW,
      h: 1.88,
      rectRadius: 0.05,
      fill: { color: C_SLATE_DARK },
      line: { color: '334155', width: 1.0 },
    });
    slide.addText(kpi.label, {
      x: kx + 0.28,
      y: 4.14,
      w: kpiW - 0.56,
      h: 0.42,
      fontFace: FONT_BODY,
      fontSize: 18,
      color: 'CBD5E1',
    });
    slide.addText(
      [
        { text: `${kpi.value}  `, options: { fontFace: FONT_MONO, fontSize: 32, bold: true, color: kpi.accent } },
        { text: kpi.sub, options: { fontFace: FONT_BODY, fontSize: 18, color: 'CBD5E1' } },
      ],
      {
        x: kx + 0.28,
        y: 4.65,
        w: kpiW - 0.56,
        h: 0.95,
        valign: 'middle',
      }
    );
  });

  // =========================================================================
  // 2. LEFT COLUMN (x = 0.75", w = 15.50", y = 6.75" to 43.35")
  // =========================================================================

  // --- 01. Motivation & Research Questions (y=6.75, h=6.50) ---
  drawSectionCard(slide, pres, COL_L, 6.75, COL_W, 6.5, '01. MOTIVATION & RESEARCH QUESTIONS');
  slide.addText(
    'Every token sent to or written by a language model uses electricity [1, 2]. Longer prompts and longer answers do not only raise energy use — extra prompt text can also distract the model and lower answer quality [3, 4], while turning on reasoning (“thinking”) mode adds hidden tokens whose extra energy must be weighed against real accuracy gains [5, 6].',
    {
      x: COL_L + 0.35,
      y: 7.72,
      w: COL_W - 0.7,
      h: 1.48,
      fontFace: FONT_BODY,
      fontSize: 18,
      color: C_SLATE_TEXT,
      valign: 'top',
    }
  );

  // Main RQ callout box
  slide.addShape(pres.ShapeType.roundRect, {
    x: COL_L + 0.35,
    y: 9.25,
    w: COL_W - 0.7,
    h: 1.28,
    rectRadius: 0.04,
    fill: { color: C_BG_SUBTLE },
    line: { color: C_BORDER, width: 1.0 },
  });
  slide.addText(
    [
      { text: 'MAIN RESEARCH QUESTION\n', options: { fontFace: FONT_HEAD, fontSize: 16, bold: true, color: C_TEAL } },
      {
        text: 'How do input length, output length, and reasoning (“thinking”) mode affect energy and answer quality, and where do extra tokens stop helping?',
        options: { fontFace: FONT_BODY, fontSize: 19, bold: true, color: C_NAVY },
      },
    ],
    {
      x: COL_L + 0.55,
      y: 9.35,
      w: COL_W - 1.1,
      h: 1.08,
      valign: 'middle',
    }
  );

  slide.addText(
    [
      { text: 'RQ1 (Input vs. Output Energy): ', options: { bold: true, color: C_NAVY } },
      { text: 'Does energy grow faster with input length or output length, and which matters more?\n', options: { color: C_SLATE_TEXT } },
      { text: 'RQ2 (Length vs. Answer Quality): ', options: { bold: true, color: C_NAVY } },
      { text: 'How do output caps (num_predict, word limits) and longer inputs affect accuracy, and where is the sweet spot?\n', options: { color: C_SLATE_TEXT } },
      { text: 'RQ3 (Reasoning / Thinking Mode): ', options: { bold: true, color: C_NAVY } },
      { text: 'How much energy does reasoning (“thinking”) mode add compared with a direct answer, and how much accuracy does it buy per extra Wh?', options: { color: C_SLATE_TEXT } },
    ],
    {
      x: COL_L + 0.35,
      y: 10.7,
      w: COL_W - 0.7,
      h: 2.35,
      fontFace: FONT_BODY,
      fontSize: 18,
      paraSpaceAfter: 6,
      valign: 'top',
    }
  );

  // --- 02. What Prior Studies Found (y=13.67, h=5.95) ---
  drawSectionCard(slide, pres, COL_L, 13.67, COL_W, 5.95, '02. WHAT PRIOR STUDIES FOUND');
  const litRows: PptxGenJS.TableRow[] = [
    [
      { text: 'Study', options: { bold: true, color: C_SLATE_MUTED, fill: { color: C_BG_SUBTLE } } },
      { text: 'Focus', options: { bold: true, color: C_SLATE_MUTED, fill: { color: C_BG_SUBTLE } } },
      { text: 'Main Finding', options: { bold: true, color: C_SLATE_MUTED, fill: { color: C_BG_SUBTLE } } },
    ],
    [
      { text: 'UNESCO & UCL [1]', options: { bold: true, color: C_NAVY } },
      { text: 'Energy', options: { color: C_SLATE_TEXT } },
      { text: 'Halving input saves 5% energy; halving output saves 54%.', options: { color: C_SLATE_TEXT } },
    ],
    [
      { text: 'Fernandez et al. [2]', options: { bold: true, color: C_NAVY } },
      { text: 'Energy', options: { color: C_SLATE_TEXT } },
      { text: 'Reading input runs in parallel; writing output runs token-by-token.', options: { color: C_SLATE_TEXT } },
    ],
    [
      { text: 'Levy et al. [3]', options: { bold: true, color: C_NAVY } },
      { text: 'Input quality', options: { color: C_SLATE_TEXT } },
      { text: 'Adding extra text to the same task lowers reasoning accuracy.', options: { color: C_SLATE_TEXT } },
    ],
    [
      { text: 'Liu et al. [4]', options: { bold: true, color: C_NAVY } },
      { text: 'Input quality', options: { color: C_SLATE_TEXT } },
      { text: 'Facts placed in the middle of long inputs are often missed.', options: { color: C_SLATE_TEXT } },
    ],
    [
      { text: 'Samsi et al. [5]', options: { bold: true, color: C_NAVY } },
      { text: 'Model size', options: { color: C_SLATE_TEXT } },
      { text: 'Larger models use more energy per token; tasks change output length.', options: { color: C_SLATE_TEXT } },
    ],
    [
      { text: 'Zadenoori et al. [6]', options: { bold: true, color: C_NAVY } },
      { text: 'Model size', options: { color: C_SLATE_TEXT } },
      { text: 'Small local models stay within ~2% of huge cloud models on focused tasks.', options: { color: C_SLATE_TEXT } },
    ],
  ];

  slide.addTable(litRows, {
    x: COL_L + 0.35,
    y: 14.68,
    w: COL_W - 0.7,
    colW: [3.35, 2.25, 9.2],
    fontFace: FONT_BODY,
    fontSize: 17,
    border: { type: 'solid', pt: 0.75, color: 'E2E8F0' },
    margin: [0.09, 0.1, 0.09, 0.1],
    valign: 'middle',
  });

  // --- 03. How We Run & Measure It (y=20.04, h=6.40) ---
  drawSectionCard(slide, pres, COL_L, 20.04, COL_W, 6.4, '03. HOW WE RUN & MEASURE IT');
  if (pipelineImg) {
    const pos = fitImageBox(pipelineImg.width, pipelineImg.height, COL_W - 0.7, 3.85, COL_L + 0.35, 20.98);
    slide.addImage({ data: pipelineImg.dataUrl, ...pos });
  }

  const splitLine = data.hardwareBreakdown.hasComponents
    ? `Split: ${data.hardwareBreakdown.measuredComputeSharePct.toFixed(0)}% CPU/GPU vs. ${data.hardwareBreakdown.estimatedRamSharePct.toFixed(0)}% est. RAM${
        data.hardwareBreakdown.idlePowerW !== null
          ? `  ·  Idle: ${data.hardwareBreakdown.idlePowerW.toFixed(1)} W vs. Active: ${data.hardwareBreakdown.inferencePowerW.toFixed(1)} W`
          : ''
      }`
    : '';

  slide.addText(
    [
      { text: 'Model: ', options: { color: C_SLATE_MUTED } },
      { text: `${data.modelsTested.join(', ') || 'qwen3:1.7b'}    `, options: { fontFace: FONT_MONO, bold: true, color: C_NAVY } },
      { text: 'Runtime: ', options: { color: C_SLATE_MUTED } },
      { text: 'Ollama Python client\n', options: { bold: true, color: C_NAVY } },
      { text: 'Settings: ', options: { color: C_SLATE_MUTED } },
      { text: 'temp=0, seed=42    ', options: { fontFace: FONT_MONO, bold: true, color: C_NAVY } },
      { text: 'Meter: ', options: { color: C_SLATE_MUTED } },
      { text: 'CodeCarbon (machine mode)\n', options: { bold: true, color: C_NAVY } },
      { text: 'Tasks: ', options: { color: C_SLATE_MUTED } },
      { text: 'GSM8K math, TriviaQA facts    ', options: { bold: true, color: C_NAVY } },
      { text: 'Controls: ', options: { color: C_SLATE_MUTED } },
      { text: '5s idle, warmup, AC power\n', options: { bold: true, color: C_NAVY } },
      ...(splitLine ? [{ text: splitLine, options: { fontFace: FONT_MONO, fontSize: 16, color: C_SLATE_TEXT } }] : []),
    ],
    {
      x: COL_L + 0.35,
      y: 24.92,
      w: COL_W - 0.7,
      h: 1.4,
      fontFace: FONT_BODY,
      fontSize: 17,
      paraSpaceAfter: 4,
      valign: 'top',
    }
  );

  // --- 04. RQ1: Input vs. Output Energy (y=26.86, h=8.20) ---
  drawSectionCard(slide, pres, COL_L, 26.86, COL_W, 8.2, '04. RQ1: INPUT VS. OUTPUT ENERGY');
  if (fig1Img) {
    const pos = fitImageBox(fig1Img.width, fig1Img.height, COL_W - 0.9, 5.95, COL_L + 0.45, 27.82);
    slide.addImage({ data: fig1Img.dataUrl, ...pos });
  }
  slide.addText(
    [
      { text: 'Fig. 1 Finding: ', options: { bold: true, color: C_NAVY } },
      {
        text: `Writing output tokens costs ${
          data.outputToInputSlopeRatio > 0 ? `${data.outputToInputSlopeRatio.toFixed(1)}×` : 'much'
        } more energy per token than reading input tokens. The model reads the whole prompt in parallel, but writes each output token one by one [1, 2].`,
        options: { color: C_SLATE_TEXT },
      },
    ],
    {
      x: COL_L + 0.35,
      y: 33.88,
      w: COL_W - 0.7,
      h: 1.05,
      fontFace: FONT_BODY,
      fontSize: 18,
      valign: 'top',
    }
  );

  // --- 05. RQ1: Input × Output Energy Grid (y=35.48, h=7.87) ---
  drawSectionCard(slide, pres, COL_L, 35.48, COL_W, 7.87, '05. RQ1: INPUT × OUTPUT ENERGY GRID');
  if (fig2Img) {
    const pos = fitImageBox(fig2Img.width, fig2Img.height, COL_W - 0.9, 5.6, COL_L + 0.45, 36.42);
    slide.addImage({ data: fig2Img.dataUrl, ...pos });
  }
  slide.addText(
    [
      { text: 'Fig. 2 Finding: ', options: { bold: true, color: C_NAVY } },
      {
        text: 'Moving upward (longer answers) raises energy much faster than moving right (longer prompts), showing that output length is the main driver of energy.',
        options: { color: C_SLATE_TEXT },
      },
    ],
    {
      x: COL_L + 0.35,
      y: 42.14,
      w: COL_W - 0.7,
      h: 1.05,
      fontFace: FONT_BODY,
      fontSize: 18,
      valign: 'top',
    }
  );

  // =========================================================================
  // 3. RIGHT COLUMN (x = 16.86", w = 15.50", y = 6.75" to 43.35")
  // =========================================================================

  // --- 06. RQ2a: Output Limits & Sweet Spot (y=6.75, h=8.25) ---
  drawSectionCard(slide, pres, COL_R, 6.75, COL_W, 8.25, '06. RQ2A: OUTPUT LIMITS & SWEET SPOT');
  if (fig3Img) {
    const pos = fitImageBox(fig3Img.width, fig3Img.height, COL_W - 0.9, 5.95, COL_R + 0.45, 7.72);
    slide.addImage({ data: fig3Img.dataUrl, ...pos });
  }
  slide.addText(
    [
      { text: 'Fig. 3 Finding: ', options: { bold: true, color: C_NAVY } },
      {
        text: `Very small caps (32–64 tokens) cut off math steps and hurt accuracy. Accuracy reaches its sweet spot at ${
          data.sweetSpot ? `${data.sweetSpot.limit} tokens` : '—'
        } (smallest cap within 2% of top accuracy); larger limits spend extra energy with no quality gain.`,
        options: { color: C_SLATE_TEXT },
      },
    ],
    {
      x: COL_R + 0.35,
      y: 13.78,
      w: COL_W - 0.7,
      h: 1.08,
      fontFace: FONT_BODY,
      fontSize: 18,
      valign: 'top',
    }
  );

  // --- 07. RQ2b: Does Longer Input Hurt Quality? (y=15.42, h=8.25) ---
  drawSectionCard(slide, pres, COL_R, 15.42, COL_W, 8.25, '07. RQ2B: DOES LONGER INPUT HURT QUALITY?');
  if (fig4Img) {
    const pos = fitImageBox(fig4Img.width, fig4Img.height, COL_W - 0.9, 5.95, COL_R + 0.45, 16.38);
    slide.addImage({ data: fig4Img.dataUrl, ...pos });
  }
  slide.addText(
    [
      { text: 'Fig. 4 Finding: ', options: { bold: true, color: C_NAVY } },
      {
        text: 'Asking the exact same questions inside longer background text raises energy AND causes accuracy to drop — matching Levy et al. [3] and Liu et al. [4]. Keeping prompts short helps both energy and quality.',
        options: { color: C_SLATE_TEXT },
      },
    ],
    {
      x: COL_R + 0.35,
      y: 22.45,
      w: COL_W - 0.7,
      h: 1.08,
      fontFace: FONT_BODY,
      fontSize: 18,
      valign: 'top',
    }
  );

  // --- 08. RQ3: Thinking Mode vs. Direct (y=24.09, h=6.50) ---
  drawSectionCard(slide, pres, COL_R, 24.09, COL_W, 6.5, '08. RQ3: THINKING MODE VS. DIRECT');

  const rq3TableRows: PptxGenJS.TableRow[] = [
    [
      { text: 'Answer Mode', options: { bold: true, color: C_SLATE_MUTED, fill: { color: C_BG_SUBTLE } } },
      { text: 'Accuracy', options: { bold: true, color: C_SLATE_MUTED, align: 'right', fill: { color: C_BG_SUBTLE } } },
      { text: 'Avg Out', options: { bold: true, color: C_SLATE_MUTED, align: 'right', fill: { color: C_BG_SUBTLE } } },
      { text: 'Avg mWh', options: { bold: true, color: C_SLATE_MUTED, align: 'right', fill: { color: C_BG_SUBTLE } } },
      { text: 'mWh / Corr', options: { bold: true, color: C_SLATE_MUTED, align: 'right', fill: { color: C_BG_SUBTLE } } },
    ],
    ...rq3Arms.map((arm) => [
      { text: arm.label, options: { bold: true, color: C_NAVY } },
      {
        text: `${arm.accuracyPct.toFixed(0)}% (${arm.correctCount}/${arm.count})`,
        options: { fontFace: FONT_MONO, bold: true, color: C_TEAL, align: 'right' as const },
      },
      {
        text: `${Math.round(arm.avgOutputTokens)} tok`,
        options: { fontFace: FONT_MONO, color: C_SLATE_TEXT, align: 'right' as const },
      },
      {
        text: `${(arm.avgEnergyWh * 1000).toFixed(1)}`,
        options: { fontFace: FONT_MONO, color: C_NAVY, align: 'right' as const },
      },
      {
        text: arm.whPerCorrect !== null ? `${(arm.whPerCorrect * 1000).toFixed(1)}` : '—',
        options: { fontFace: FONT_MONO, bold: true, color: C_NAVY, align: 'right' as const },
      },
    ]),
  ];

  slide.addTable(rq3TableRows, {
    x: COL_R + 0.35,
    y: 25.08,
    w: COL_W - 0.7,
    colW: [4.6, 3.0, 2.3, 2.3, 2.6],
    fontFace: FONT_BODY,
    fontSize: 18,
    border: { type: 'solid', pt: 0.75, color: 'E2E8F0' },
    margin: [0.1, 0.12, 0.1, 0.12],
    valign: 'middle',
  });

  if (rq3.hasBothModes) {
    const boxW = (COL_W - 0.7 - 0.35) / 2;
    // Extra Energy Added box
    slide.addShape(pres.ShapeType.roundRect, {
      x: COL_R + 0.35,
      y: 27.32,
      w: boxW,
      h: 1.35,
      rectRadius: 0.04,
      fill: { color: C_RED_BG },
      line: { color: 'FECACA', width: 1.0 },
    });
    slide.addText(
      [
        { text: 'Extra Energy Added\n', options: { fontFace: FONT_BODY, fontSize: 17, bold: true, color: '991B1B' } },
        {
          text: `+${rq3.extraEnergyMwh.toFixed(1)} mWh (${rq3.energyMultiplier.toFixed(1)}×)`,
          options: { fontFace: FONT_MONO, fontSize: 24, bold: true, color: C_RED },
        },
      ],
      {
        x: COL_R + 0.55,
        y: 27.42,
        w: boxW - 0.4,
        h: 1.15,
        valign: 'middle',
      }
    );

    // Acc Bought / Extra Wh box
    slide.addShape(pres.ShapeType.roundRect, {
      x: COL_R + 0.35 + boxW + 0.35,
      y: 27.32,
      w: boxW,
      h: 1.35,
      rectRadius: 0.04,
      fill: { color: C_TEAL_BG },
      line: { color: '99F6E4', width: 1.0 },
    });
    const gainPerWhText =
      rq3.accuracyGainPerExtraWh !== null
        ? `${rq3.accuracyGainPerExtraWh >= 0 ? '+' : ''}${rq3.accuracyGainPerExtraWh.toFixed(0)}% / Wh`
        : '—';
    slide.addText(
      [
        { text: 'Accuracy Bought / Extra Wh\n', options: { fontFace: FONT_BODY, fontSize: 17, bold: true, color: '115E59' } },
        {
          text: gainPerWhText,
          options: { fontFace: FONT_MONO, fontSize: 24, bold: true, color: C_TEAL },
        },
      ],
      {
        x: COL_R + 0.55 + boxW + 0.35,
        y: 27.42,
        w: boxW - 0.4,
        h: 1.15,
        valign: 'middle',
      }
    );
  }

  const rq3BreakdownText =
    rq3.byDataset.length >= 2
      ? rq3.byDataset
          .map(
            (d) =>
              `${d.dataset}: ${d.accGainPct >= 0 ? '+' : ''}${d.accGainPct.toFixed(0)}% acc (+${d.extraMwh.toFixed(
                0
              )} mWh, ${d.energyMultiplier.toFixed(1)}×)`
          )
          .join('  ·  ') + ' — thinking pays off on multi-step math, not simple facts.'
      : 'Reasoning mode writes hidden thinking tokens before the final answer, adding energy that pays off only when direct answers fail [5, 6].';

  slide.addText(rq3BreakdownText, {
    x: COL_R + 0.35,
    y: 28.88,
    w: COL_W - 0.7,
    h: 1.5,
    fontFace: FONT_BODY,
    fontSize: 18,
    color: C_SLATE_TEXT,
    valign: 'top',
  });

  // --- 09. Proof-of-Work: Sample Logged Runs (y=31.01, h=5.95) ---
  const shaTitle = proofManifest?.files?.results_csv_sha256
    ? `09. PROOF-OF-WORK LOG (SHA256: ${proofManifest.files.results_csv_sha256.slice(0, 10)}…)`
    : '09. PROOF-OF-WORK: SAMPLE LOGGED RUNS';
  drawSectionCard(slide, pres, COL_R, 31.01, COL_W, 5.95, shaTitle);

  const proofRows: PptxGenJS.TableRow[] = [
    [
      { text: 'Prompt & Mode', options: { bold: true, color: C_SLATE_MUTED, fill: { color: C_BG_SUBTLE } } },
      { text: 'Result & mWh', options: { bold: true, color: C_SLATE_MUTED, align: 'right', fill: { color: C_BG_SUBTLE } } },
      { text: 'Logged Model Output (Expected)', options: { bold: true, color: C_SLATE_MUTED, fill: { color: C_BG_SUBTLE } } },
    ],
    ...posterProofRows.map((tr) => {
      const clipped = tr.responsePreview.length > 78 ? `${tr.responsePreview.slice(0, 75)}…` : tr.responsePreview;
      return [
        {
          text: `${tr.promptId} · ${tr.conditionLabel}`,
          options: { fontFace: FONT_MONO, bold: true, fontSize: 15, color: C_NAVY },
        },
        {
          text: `${tr.correct ? 'PASS' : 'FAIL'} · ${tr.energyMwh.toFixed(1)} mWh`,
          options: {
            fontFace: FONT_MONO,
            bold: true,
            fontSize: 15,
            color: tr.correct ? C_TEAL : C_RED,
            align: 'right' as const,
          },
        },
        {
          text: `"${clipped}" (Exp: ${tr.expectedAnswer})`,
          options: { fontSize: 15.5, color: C_SLATE_TEXT },
        },
      ];
    }),
  ];

  slide.addTable(proofRows, {
    x: COL_R + 0.35,
    y: 32.02,
    w: COL_W - 0.7,
    colW: [3.75, 2.75, 8.3],
    fontFace: FONT_BODY,
    fontSize: 16,
    border: { type: 'solid', pt: 0.75, color: 'E2E8F0' },
    margin: [0.09, 0.1, 0.09, 0.1],
    valign: 'middle',
  });

  slide.addText(
    'Every local run automatically saves experiment_results.csv (timestamps + raw answers), untouched CodeCarbon emissions_raw.csv, and proof_of_work.json (hardware specs + SHA-256 checksums).',
    {
      x: COL_R + 0.35,
      y: 35.92,
      w: COL_W - 0.7,
      h: 0.85,
      fontFace: FONT_BODY,
      fontSize: 16,
      italic: true,
      color: C_SLATE_MUTED,
      valign: 'top',
    }
  );

  // --- 10. Key Takeaways & Measurement Limits (y=37.38, h=5.97) ---
  drawSectionCard(slide, pres, COL_R, 37.38, COL_W, 5.97, '10. KEY TAKEAWAYS & MEASUREMENT LIMITS');
  slide.addText(
    [
      { text: '• Cap Output Near the Sweet Spot: ', options: { bold: true, color: C_NAVY } },
      { text: 'Output tokens drive energy most; setting a sensible limit saves energy with zero accuracy loss.\n', options: { color: C_SLATE_TEXT } },
      { text: '• Keep Inputs Short & Clean: ', options: { bold: true, color: C_NAVY } },
      { text: 'Extra prompt text adds energy AND can lower accuracy on the exact same question [3, 4].\n', options: { color: C_SLATE_TEXT } },
      { text: '• Turn Thinking On Only When Needed: ', options: { bold: true, color: C_NAVY } },
      { text: 'Reasoning mode multiplies energy use; it buys accuracy per extra Wh on multi-step math, but wastes energy on simple factual recall.\n', options: { color: C_SLATE_TEXT } },
      { text: '• Measurement Limits: ', options: { bold: true, color: C_NAVY } },
      {
        text: 'CodeCarbon runs in machine mode to capture Ollama (background apps closed). CPU/GPU use hardware counters while RAM is a fixed estimate (checked via our 5s idle baseline). Local measurements only (cloud APIs need EcoLogits), and CO₂ depends strongly on grid intensity (SWE vs. DEU vs. IND).',
        options: { color: C_SLATE_TEXT },
      },
    ],
    {
      x: COL_R + 0.35,
      y: 38.35,
      w: COL_W - 0.7,
      h: 4.82,
      fontFace: FONT_BODY,
      fontSize: 17.5,
      paraSpaceAfter: 9,
      valign: 'top',
    }
  );

  // =========================================================================
  // 4. FULL-WIDTH REFERENCES FOOTER BAND (y = 43.75" to 46.20")
  // =========================================================================
  slide.addShape(pres.ShapeType.roundRect, {
    x: MARGIN,
    y: 43.75,
    w: A0_W - MARGIN * 2,
    h: 2.45,
    rectRadius: 0.04,
    fill: { color: C_WHITE },
    line: { color: C_BORDER, width: 1.2 },
  });

  slide.addText('REFERENCES  ·  ISO A0 PORTRAIT (841 × 1189 MM)', {
    x: MARGIN + 0.35,
    y: 43.9,
    w: 20.0,
    h: 0.36,
    fontFace: FONT_HEAD,
    fontSize: 16,
    bold: true,
    color: C_SLATE_MUTED,
  });

  slide.addText(
    '1. UNESCO & UCL, "Smarter, Smaller, Stronger: Resource-Efficient Generative AI," 2025.\n2. Fernandez et al., "Energy Considerations of LLM Inference," ACL, 2025.\n3. Levy, Jacoby & Goldberg, "Same Task, More Tokens: Impact of Input Length on Reasoning," ACL, 2024.',
    {
      x: MARGIN + 0.35,
      y: 44.32,
      w: 15.1,
      h: 1.72,
      fontFace: FONT_BODY,
      fontSize: 15.5,
      color: C_SLATE_TEXT,
      paraSpaceAfter: 4,
      valign: 'top',
    }
  );

  slide.addText(
    '4. Liu et al., "Lost in the Middle: How Language Models Use Long Contexts," TACL, 2024.\n5. Samsi et al., "From Words to Watts: Energy Costs of LLM Inference," IEEE HPEC, 2023.\n6. Zadenoori et al., "Does Model Size Matter? Small vs. Large LMs," arXiv:2510.21443, 2025.',
    {
      x: COL_R + 0.15,
      y: 44.32,
      w: 15.1,
      h: 1.72,
      fontFace: FONT_BODY,
      fontSize: 15.5,
      color: C_SLATE_TEXT,
      paraSpaceAfter: 4,
      valign: 'top',
    }
  );

  await pres.writeFile({ fileName: 'SusCo26_Poster_A0.pptx' });
}
