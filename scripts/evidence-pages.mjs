import { projects } from '../content/portfolio.mjs';
import { featuredWork, methodDiagrams, companions, companionRoute, sourceRoute, workbenchDemo } from '../content/evidence.mjs';

const sources = new Map(projects.map(project => [project.id, project]));
const projectArrow = (workflow = false) => `<svg class="project-arrow${workflow ? ' flow-arrow' : ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12h16m-6-6 6 6-6 6"/></svg>`;

export function featuredSection({ esc, chips }) {
  return `<section class="shell selected-work" id="selected-work" aria-labelledby="selected-heading"><div class="selected-work-heading"><h2 id="selected-heading">Highlighted work</h2><p class="section-intro">Three projects across geospatial analysis, data delivery, and public-facing software.</p></div><div class="featured-grid">${featuredWork.map(item => {
    const project = sources.get(item.id);
    const workflow = `<ol class="featured-flow" aria-label="${esc(item.role)} workflow">${item.steps.map((step, index) => `<li><span class="flow-step">${esc(step)}</span>${index < item.steps.length - 1 ? projectArrow(true) : ''}</li>`).join('')}</ol>`;
    return `<article class="featured-card"><div class="featured-body"><p class="project-kind">${esc(item.role)}</p><h3><a href="./${project.id}/index.html">${esc(project.title)}</a></h3>${workflow}<p>${esc(project.summary)}</p><p class="featured-result"><strong>${esc(project.metric)}</strong> ${esc(project.metricLabel)}</p>${chips(project.tools.slice(0, 3))}<a class="text-link" href="./${project.id}/index.html">Read case study<span class="sr-only">: ${esc(project.title)}</span> ${projectArrow()}</a></div></article>`;
  }).join('')}</div></section>`;
}

export function caseSummary(project, { esc, chips }) {
  if (!project.contribution) return '';
  return `<section class="case-overview" aria-label="Project overview"><h2>What I did</h2><p>${esc(project.contribution)}</p><p class="case-result"><strong>Result:</strong> ${esc(project.result)}</p><div class="case-tools"><h2>Tools</h2>${chips(project.tools)}</div><p class="evidence-note">${esc(project.boundary)}</p></section>`;
}

export function caseDetails(project, { esc, list }) {
  const content = project.contribution ? `<p class="case-context">${esc(project.context)}</p><p>${esc(project.problem)}</p>${list(project.approach)}` : '<p>These screenshots show earlier work. Full source files and datasets are not included.</p>';
  const citation = project.id === 'doctoral-research' ? '<p>Dissertation: <cite>Modeling Integer Programming To Multiple Target Access Problem.</cite> The University of Texas at Dallas, 2024.</p>' : '';
  return `<details class="project-details case-details"><summary>Technical details</summary>${content}${citation}</details>`;
}

export function figure(src, title, caption, esc) {
  return `<figure class="evidence-figure"><a data-image-viewer href="../${esc(src)}" data-caption="${esc(caption)}" aria-label="Open diagram: ${esc(title)}"><img src="../${esc(src)}" alt="${esc(title)}" loading="lazy" decoding="async"></a><figcaption>${esc(caption)}</figcaption></figure>`;
}

export function projectEvidence(project, ui) {
  const { esc } = ui;
  if (project.id === 'doctoral-research') return '';
  const diagram = methodDiagrams[project.id];
  const companion = companions.find(item => item.project === project.id);
  if (project.id === workbenchDemo.project) return `<section class="project-evidence" aria-labelledby="evidence-heading"><h2 id="evidence-heading">Workflow and working demonstration</h2><div class="companion-callout"><h3>${esc(workbenchDemo.title)}</h3><p>${esc(workbenchDemo.summary)}</p><p class="evidence-note">${esc(workbenchDemo.boundary)}</p><a class="text-link" href="../${workbenchDemo.directory}/index.html">Open interactive demonstration <span aria-hidden="true">→</span></a></div>${figure(diagram.src, diagram.title, diagram.caption, esc)}</section>`;
  if (!diagram && !companion) return '';
  const heading = diagram && companion ? 'Workflow and example' : diagram ? 'Workflow' : 'Example';
  return `<section class="project-evidence" aria-labelledby="evidence-heading"><h2 id="evidence-heading">${heading}</h2>${diagram ? figure(diagram.src, diagram.title, diagram.caption, esc) : ''}${companion ? `<div class="companion-callout"><h3>${esc(companion.title)}</h3><p>${esc(companion.summary)}</p><p class="evidence-note">Uses invented data; separate from this project.</p><a class="text-link" href="../${companionRoute(companion.id)}/index.html">View example <span aria-hidden="true">→</span></a></div>` : ''}</section>`;
}

