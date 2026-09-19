import { projects } from '../content/portfolio.mjs';
import { featuredWork, methodDiagrams, companions, companionRoute, sourceRoute } from '../content/evidence.mjs';

const sources = new Map(projects.map(project => [project.id, project]));

export function featuredSection({ esc, chips }) {
  return `<section class="shell selected-work" id="selected-work" aria-labelledby="selected-heading"><div class="selected-work-heading"><h2 id="selected-heading">Highlighted work</h2><p class="section-intro">Three projects across geospatial analysis, data delivery, and public-facing software.</p></div><div class="featured-grid">${featuredWork.map(item => {
    const project = sources.get(item.id);
    const workflow = `<ol class="featured-flow" aria-label="${esc(item.role)} workflow">${item.steps.map((step, index) => `<li><span class="flow-step">${esc(step)}</span>${index < item.steps.length - 1 ? '<span class="flow-arrow" aria-hidden="true">→</span>' : ''}</li>`).join('')}</ol>`;
    return `<article class="featured-card"><div class="featured-body"><p class="project-kind">${esc(item.role)}</p><h3><a href="./${project.id}/index.html">${esc(project.title)}</a></h3>${workflow}<p>${esc(project.summary)}</p><p class="featured-result"><strong>${esc(project.metric)}</strong> ${esc(project.metricLabel)}</p>${chips(project.tools.slice(0, 3))}<a class="text-link" href="./${project.id}/index.html">Read case study<span class="sr-only">: ${esc(project.title)}</span> <span aria-hidden="true">→</span></a></div></article>`;
  }).join('')}</div></section>`;
}

export function caseSummary(project, { esc, chips, list }) {
  if (!project.contribution) return `<section class="case-overview"><h2>About this example</h2><p>${esc(project.summary)}</p><p class="evidence-note">Historical portfolio example. The gallery documents the work; a complete reproducible dataset and implementation are not included.</p></section>`;
  return `<section class="case-overview" aria-label="Project overview"><p class="project-kind">${esc(project.type)}</p><div class="case-summary-grid">${[['Problem', project.problem], ['My contribution', project.contribution], ['Result', project.result]].map(([heading, text]) => `<article><h2>${heading}</h2><p>${esc(text)}</p></article>`).join('')}</div><div class="case-tools"><h2>Tools and methods</h2>${chips(project.tools)}</div><p class="case-context">${esc(project.context)}</p><p class="evidence-note">${esc(project.boundary)}</p><div class="case-methods"><h2>How it works</h2>${list(project.approach)}</div></section>`;
}

export function figure(src, title, caption, esc) {
  return `<figure class="evidence-figure"><a data-image-viewer href="../${esc(src)}" data-caption="${esc(caption)}" aria-label="Open diagram: ${esc(title)}"><img src="../${esc(src)}" alt="${esc(title)}" loading="lazy" decoding="async"></a><figcaption>${esc(caption)}</figcaption></figure>`;
}

export function projectEvidence(project, ui) {
  const { esc } = ui;
  const diagram = methodDiagrams[project.id];
  const companion = companions.find(item => item.project === project.id);
  if (!diagram && !companion) return '';
  return `<section class="project-evidence" aria-labelledby="evidence-heading"><h2 id="evidence-heading">Explore the work</h2>${diagram ? figure(diagram.src, diagram.title, diagram.caption, esc) : ''}${companion ? `<div class="companion-callout"><p class="project-kind">Runnable educational companion</p><h3>${esc(companion.title)}</h3><p>${esc(companion.summary)}</p><p class="evidence-note">New teaching example using invented data. Separate from the historical project, original prototype, and doctoral evaluation.</p><a class="text-link" href="../${companionRoute(companion.id)}/index.html">Explore the example, results, and source <span aria-hidden="true">→</span></a></div>` : ''}${project.id === 'doctoral-research' ? `<div class="research-context"><h3>Why shared access matters</h3><p>When one source must connect to several targets, separate shortest routes can overlook the value of shared links. A network formulation makes those shared decisions explicit. The worked example explains that distinction on a tiny invented network.</p><h3>Research record and citation</h3><p>Esad Kopru. <cite>Modeling Integer Programming To Multiple Target Access Problem.</cite> PhD dissertation, The University of Texas at Dallas, 2024. Title and degree are listed in the <a href="https://graduate.utdallas.edu/fsa/doctoral-degrees-awarded/2023-2024-doctoral-degrees-awarded/">public doctoral record</a>.</p><p>The <a href="https://github.com/efkopru/gemini-shortest-path/tree/bc917f2a679f0ef624b15d2e6b4a3dc5fc8db388">version-pinned public research source</a> is separate from this new teaching example. No journal publication, DOI, or dissertation benchmark is claimed here.</p></div>` : ''}</section>`;
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
