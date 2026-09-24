// Structured case-study evidence stays readable without scripts or collapsed panels.
export function caseEvidence(project, { esc, headingLevel = 2, idPrefix = 'case-evidence' }) {
  if (![2, 3].includes(headingLevel)) throw new Error(`${project.id}: evidence heading level must be 2 or 3.`);
  if (typeof idPrefix !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(idPrefix)) throw new Error(`${project.id}: invalid evidence ID prefix.`);
  return (project.evidenceSections || []).map((section, index) => {
    const headingId = `${idPrefix}-${index + 1}`;
    const paragraphs = (section.paragraphs || []).map(text => `<p>${esc(text)}</p>`).join('');
    const bullets = section.bullets?.length ? `<ul>${section.bullets.map(text => `<li>${esc(text)}</li>`).join('')}</ul>` : '';
    let table = '';
    if (section.table) {
      const { caption, headers, rows } = section.table;
      if (!headers.length || rows.some(row => row.length !== headers.length)) throw new Error(`${project.id}: evidence table must have consistent columns.`);
      table = `<div class="table-scroll" tabindex="0" role="region" aria-label="${esc(caption)}"><table class="evidence-table"><caption>${esc(caption)}</caption><thead><tr>${headers.map(text => `<th scope="col">${esc(text)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map((text, column) => column === 0 ? `<th scope="row">${esc(text)}</th>` : `<td>${esc(text)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    }
    let diagram = '';
    if (section.diagram) {
      const { src, title, caption } = section.diagram;
      if (!/^assets\/evidence\/[a-z0-9-]+\.svg$/.test(src)) throw new Error(`${project.id}: evidence diagrams must be local SVG assets.`);
      diagram = `<figure class="evidence-figure case-diagram"><div class="diagram-scroll" tabindex="0" role="region" aria-label="${esc(title)}"><img src="../${esc(src)}" alt="${esc(title)}" loading="lazy" decoding="async"></div><figcaption>${esc(caption)} <span class="diagram-scroll-hint">Scroll horizontally to explore the diagram.</span></figcaption></figure>`;
    }
    return `<section class="case-evidence" aria-labelledby="${headingId}"><h${headingLevel} id="${headingId}">${esc(section.heading)}</h${headingLevel}>${paragraphs}${bullets}${diagram}${table}</section>`;
  }).join('');
}

export function relatedCases(project, projects, { esc }) {
  if (!project.relatedProjects?.length) return '';
  const links = project.relatedProjects.map(id => {
    const related = projects.find(item => item.id === id);
    if (!related || !/^[a-z0-9-]+$/.test(id)) throw new Error(`${project.id}: unknown related project ${id}.`);
    return `<li><a href="../${id}/index.html">${esc(related.title)}</a></li>`;
  }).join('');
  return `<nav class="related-cases" aria-label="Related case studies"><h2>Related work</h2><ul>${links}</ul></nav>`;
}
