export const nearMapProject = {
  id: 'nearmap-imagery-pipeline',
  title: 'From imagery tiles to a GIS-ready mosaic',
  type: 'Professional work',
  roles: ['data-engineering', 'software-engineering'],
  summary: 'A Python and GDAL workflow for collecting aerial imagery, recovering missing tiles, and assembling georeferenced raster mosaics.',
  metric: '120,426',
  metricLabel: 'tiles accounted for in an archived coverage check',
  context: 'Municipal GIS workflow · October 2025',
  tools: ['Python', 'GDAL', 'Shapely', 'Nearmap API', 'Raster processing'],
  problem: 'A large imagery download can finish with missing or blank tiles. Those gaps need to be identified and recovered before the mosaic is useful for GIS work.',
  contribution: 'I built a workflow that selects imagery tiles within a boundary, checks downloads, retries missing tiles, and assembles clipped GeoTIFF mosaics with GDAL.',
  approach: [
    'Derive the tile set from an area boundary and the selected imagery dates.',
    'Download tiles with HTTP retries, blank-image checks, and alternate survey lookup.',
    'Compare expected tiles with files on disk, then rerun only the missing set.',
    'Georeference the tiles, build a virtual mosaic, clip it to the boundary, and create raster overviews.'
  ],
  result: 'Archived October 2025 runs show the unresolved tile count falling from 453 to 64 and then to zero. The final coverage check accounted for all 120,426 expected tiles, followed by a logged mosaic write.',
  boundary: 'The counts come from archived execution logs. They describe tile coverage, not an independent assessment of image quality or positional accuracy.',
  flow: ['Area boundary', 'Tile download', 'Coverage and recovery', 'Raster mosaic'],
  links: [],
  evidenceSections: [
    {
      heading: 'Recovery is part of the workflow',
      paragraphs: [
        'I separated downloading, coverage checks, and mosaic assembly so a failed tile did not require repeating the entire collection. Recovery passes could use the missing-tile list while keeping the files already collected.'
      ],
      diagram: {
        src: 'assets/evidence/nearmap-pipeline.svg',
        title: 'Imagery collection with a targeted recovery loop',
        caption: 'An original workflow diagram showing tile selection, download checks, targeted retries, and GDAL mosaic assembly.'
      }
    },
    {
      heading: 'What the archived runs show',
      table: {
        caption: 'Selected checkpoints from the October 2025 execution logs.',
        headers: ['Date', 'Checkpoint', 'Recorded result'],
        rows: [
          ['October 9, 2025', 'Initial download', '119,973 tiles saved; 453 missing, blank, or failed'],
          ['October 13, 2025', 'Recovery pass', '389 additional tiles saved; 64 still unresolved'],
          ['October 14, 2025', 'Final recovery pass', 'Last outstanding tile saved; zero unresolved after successive passes'],
          ['October 14, 2025', 'Coverage check', '120,426 expected and present; zero missing or undersized files'],
          ['October 14, 2025', 'Mosaic assembly', 'Output write completed in the execution log']
        ]
      },
      paragraphs: [
        'The count of 120,426 comes from comparing the expected tile set with files on disk. The recovery sequence documents how the collection was completed; it does not establish imagery accuracy.'
      ]
    },
    {
      heading: 'Turning tiles into a usable raster',
      bullets: [
        'Polygon intersection limits requests to tiles that overlap the area of interest.',
        'Date and survey selection control which captures are requested, with alternate survey lookup for unsuccessful downloads.',
        'GDAL assigns tile bounds, combines the tiles through virtual rasters, and clips the mosaic to the boundary.',
        'Tiled GeoTIFF output and overviews support navigation at different map scales.'
      ]
    },
    {
      heading: 'Output and scope',
      paragraphs: [
        'The working archive retains a clipped GeoTIFF for a smaller area of interest, along with its overview file. The full tile collection and full-area mosaic are represented here by their archived completion records.',
        'This case study presents the processing method and recorded tile counts. The public illustration is a diagram; licensed imagery and operational configuration remain outside the portfolio.'
      ]
    }
  ]
};
