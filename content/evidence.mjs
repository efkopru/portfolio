// Only public-safe companions are published. These are new educational examples,
// never employer source or measurements of historical production systems.
import { projects } from './portfolio.mjs';
export const featuredWork = [
  { id: 'utility-inspection-etl', role: 'Data engineering', steps: ['Records', 'Process', 'Publish'] },
  { id: 'accessibility-analysis', role: 'Data science', steps: ['Network', 'Score', 'Compare'] },
  { id: 'interactive-maps-a-custom-js-app', role: 'Software engineering', steps: ['GIS data', 'Tools', 'Web map'] }
];

export const methodDiagrams = {
  'lead-service-line-evidence-workbench': {
    src: 'assets/evidence/lead-service-line-workbench.svg',
    title: 'Six stages from source pages to an accountable review record',
    caption: 'Version 3 workflow diagram. Extracted material mentions, verified labels, model predictions, and reviewer decisions remain distinct. The published demonstration uses invented records.'
  },
  'utility-inspection-etl': {
    src: 'assets/evidence/utility-data-flow.svg',
    title: 'Flight and asset data meet in spatial coverage analysis before GIS publication',
    caption: 'An original explanation of the source-data flow. It uses generic components and contains no client records or infrastructure locations.'
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
export const workbenchDemo = {
  project: 'lead-service-line-evidence-workbench',
  directory: 'assets/demos/lead-service-line-workbench',
  title: 'Inspect a synthetic review work plan',
  summary: 'Explore 99 review records from a demonstration run using 480 invented asset-side snapshots. Filter queues, inspect evidence and material probabilities, and record a review decision.',
  boundary: 'Use invented reviewer IDs and notes. Decisions stay in the browser tab until exported and are not submitted to a server. This demonstration does not establish field performance.'
};
export const workbenchAssets = ['index.html', 'review.css', 'review.js', 'provenance.json'].map(name => `${workbenchDemo.directory}/${name}`);
export const caseEvidenceAssets = [...new Set(projects.flatMap(project => (project.evidenceSections || []).flatMap(section => section.diagram ? [section.diagram.src] : [])))];
export const evidenceAssets = [...Object.values(methodDiagrams).map(diagram => diagram.src), ...companions.map(companion => companion.diagram), ...companions.flatMap(companionFiles), ...workbenchAssets, ...caseEvidenceAssets];
export const companionRoute = id => `example-${id}`;
export const sourceRoute = (id, name) => `example-${id}-${({ 'README.md': 'guide', 'demo.py': 'code', 'test_demo.py': 'tests' })[name]}`;
