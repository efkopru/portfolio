// Only public-safe companions are published. These are new educational examples,
// never employer source or measurements of historical production systems.
export const featuredWork = [
  { id: 'utility-inspection-etl', role: 'Data engineering', steps: ['Records', 'Process', 'Publish'] },
  { id: 'accessibility-analysis', role: 'Data science', steps: ['Network', 'Score', 'Compare'] },
  { id: 'interactive-maps-a-custom-js-app', role: 'Software engineering', steps: ['GIS data', 'Tools', 'Web map'] }
];

export const methodDiagrams = {
  'utility-inspection-etl': {
    src: 'assets/evidence/utility-inspection-pipeline.svg',
    title: 'Utility inspection pipeline: explanatory architecture',
    caption: 'Explanatory diagram based on the public case-study summary, not a client-system screenshot. Internal schemas, schedules, locations, and private source are not reproduced.'
  },
  'accessibility-analysis': {
    src: 'assets/evidence/accessibility-method.svg',
    title: 'Community accessibility: explanatory method',
    caption: 'Method illustration, not measured geography. Internal scoring weights, travel cutoffs, and decision records are not reproduced.'
  }
};

export const companions = [
  {
    id: 'spatial-etl', project: 'utility-inspection-etl', title: 'A reproducible spatial ETL example',
    summary: 'Run a synthetic-data pipeline with validation, transactional updates, repeatable loads, and failure recovery.',
    diagram: 'assets/evidence/spatial-etl.svg',
    diagramCaption: 'Architecture of the educational companion below, not the historical utility system.'
  },
  {
    id: 'lead-pipe-synthetic', project: 'lead-service-review-prototype', title: 'Inspect the synthetic ML evaluation',
    summary: 'Compare a grouped-split logistic baseline with a simple reference, inspect errors and calibration, and reproduce the results.',
    diagram: 'assets/evidence/lead-pipe-evaluation.svg',
    diagramCaption: 'Evaluation of invented records in the educational companion, not field performance or the original prototype.'
  },
  {
    id: 'network-access', project: 'doctoral-research', title: 'A worked network-access example',
    summary: 'Follow a small shared-edge network example, compare a shortest-path baseline with exact enumeration, and inspect measured toy-instance results.',
    diagram: 'assets/evidence/network-access.svg',
    diagramCaption: 'An invented teaching network, not dissertation evaluation data or a new research result.'
  }
];
export const companionFiles = companion => ['README.md', 'demo.py', 'test_demo.py', 'report.json', ...(companion.id === 'spatial-etl' ? ['records.json'] : [])].map(name => `examples/${companion.id}/${name}`);
export const evidenceAssets = [...Object.values(methodDiagrams).map(diagram => diagram.src), ...companions.map(companion => companion.diagram), ...companions.flatMap(companionFiles)];
export const companionRoute = id => `example-${id}`;
export const sourceRoute = (id, name) => `example-${id}-${({ 'README.md': 'guide', 'demo.py': 'code', 'test_demo.py': 'tests' })[name]}`;
