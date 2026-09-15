import { profile, projects } from '../content/portfolio.mjs';
import { browseCollections, additionalProjects } from '../content/site-structure.mjs';
import { previewEvidence } from '../content/preview-evidence.mjs';

export const flagshipIds = ['utility-inspection-etl', 'accessibility-analysis', 'interactive-maps-a-custom-js-app'];
const roleLabels = ['Data engineering', 'Data science', 'Software engineering'];
const sourceProjects = new Map(projects.map(project => [project.id, project]));
export const sourceRoute = path => `source-${path.split('/').pop().replace(/\.[^.]+$/, '').replaceAll('_', '-').toLowerCase()}`;

// The alternate layout uses the same reviewed facts, navigation and viewer.
// Supplemental diagrams describe methods; they never stand in for real results.
export function previewHome(ui) {
  const { layout, esc, chips, projectList } = ui;
  const cards = flagshipIds.map((id, index) => {
    const project = sourceProjects.get(id);
    const diagram = previewEvidence[id]?.diagrams?.[0];
    const screenshot = project.gallery?.[0];
    const visual = diagram || screenshot;
    return `<article class="preview-card">
      ${visual ? `<a class="preview-card-visual" href="./${id}/index.html" tabindex="-1" aria-hidden="true"><img src="./${esc(visual.preview || visual.src)}" width="${visual.width}" height="${visual.height}" alt="" loading="lazy" decoding="async"></a>` : ''}
      <div class="preview-card-body"><p class="preview-kicker">${roleLabels[index]}</p><h3><a href="./${id}/index.html">${esc(project.title)}</a></h3><p class="preview-card-summary">${esc(project.summary)}</p><p class="preview-result"><strong>${esc(project.metric)}</strong><span>${esc(project.metricLabel)}</span></p>${chips(project.tools.slice(0, 3))}<a class="preview-card-link" href="./${id}/index.html">Read case study <span aria-hidden="true">→</span></a></div>
    </article>`;
  }).join('');
  return layout({ title: 'Geospatial data science, engineering & software', description: profile.description, body: `<div class="shell preview-home">
    <section class="preview-hero"><p class="preview-kicker">Geospatial data science · Data engineering · Software engineering</p><h1>Esad Kopru</h1><p class="preview-lead">I turn location data into useful analysis, automated pipelines, and public-facing GIS applications.</p><p>10+ years across spatial analysis, GIS development, and data automation. Selected work below shows the problem, my contribution, and the outcome.</p><div class="preview-actions"><a class="button" href="#selected-work">Selected work</a><a class="button secondary" href="#projects">All projects</a></div></section>
    <section class="preview-selected" id="selected-work" aria-labelledby="selected-heading"><h2 id="selected-heading">Selected work</h2><p>Three projects across analysis, data delivery, and geospatial software.</p><div class="preview-card-grid">${cards}</div></section>
    <section class="preview-library" id="projects" aria-labelledby="library-heading"><h2 id="library-heading">Project library</h2><p>Explore the same collections, with contributions and results now ahead of the galleries.</p><div class="preview-collections">${browseCollections.map(collection => `<section><h3><a href="./${collection.id}/index.html">${esc(collection.title)}</a></h3>${projectList(collection.entries, './')}</section>`).join('')}</div><div class="preview-library-extra"><a href="./additional-projects/index.html">Additional projects (${additionalProjects.length})</a><a href="./doctoral-research/index.html">Doctoral research</a></div></section>
  </div>` });
}

