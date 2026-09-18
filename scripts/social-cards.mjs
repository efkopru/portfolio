import { siteProjects } from '../content/site-structure.mjs';
import { projects } from '../content/portfolio.mjs';
const sources = new Map(projects.map(project => [project.id, project]));
export const socialCards = [
  { Name: 'portfolio', Category: 'GEOSPATIAL PORTFOLIO', Title: 'Analysis. Pipelines. Applications.', Metric: 'Esad Kopru', Caption: 'Data science / Data engineering / Software' },
  ...siteProjects.map(project => {
    const source = sources.get(project.id) || project;
    return { Name: project.id, Category: (project.type || 'Geospatial project').toUpperCase(), Title: source.title,
      Metric: source.metric || 'Esad Kopru', Caption: source.metricLabel || 'Methods, implementation, and project evidence',
      ImagePath: project.gallery[0]?.preview || null };
  })
];
// This authoring helper emits metadata only; normal builds use the checked-in PNGs.
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/social-cards.mjs')) console.log(JSON.stringify(socialCards));
