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
    title: 'How inspection data reaches the map',
    caption: 'A simplified view of the workflow, not a screenshot of the client system.'
  },
  'accessibility-analysis': {
    src: 'assets/evidence/accessibility-method.svg',
    title: 'How access to amenities was compared',
    caption: 'A diagram of the method, not a map of the study area.'
  }
};

export const companions = [
  {
    id: 'spatial-etl', project: 'utility-inspection-etl', title: 'Try a small data pipeline',
    summary: 'See how sample records are checked, loaded, and updated, including what happens when a load fails.',
    diagram: 'assets/evidence/spatial-etl.svg',
    diagramCaption: 'The sample pipeline, not the original utility system.'
  },
  {
    id: 'lead-pipe-synthetic', project: 'lead-service-review-prototype', title: 'Try a small prediction example',
    summary: 'Run a simple model on invented records and compare its predictions with the known answers.',
    diagram: 'assets/evidence/lead-pipe-evaluation.svg',
    diagramCaption: 'Results from invented records, not field results from the lead-pipe project.'
  },
  {
    id: 'network-access', project: 'doctoral-research', title: 'A worked network-access example',
    summary: 'Compare separate routes with a network that shares paths between destinations.',
    diagram: 'assets/evidence/network-access.svg',
    diagramCaption: 'An invented network for learning, not a dissertation test case.'
  }
];
export const companionFiles = companion => ['README.md', 'demo.py', 'test_demo.py', 'report.json', ...(companion.id === 'spatial-etl' ? ['records.json'] : [])].map(name => `examples/${companion.id}/${name}`);
export const evidenceAssets = [...Object.values(methodDiagrams).map(diagram => diagram.src), ...companions.map(companion => companion.diagram), ...companions.flatMap(companionFiles)];
export const companionRoute = id => `example-${id}`;
export const sourceRoute = (id, name) => `example-${id}-${({ 'README.md': 'guide', 'demo.py': 'code', 'test_demo.py': 'tests' })[name]}`;