function evidenceSection(project, ui) {
  const { esc } = ui;
  const evidence = previewEvidence[project.id];
  if (!evidence) return '';
  return `<section class="preview-evidence" aria-labelledby="evidence-heading"><h2 id="evidence-heading">Explore the work</h2>${evidence.note ? `<p class="evidence-note">${esc(evidence.note)}</p>` : ''}${(evidence.diagrams || []).map(diagram => `<figure class="preview-diagram"><a data-image-viewer href="../${esc(diagram.src)}" data-caption="${esc(diagram.caption)}" aria-label="Open diagram: ${esc(diagram.title)}"><img src="../${esc(diagram.src)}" width="${diagram.width}" height="${diagram.height}" alt="${esc(diagram.title)}" loading="lazy" decoding="async"></a><figcaption>${esc(diagram.caption)}</figcaption></figure>`).join('')}${evidence.links?.length ? `<div class="preview-evidence-links">${evidence.links.map(link => `<a class="text-link" href="../${sourceRoute(link.href)}/index.html">${esc(link.label)}</a>`).join('')}</div>` : ''}</section>`;
}

export function previewProject(project, ui, noindex = false) {
  const { layout, esc, chips, links, list, gallery, embeddedApp } = ui;
  const source = sourceProjects.get(project.id);
  // Restore the reviewed historical web-map images only in the alternate site.
  const images = project.gallery.length ? project.gallery : source?.gallery || [];
  const shown = { ...project, gallery: images.slice(0, 3) };
  const rest = { ...project, gallery: images.slice(3) };
  const title = source?.title || project.title;
  const methods = project.approach ? `<details class="preview-context"><summary>Methods and project context</summary>${list(project.approach)}<p>${esc(project.context)}</p></details>` : '';
  const summary = project.contribution ? `<section class="preview-case-summary" aria-label="Project overview"><div class="preview-summary-grid">${[['Problem', project.problem], ['My contribution', project.contribution], ['Result', project.result]].map(([heading, text]) => `<article><h2>${heading}</h2><p>${esc(text)}</p></article>`).join('')}</div><div class="preview-tools"><h2>Tools and methods</h2>${chips(project.tools)}</div><p class="evidence-note">${esc(project.boundary)}</p></section>` : `<section class="preview-case-summary"><h2>About this example</h2><p>${esc(project.summary)}</p><p class="evidence-note">Historical portfolio example. The gallery documents the work; a complete reproducible dataset and implementation are not included.</p></section>`;
  return layout({ title, description: project.summary, route: project.id, noindex, body: `<div class="shell preview-case"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="../index.html#projects">Projects</a>${project.collection ? `<span aria-hidden="true">/</span><a href="../${project.collection.id}/index.html">${esc(project.collection.title)}</a>` : ''}</nav><header class="preview-case-heading"><p class="preview-kicker">${esc(project.type || 'Historical portfolio example')}</p><h1>${esc(title)}</h1><p>${esc(project.summary)}</p>${project.links?.length ? `<div class="project-links">${links(project.links)}</div>` : ''}</header>${summary}${evidenceSection(project, ui)}${methods}${gallery(shown)}${rest.gallery.length ? `<details class="preview-gallery-more"><summary>View ${rest.gallery.length} more historical images</summary>${gallery(rest, 'archive')}</details>` : ''}${embeddedApp(project.embed)}<p class="back-link"><a href="../index.html#projects">← Back to projects</a></p></div>` });
}

export function previewSource(path, text, ui) {
  const { layout, esc } = ui;
  const filename = path.split('/').pop();
  const title = filename === 'README.md' ? 'Synthetic companion guide' : `Synthetic companion: ${filename}`;
  return layout({ title, description: 'A newly authored, synthetic-only educational companion. Not the original utility prototype or a field-validated material model.', route: sourceRoute(path), body: `<div class="shell preview-case"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="../lead-service-review-prototype/index.html">Lead pipe prediction prototype</a><span aria-hidden="true">/</span><span>Companion example</span></nav><header class="preview-case-heading"><p class="preview-kicker">Synthetic educational example</p><h1>${esc(title)}</h1><p>This newly authored companion is separate from the original prototype. It contains no client records and does not establish field performance.</p></header><pre class="preview-source" tabindex="0" aria-label="${esc(filename)}"><code>${esc(text)}</code></pre><p class="back-link"><a href="../lead-service-review-prototype/index.html">← Back to case study</a></p></div>` });
}
