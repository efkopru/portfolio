import { projects } from './portfolio.mjs';
import screenshots from './screenshots.json' with { type: 'json' };

// Remove these from collection indexes and menus without deleting their pages or assets.
const unlistedProjectIds = new Set([
  'lead-service-line-ocr',
  's2s-transformer-bias-correction',
  'dask-ensemble-calibration',
  'vit-heatwave-calibration',
  'transformer-bias-correction'
]);

// The original site's three collections, names, and ordering.
export const collections = [
  { id: 'spatial-and-data-analysis', title: 'Spatial & Data Analysis', heading: 'Spatial and data analysis:', entries: [
    ['spatial-analysis', 'Spatial Analysis'], ['arcgis-enterprise-and-online', 'ArcGIS Enterprise and Online'], ['qgis', 'QGIS'], ['code-enforcement-violations', 'Code Enforcement Violations'], ['crime-analysis', 'Crime Analysis']
  ] },
  { id: 'ml-optimization', title: 'ML / Optimization', heading: 'Machine learning, deep learning, and optimization:', entries: [
    ['income-level-prediction-using-r', 'Income Level Prediction using R'], ['building-footprint-extraction', 'Building Footprint Extraction'], ['traveling-salesman', 'Traveling Salesman'], ['water-conservation-routes', 'Water Conservation Routes']
  ] },
  { id: 'development-and-etl', title: 'Development & ETL', heading: 'Development and automation:', entries: [
    ['python-and-notebooks', 'Python Scripts & Notebooks'], ['sql-and-javascript-and-r', 'SQL & JavaScript & R'], ['modelbuilder-and-arcmap-tool-in-vbnet', 'ModelBuilder & ArcMap tool in VB.NET'], ['interactive-maps-a-custom-js-app', 'Interactive Maps - A custom JS App'], ['interactive-maps-experience-builder', 'Interactive Maps - Experience Builder']
  ] }
];
const titles = new Map(collections.flatMap(c => c.entries));
titles.set('doctoral-research', 'Doctoral Research');
// Keep the original order, then include newer work in the same browsing structure.
const additionalCollectionIds = {
  'lead-service-line-ocr': 'spatial-and-data-analysis',
  'accessibility-analysis': 'spatial-and-data-analysis',
  'lead-service-review-prototype': 'ml-optimization',
  'lead-service-line-evidence-workbench': 'ml-optimization',
  's2s-transformer-bias-correction': 'ml-optimization',
  'dask-ensemble-calibration': 'ml-optimization',
  'vit-heatwave-calibration': 'ml-optimization',
  'transformer-bias-correction': 'ml-optimization',
  'utility-inspection-etl': 'development-and-etl',
  'parcel-data-integration': 'development-and-etl',
  'ground-patrol-analytics': 'spatial-and-data-analysis',
  'workforce-participation': 'development-and-etl',
  'geospatial-processing-tools': 'development-and-etl'
};
const extraPages = [
  { id: 'qgis', summary: 'Getting OpenStreetMap data and finding the shortest or fastest routes in QGIS.', gallery: screenshots.qgis },
  { id: 'sql-and-javascript-and-r', summary: 'SQL scripts, JavaScript applications, and data analysis in R.', gallery: screenshots['sql-and-javascript-and-r'] },
  { id: 'modelbuilder-and-arcmap-tool-in-vbnet', summary: 'Tools built with ModelBuilder and VB.NET to automate ArcGIS tasks.', gallery: screenshots['modelbuilder-and-arcmap-tool-in-vbnet'] },
  { id: 'code-enforcement-violations', summary: 'Maps comparing code violations at rental and non-rental homes.', gallery: [screenshots['spatial-analysis'][1]] },
  { id: 'interactive-maps-experience-builder', summary: 'A public map built with ArcGIS Experience Builder for large-screen displays.', gallery: [] }
];
const embeds = {
  'interactive-maps-a-custom-js-app': { url: 'https://maps.cityoflewisville.com/', title: 'City of Lewisville public GIS map', note: 'The current public application may differ from its historical version.' },
  'interactive-maps-experience-builder': { url: 'https://experience.arcgis.com/experience/2134151cd819462f81f9aa605c5efb1f/', title: 'Public GIS Experience Builder application', note: 'Some layers may require an ArcGIS account. The public application is maintained externally.' },
  'code-enforcement-violations': { url: 'https://lewisville.maps.arcgis.com/apps/MapSeries/index.html?appid=40438ef704624fc4a8cc1f06173b8e03', title: 'Code enforcement analysis', note: 'This historical application uses a retired ArcGIS template and may no longer load. The original map is preserved below.' },
  'crime-analysis': { url: 'https://www.arcgis.com/apps/dashboards/02de6953d7c54527b0e8259823df2ae6', title: 'Public crime-analysis dashboard', expanded: true }
};
export const siteProjects = [...projects, ...extraPages].map(project => ({
  ...project,
  title: titles.get(project.id) || project.title,
  original: titles.has(project.id),
  collection: collections.find(c => c.id === additionalCollectionIds[project.id] || c.entries.some(([id]) => id === (project.parentProjectId || project.id))),
  gallery: project.id === 'interactive-maps-a-custom-js-app' ? [] : screenshots[project.id] || project.gallery || [],
  embed: embeds[project.id]
}));
for (const project of siteProjects.filter(project => project.parentProjectId)) {
  const parent = siteProjects.find(candidate => candidate.id === project.parentProjectId);
  if (!parent || parent.id === project.id || parent.parentProjectId) throw new Error(`${project.id}: invalid parent project.`);
}
const listedProjects = siteProjects.filter(project => !project.original && !project.parentProjectId && !unlistedProjectIds.has(project.id));
export const browseCollections = collections.map(collection => ({
  ...collection,
  entries: [...collection.entries, ...listedProjects
    .filter(project => project.collection?.id === collection.id)
    .map(project => [project.id, project.title])]
}));
const collectionProjectIds = new Set(browseCollections.flatMap(collection => collection.entries.map(([id]) => id)));
export const additionalProjects = listedProjects.filter(project => !collectionProjectIds.has(project.id));
