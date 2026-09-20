export const parcelProject = {
  id: 'parcel-data-integration',
  title: 'Automated parcel integration and publishing',
  type: 'Professional work',
  roles: ['data-engineering', 'software-engineering'],
  summary: 'Two county data sources, recurring spatial checks, and a shared municipal GIS publishing workflow.',
  context: 'City of Lewisville · GIS automation',
  tools: ['Python', 'ArcPy', 'ArcGIS REST', 'SQL Server', 'ArcGIS Online'],
  problem: 'A city spanning two counties needs a consistent parcel layer even when its appraisal districts deliver data in different formats.',
  contribution: 'I built scheduled workflows that integrate county parcel geometry and appraisal attributes, select municipal records, update enterprise geodatabases, and publish to ArcGIS Online.',
  approach: [
    'Read one county source through ArcGIS REST and download the other as shapefile and CSV archives.',
    'Join appraisal attributes to geometry, select municipal parcels, and derive fields used in City GIS applications.',
    'Check record counts and changes in the selected parcel population before continuing the refresh.',
    'Load enterprise geodatabase targets and update the hosted layer through scheduled Python jobs.'
  ],
  result: 'Saved execution logs document recurring hosted-layer updates. An August 2, 2026 run selected 30,686 parcels spatially and added 10 explicitly selected records from a 382,240-feature county source.',
  boundary: 'Counts describe one archived run. The retained source mixes implementation versions, so it is presented as historical workflow evidence rather than a verified runnable release.',
  flow: ['County sources', 'Spatial and attribute checks', 'Enterprise GIS', 'Hosted layer'],
  links: [],
  relatedProjects: ['python-and-notebooks', 'arcgis-enterprise-and-online'],
  evidenceSections: [
    {
      heading: 'Different inputs, consistent GIS delivery',
      paragraphs: ['The integration challenge was handling the two delivery formats while producing municipal layers with consistent fields and selection rules. Each source has its own preparation steps before loading the shared GIS destinations.'],
      table: {
        caption: 'Source-specific preparation',
        headers: ['Source', 'Input', 'Preparation'],
        rows: [
          ['Denton County', 'ArcGIS REST feature service', 'Extract geometry and attributes; select parcel centroids within the municipal boundary and include explicit additional records.'],
          ['Dallas County', 'Shapefile and appraisal CSV archives', 'Combine appraisal tables, join them to parcel geometry, and select the municipal subset.']
        ]
      },
      diagram: {
        src: 'assets/evidence/parcel-integration.svg',
        title: 'Two county inputs pass through source-specific preparation and checks before enterprise and hosted GIS updates',
        caption: 'A simplified architecture of the historical workflow. The diagram contains no parcel records or internal connection details.'
      }
    },
    {
      heading: 'Checks before publication',
      bullets: [
        'Parcel-count bounds block downstream processing when the selected population is unexpected.',
        'Comparison with the previous parcel population helps identify changes that need review.',
        'Run logs record extraction, selection, and publication stages so a failed update can be investigated.'
      ],
      paragraphs: ['The retained publisher logs record successful update calls across July and August 2026. They establish execution history, not an independent check of every hosted feature. The historical database load uses replacement steps without a demonstrated transactional rollback.']
    }
  ]
};