export function companionPage(companion, report, ui) {
  const { esc, layout, list } = ui;
  const project = sources.get(companion.project);
  const route = companionRoute(companion.id);
  const path = `examples/${companion.id}`;
  return layout({ route, title: companion.title, description: companion.summary, socialProject: companion.project, body: `<div class="shell companion-page"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="../${companion.project}/index.html">${esc(project.title)}</a><span aria-hidden="true">/</span><span>Educational companion</span></nav><header class="project-heading"><p class="project-kind">Synthetic, reproducible example</p><h1>${esc(companion.title)}</h1><p>${esc(companion.summary)}</p></header><p class="evidence-note">${esc(report.disclosure)}</p><section aria-labelledby="run-heading"><h2 id="run-heading">Run it locally</h2><p>Python 3.10 or newer. Standard library only; no accounts, credentials, or external datasets. From the repository root:</p><pre class="code-block" tabindex="0" aria-label="Commands to run and test the example"><code>python ${path}/demo.py
python -m unittest discover -s ${path} -p test_demo.py -v</code></pre>${companion.id === 'spatial-etl' ? `<p><a class="text-link" href="../${path}/records.json">Inspect the invented input records (JSON)</a></p>` : ''}<div class="companion-links"><a class="text-link" href="../${sourceRoute(companion.id, 'README.md')}/index.html">Read the guide</a><a class="text-link" href="../${sourceRoute(companion.id, 'demo.py')}/index.html">Inspect Python code</a><a class="text-link" href="../${sourceRoute(companion.id, 'test_demo.py')}/index.html">Inspect tests</a><a class="text-link" href="../${path}/report.json">Raw evaluation report (JSON)</a></div></section><section aria-labelledby="results-heading"><h2 id="results-heading">Recorded demonstration results</h2><p>These are outputs of the included teaching example, not measurements of a client system or field accuracy.</p><dl class="result-metrics">${report.metrics.map(metric => `<div><dt>${esc(metric.label)}</dt><dd>${esc(metric.value)}</dd></div>`).join('')}</dl>${figure(companion.diagram, report.title, companion.diagramCaption, esc)}${report.tables.map(table => `<div class="table-scroll" tabindex="0" role="region" aria-label="${esc(table.heading)}"><table class="evidence-table"><caption>${esc(table.heading)}</caption><thead><tr>${table.headers.map(header => `<th scope="col">${esc(header)}</th>`).join('')}</tr></thead><tbody>${table.rows.map(row => `<tr>${row.map(cell => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`).join('')}</section><section><h2>Interpretation and limitations</h2>${list(report.notes)}</section><p class="back-link"><a href="../${companion.project}/index.html">← Back to case study</a></p></div>` });
}

export function sourcePage(companion, name, text, ui) {
  const { esc, layout } = ui;
  const title = `${companion.title}: ${name === 'README.md' ? 'guide' : name === 'demo.py' ? 'source code' : 'tests'}`;
  return layout({ route: sourceRoute(companion.id, name), title, description: `Inspect the public-safe educational companion ${name}. Synthetic example, separate from the original professional or research implementation.`, socialProject: companion.project, body: `<div class="shell source-page"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="../${companionRoute(companion.id)}/index.html">Educational companion</a><span aria-hidden="true">/</span><span>${esc(name)}</span></nav><h1>${esc(title)}</h1><p>This source belongs to the new teaching example, not a recovered employer artifact or the original research implementation.</p><a class="text-link" href="../examples/${companion.id}/${name}">Open raw ${esc(name)}</a><pre class="code-block" tabindex="0" aria-label="${esc(name)}"><code>${esc(text)}</code></pre><p><a href="../${companionRoute(companion.id)}/index.html">← Results and run instructions</a></p></div>` });
}
