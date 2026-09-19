import { readFile, writeFile, mkdir, copyFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { profile, projects } from '../content/portfolio.mjs';
import { resumeDocument } from '../content/resume.mjs';
import { collections, browseCollections, siteProjects, additionalProjects } from '../content/site-structure.mjs';
import { companions, evidenceAssets, companionRoute, sourceRoute } from '../content/evidence.mjs';
import { featuredSection, caseSummary, caseDetails, projectEvidence, companionPage, sourcePage } from './evidence-pages.mjs';
import { socialCards } from './social-cards.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'dist');
// New asset URLs prevent a fresh page from using cached styles or theme logic.
const assetVersions = Object.fromEntries(await Promise.all(['theme.js', 'styles.css', 'script.js'].map(async file =>
  [file, createHash('sha256').update(await readFile(resolve(root, file))).digest('hex').slice(0, 12)]
)));
const socialAssets = socialCards.map(card => `assets/social/${card.Name}.png`);
const socialVersions = Object.fromEntries(await Promise.all(socialAssets.map(async file => [file, createHash('sha256').update(await readFile(resolve(root, file))).digest('hex').slice(0, 12)])));
const reports = new Map(await Promise.all(companions.map(async companion => [companion.id, JSON.parse(await readFile(resolve(root, `examples/${companion.id}/report.json`), 'utf8'))])));
const origin = new URL(process.env.SITE_URL || 'https://www.ekopru.com').origin;
if (!/^https?:\/\//.test(origin)) throw new Error('SITE_URL must be an HTTP or HTTPS origin.');
if (new Set(projects.map(project => project.id)).size !== projects.length) throw new Error('Duplicate project ID.');
for (const slug of [...siteProjects.map(project => project.id), ...collections.map(c => c.id)]) {
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error('Page IDs must contain only lowercase letters, digits, and hyphens.');
}
const year = new Date().getUTCFullYear();
const errorPageBaseScript = "if(location.protocol!=='file:')document.querySelector('base').href='/';";
const errorPageScriptHash = createHash('sha256').update(errorPageBaseScript).digest('base64');
const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const links = items => items.map(item => `<a class="text-link" href="${esc(item.url)}" rel="noopener noreferrer">${esc(item.label)} <span aria-hidden="true">↗</span></a>`).join('');
const chips = items => `<ul class="chips" aria-label="Technologies">${items.map(item => `<li>${esc(item)}</li>`).join('')}</ul>`;
const list = items => `<ul>${items.map(item => `<li>${esc(item)}</li>`).join('')}</ul>`;

function layout({ title, description, body, route = '', current = '', noindex = false, redirect = '', socialProject = '' }) {
  const prefix = route ? '../' : './';
  const canonical = `${origin}/${route ? route + '/' : ''}`;
  const cover = socialAssets.includes(`assets/social/${socialProject || route}.png`) ? socialProject || route : 'portfolio';
  const coverPath = `assets/social/${cover}.png`;
  const coverUrl = `${origin}/${coverPath}?v=${socialVersions[coverPath]}`;
  const navLink = (label, path) => `<a href="${prefix}${path}"${(route ? path === route + '/index.html' : path === 'index.html') ? ' aria-current="page"' : ''}>${esc(label)}</a>`;
  const navGroup = c => `<div class="nav-group"><div class="nav-heading">${navLink(c.title, c.id + '/index.html')}<button type="button" class="nav-disclosure" aria-label="Toggle ${esc(c.title)} project menu" aria-expanded="false" aria-controls="nav-${c.id}"><span aria-hidden="true">▾</span></button></div><div class="dropdown" id="nav-${c.id}">${navLink('Overview', c.id + '/index.html')}${c.entries.map(([id, title]) => navLink(title, id + '/index.html')).join('')}</div></div>`;
  const additionalNav = { id: 'additional-projects', title: 'Additional projects', entries: additionalProjects.map(project => [project.id, project.title]) };
  const navigation = navLink('Home', 'index.html') + navLink('Contact', 'contact/index.html') + navLink('Resume', 'resume/index.html') + browseCollections.map(navGroup).join('') + navGroup(additionalNav) + navLink('Doctoral Research', 'doctoral-research/index.html');
  return `<!doctype html>
<html lang="en"><head>
${noindex && !route ? `<base href="./"><script>${errorPageBaseScript}</script>` : ''}
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} | Esad Kopru</title>
<meta name="description" content="${esc(description)}"><meta name="theme-color" content="#e0e9f0"><meta name="referrer" content="strict-origin-when-cross-origin">
${noindex ? '<meta name="robots" content="noindex, follow">' : `<link rel="canonical" href="${canonical}">`}
<meta property="og:type" content="website"><meta property="og:site_name" content="Esad Kopru"><meta property="og:title" content="${esc(title)} | Esad Kopru"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${coverUrl}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:type" content="image/png"><meta property="og:image:alt" content="${esc(title)} | Esad Kopru portfolio"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${coverUrl}"><meta name="twitter:image:alt" content="${esc(title)} | Esad Kopru portfolio">
<link rel="icon" href="${prefix}assets/efk-logo.avif"><script src="${prefix}theme.js?v=${assetVersions['theme.js']}"></script><link rel="stylesheet" href="${prefix}styles.css?v=${assetVersions['styles.css']}"><script src="${prefix}script.js?v=${assetVersions['script.js']}" defer></script>
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'ProfilePage', name: `${title} | Esad Kopru`, url: canonical, mainEntity: { '@type': 'Person', name: profile.name, url: origin, sameAs: [profile.github], knowsAbout: ['Geospatial data science', 'Geospatial data engineering', 'Geospatial software engineering'], alumniOf: [{ '@type': 'CollegeOrUniversity', name: 'The University of Texas at Dallas' }] } }).replaceAll('<','\\u003c')}</script>
</head><body data-root="${prefix}"${redirect ? ` data-redirect="${esc(redirect)}"` : ''}><a class="skip-link" href="#main">Skip to content</a>
<header class="site-header"><div class="shell header-inner"><a class="brand" href="${prefix}index.html" aria-label="Esad Kopru home"><img src="${prefix}assets/efk-logo.avif" width="101" height="48" alt="EFK Portfolio"></a><button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav" hidden>Menu</button><nav id="site-nav" class="site-nav" aria-label="Main navigation">${navigation}</nav></div></header><div class="rule" aria-hidden="true"></div>
<div class="theme-toolbar shell" data-theme-toolbar hidden><button class="theme-toggle" type="button" role="switch" aria-checked="false" data-theme-toggle><span class="theme-toggle-label">Dark mode</span><span class="theme-toggle-track" aria-hidden="true"><span class="theme-toggle-thumb"></span></span><span class="theme-toggle-state" data-theme-state aria-hidden="true">Off</span></button></div>
<main id="main" tabindex="-1">${body}</main>
<div class="rule" aria-hidden="true"></div><footer class="site-footer"><div class="shell footer-inner"><p>All rights reserved © EK ${year}</p></div></footer>
<dialog class="image-viewer" aria-labelledby="viewer-title"><div class="viewer-header"><h2 id="viewer-title">Image viewer</h2><button type="button" data-viewer-close autofocus>Close <span aria-hidden="true">×</span></button></div><div class="viewer-controls" role="group" aria-label="Image controls"><div class="viewer-zoom-controls" role="group" aria-label="Zoom"><button type="button" data-zoom-out aria-label="Zoom out">− Zoom out</button><output class="zoom-level" aria-live="polite">100%</output><button type="button" data-zoom-in aria-label="Zoom in">+ Zoom in</button></div><div class="viewer-fit-controls"><button type="button" data-zoom-reset><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg>Fit to screen</button></div></div><p class="viewer-status" role="status"></p><div class="viewer-viewport" tabindex="0" aria-label="Image; scroll to pan when zoomed"><img class="viewer-image" alt=""></div><p class="viewer-caption"></p></dialog></body></html>`;
}


function gallery(project) {
  if (!project.gallery.length) return '';
  const names = { 'spatial-analysis': 'Spatial analysis', qgis: 'QGIS', 'arcgis-enterprise-and-online': 'ArcGIS Enterprise and Online', 'python-and-notebooks': 'Python applications and notebooks', 'sql-and-javascript-and-r': 'SQL, JavaScript, and R', 'modelbuilder-and-arcmap-tool-in-vbnet': 'ModelBuilder and VB.NET' };
  const groups = Map.groupBy(project.gallery, image => image.group);
  const note = project.id === 'income-level-prediction-using-r' ? 'Original historical presentation; exploratory results, not a validated benchmark.' : project.type?.includes('Synthetic') ? 'Synthetic demonstration figures; these do not show field performance.' : project.id === 'workforce-participation' ? 'Screenshot from the published workforce atlas.' : 'Historical portfolio screenshots.';
  const figure = image => `<figure id="screenshot-${esc(image.src.split('/').pop().split('.')[0])}"><a data-image-viewer href="../${esc(image.src)}" data-caption="${esc(image.caption)}" aria-label="Open image: ${esc(image.caption)}"><img src="../${esc(image.preview)}" width="${image.width}" height="${image.height}" alt="${esc(image.caption)}" loading="lazy" decoding="async"></a><figcaption>${esc(image.caption)}</figcaption></figure>`;
  return `<section class="project-gallery" aria-labelledby="screenshots-heading"><div class="gallery-heading"><h2 id="screenshots-heading">Project gallery</h2><p>${esc(note)} ${project.gallery.length} images. Select an image to view it full size.</p></div>${[...groups].map(([group, images]) => `<section class="gallery-group" id="gallery-${esc(group)}">${groups.size > 1 ? `<h3>${esc(names[group] || 'Related examples')}</h3>` : ''}<div class="screenshot-grid">${images.map(figure).join('')}</div></section>`).join('')}</section>`;
}


function projectList(entries, prefix = '../') {
  return `<ol>${entries.map(([id, title]) => `<li><a href="${prefix}${id}/index.html">${esc(title)}</a></li>`).join('')}</ol>`;
}

function home() {
  return layout({ title: 'Geospatial Data Science & GIS Development', description: profile.description, body: `<section class="home-intro evidence-intro"><div class="intro-copy"><h1>Esad Kopru</h1><p class="home-specialty">Geospatial data science, data engineering &amp; spatial analysis</p><p>10+ years building GIS systems, analytical models, and automated data pipelines that turn location information into decisions.</p></div><div class="intro-links"><ul class="home-keywords" aria-label="Selected skills"><li>Python</li><li>SQL</li><li>Machine learning</li><li>ETL pipelines</li><li>Spatial Optimization</li></ul><div class="home-actions"><a class="text-link" href="#projects">All projects</a></div></div></section>${featuredSection({ esc, chips })}<div class="shell library-heading"><h2>All projects</h2><p>Explore the original collections, tools, and historical examples.</p></div><section class="shell project-index" id="projects" aria-label="Breakdown of the Projects">${browseCollections.map(c => `<section><h2>${esc(c.heading)}</h2>${projectList(c.entries, './')}</section>`).join('')}</section>` });
}

function embeddedApp(embed) {
  if (!embed) return '';
  return `<section class="embedded-app" aria-label="${esc(embed.title)}"><p><a href="${esc(embed.url)}" rel="noopener noreferrer">Open original application ↗</a></p><p class="embed-note">${esc(embed.note)}</p><div class="embed-host" data-embed-src="${esc(embed.url)}" data-embed-title="${esc(embed.title)}"><button class="button" data-load-embed type="button" hidden>Load interactive application</button><p>Loading the application connects to the external provider. If it cannot load here, use the original application link above.</p></div></section>`;
}

function projectPage(project) {
  const parent = project.collection;
  return layout({ title: project.title, description: project.summary, route: project.id, body: `<div class="shell detail"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="../index.html#projects">Projects</a>${parent ? `<span aria-hidden="true">/</span><a href="../${parent.id}/index.html">${esc(parent.title)}</a>` : ''}</nav><header class="project-heading"><h1>${esc(project.title)}</h1><p>${esc(project.summary)}</p>${project.links?.length ? `<div class="project-links">${links(project.links)}</div>` : ''}</header>${caseSummary(project, { esc, chips })}${embeddedApp(project.embed)}${gallery(project)}${projectEvidence(project, { esc })}${caseDetails(project, { esc, list })}<p class="back-link"><a href="../index.html#projects">← Back to projects</a></p></div>` });
}

function collectionPage(collection) {
  return layout({ title: collection.title, description: `Selected projects in ${collection.title.toLowerCase()}, including maps, analysis, and implementation examples.`, route: collection.id, body: `<div class="shell text-page"><h1>${esc(collection.title)}</h1><p>${esc(collection.heading)}</p>${projectList(collection.entries)}<p class="back-link"><a href="../index.html#projects">← Back to projects</a></p></div>` });
}

function resume() {
  return layout({ title: 'Resume', description: 'View Esad Kopru’s resume, including geospatial experience, education, and technical skills.', route: 'resume', current: 'resume', body: `<div class="shell resume-page"><header class="resume-header"><h1>Resume</h1></header><iframe class="resume-frame" src="${esc(resumeDocument.previewUrl)}" title="Esad Kopru resume" referrerpolicy="no-referrer"></iframe></div>` });
}

function about() {
  return layout({ title: 'About', description: 'Esad Kopru connects spatial research, data engineering, and production GIS applications.', route: 'about', current: 'about', body: `<div class="shell text-page"><header class="page-heading"><p class="eyebrow">About</p><h1>Research informed.<br>Built for use.</h1><p class="detail-lead">I work across the boundaries of geospatial analysis, data engineering, and software development.</p></header><section><h2>From data to decisions</h2><p>My work connects operational records, spatial networks, and public-facing applications. At the City of Lewisville, I develop and maintain GIS tools, automate data delivery, and use spatial analysis to support infrastructure and community planning.</p><p>Through independent consulting, I engineered automated inspection-data workflows for an electric utility. My PhD research at UT Dallas focused on spatial optimization and multiple-target access using integer programming.</p></section><section><h2>What I bring</h2><div class="about-roles">${profile.roles.map(role => `<article><h3>${esc(role.title)}</h3><p>${esc(role.summary)}</p></article>`).join('')}</div></section><section><h2>Technical foundation</h2><dl class="skill-list">${profile.skills.map(([name, detail]) => `<div><dt>${esc(name)}</dt><dd>${esc(detail)}</dd></div>`).join('')}</dl></section><section><h2>Education</h2>${list(profile.education)}</section><div class="actions"><a class="button" href="../index.html#projects">Explore projects</a><a class="button secondary" href="../resume/index.html">Full resume</a></div></div>` });
}

function contact() {
  return layout({ title: 'Contact', description: 'Contact Esad Kopru about geospatial data science, data engineering, or software engineering roles and projects.', route: 'contact', current: 'contact', body: `<div class="shell text-page contact-page"><header class="page-heading"><h1>Contact me</h1><p class="detail-lead">I welcome any comments or feedback and would be happy to discuss your project requirements.</p></header>
<form class="contact-form" action="https://formsubmit.co/${esc(profile.email)}" method="POST" data-contact-form data-contact-endpoint="https://formsubmit.co/ajax/${esc(profile.email)}" aria-label="Contact Esad Kopru">
<input type="hidden" name="_url" value="${origin}/contact/"><input type="hidden" name="_template" value="table"><input type="text" name="_honey" tabindex="-1" autocomplete="off" hidden aria-label="Leave this field empty">
<div class="form-field"><label for="contact-email">Your email</label><input id="contact-email" name="email" type="email" autocomplete="email" maxlength="254" required></div>
<div class="form-field"><label for="contact-subject">Subject</label><input id="contact-subject" name="_subject" type="text" maxlength="160" required></div>
<div class="form-field"><label for="contact-message">Message</label><textarea id="contact-message" name="message" rows="8" maxlength="5000" required></textarea></div>
<noscript><p class="form-note">JavaScript is disabled. Sending will open FormSubmit's confirmation page.</p></noscript>
<button class="button" type="submit" data-contact-submit>Send message</button></form>
<p id="contact-status" class="form-status" role="status" aria-live="polite" aria-atomic="true" tabindex="-1" data-contact-status></p>
<dialog class="contact-success" data-contact-success aria-labelledby="contact-success-title" aria-describedby="contact-success-description"><h2 id="contact-success-title">Message sent</h2><p id="contact-success-description">Thank you. Your message has been submitted successfully.</p><button class="button" type="button" data-contact-success-close autofocus>Close</button></dialog>
</div>` });
}

const pages = new Map([
  ['index.html', home()], ['about/index.html', about()], ['resume/index.html', resume()], ['contact/index.html', contact()],
  ['privacy/index.html', layout({ title: 'Privacy', description: 'Privacy information for the Esad Kopru portfolio.', route: 'privacy', body: `<div class="shell text-page"><header class="page-heading"><p class="eyebrow">Privacy</p><h1>A simple portfolio.</h1></header><section><h2>Site data</h2><p>The portfolio itself does not set cookies or include analytics and advertising scripts. If you change the theme, only your theme choice is saved in your browser's local storage so it can be restored on later visits. This preference is not sent to a server. Fonts and decorative images are served with the site.</p><p>The hosting provider may process routine request information, such as IP addresses and browser details, to serve and secure the site.</p></section><section><h2>Contact and external links</h2><p>The contact form sends your email address, subject, and message to FormSubmit for delivery to Esad Kopru. Nothing is submitted until you select Send message. With JavaScript enabled, submission results appear on the Contact page. Without JavaScript, the form opens FormSubmit's confirmation or spam-check page. FormSubmit's <a href="https://formsubmit.co/privacy.pdf" rel="noopener noreferrer">privacy policy</a> applies. Contact messages are not saved in browser storage. Do not include confidential or sensitive information. Direct email links open your email application.</p><p>The Resume page embeds Google Docs and connects to Google when you open the page. Google, GitHub, City GIS applications, and other external services have their own privacy policies and may use their own cookies, storage, and network services. Other external services load only when you follow a link, submit the contact form, or select Load interactive application.</p></section></div>` })],
  ['404.html', layout({ title: 'Page not found', description: 'This portfolio page could not be found.', noindex: true, body: '<div class="shell text-page"><p class="eyebrow">404</p><h1>Page not found.</h1><p>The page may have moved. Browse the project library to find the work you are looking for.</p><a class="button" href="./index.html#projects">Browse projects</a></div>' })]
]);
for (const project of siteProjects) pages.set(`${project.id}/index.html`, projectPage(project));
for (const collection of browseCollections) pages.set(`${collection.id}/index.html`, collectionPage(collection));
for (const companion of companions) {
  pages.set(`${companionRoute(companion.id)}/index.html`, companionPage(companion, reports.get(companion.id), { layout, esc, list }));
  for (const name of ['README.md', 'demo.py', 'test_demo.py']) {
    const source = await readFile(resolve(root, `examples/${companion.id}/${name}`), 'utf8');
    pages.set(`${sourceRoute(companion.id, name)}/index.html`, sourcePage(companion, name, source, { layout, esc }));
  }
}
pages.set('additional-projects/index.html', layout({ title: 'Additional projects', description: 'More geospatial case studies, public software, and synthetic-data demonstrations.', route: 'additional-projects', body: `<div class="shell text-page"><h1>Additional projects</h1><p>More recent case studies, public tools, and experiments.</p>${projectList(additionalProjects.map(p => [p.id, p.title]))}<p class="back-link"><a href="../index.html#projects">← All project collections</a></p></div>` }));

// Host only this allowlisted output. Internal evidence and source backups stay local.
await mkdir(output, { recursive: true });
// Remove only pages recorded by our own previous build, never arbitrary files.
let previous;
try { previous = JSON.parse(await readFile(resolve(output, 'build-manifest.json'), 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
for (const oldPage of previous?.pages || []) {
  if (!/^(?:index\.html|404\.html|[a-z0-9-]+\/index\.html)$/.test(oldPage)) throw new Error('Invalid previous build manifest path.');
  if (!pages.has(oldPage)) {
    try { await unlink(resolve(output, oldPage)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}
// Retire only these known generated illustrations, now replaced by HTML workflows.
for (const name of ['featured-data-engineering.svg', 'featured-data-science.svg', 'featured-software-engineering.svg']) {
  try { await unlink(resolve(output, 'assets/evidence', name)); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
for (const [path, html] of pages) {
  for (const destination of [resolve(root, path), resolve(output, path)]) {
    await mkdir(resolve(destination, '..'), { recursive: true });
    await writeFile(destination, html);
  }
}
const screenshotAssets = [...new Set(siteProjects.flatMap(project => project.gallery.flatMap(image => [image.src, image.preview])))];
for (const path of ['styles.css', 'script.js', 'theme.js', 'assets/efk-logo.avif', 'assets/gis-background.webp', ...screenshotAssets, ...evidenceAssets, ...socialAssets]) {
  await mkdir(resolve(output, path, '..'), { recursive: true });
  await copyFile(resolve(root, path), resolve(output, path));
}
const urls = ['', 'about/', 'resume/', 'contact/', 'additional-projects/', ...collections.map(c => c.id + '/'), ...siteProjects.map(project => project.id + '/'), ...companions.map(companion => companionRoute(companion.id) + '/')];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(path => `<url><loc>${origin}/${path}</loc></url>`).join('')}</urlset>`;
for (const [path, content] of [['sitemap.xml', sitemap], ['robots.txt', `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`], ['_headers', "/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: default-src 'self'; script-src 'self' 'sha256-"+errorPageScriptHash+"'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src https://formsubmit.co; frame-src https://maps.cityoflewisville.com https://experience.arcgis.com https://lewisville.maps.arcgis.com https://www.arcgis.com https://docs.google.com; object-src 'none'; base-uri 'self'; form-action https://formsubmit.co; frame-ancestors 'none'\n"]]) {
  await writeFile(resolve(root, path), content); await writeFile(resolve(output, path), content);
}
await writeFile(resolve(output, 'build-manifest.json'), JSON.stringify({ pages: [...pages.keys()], origin, projects: projects.length }, null, 2));
console.log(`Built ${pages.size} static pages with ${projects.length} projects into ${output}`);
