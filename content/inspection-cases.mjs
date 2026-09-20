// Public case-study copy. Supporting source notes remain outside this website.
export const groundPatrolProject = {
  id: 'ground-patrol-analytics',
  title: 'Ground patrol analytics and inspection priorities',
  type: 'Professional work',
  roles: ['data-engineering', 'data-science'],
  summary: 'Preparing inspection records, assigning consistent priorities, and reviewing work orders and defects in GIS and Power BI.',
  context: 'Independent consulting · Utility inspection analytics',
  tools: ['Python', 'pandas', 'SQL', 'ArcPy', 'ArcGIS', 'Power BI'],
  problem: 'Inspection findings, asset attributes, and work orders needed a consistent basis for comparison across locations and reporting years.',
  contribution: 'I developed inspection-data preparation and priority-assignment workflows, alongside GIS and Power BI views for examining inspection progress, defects, and work orders.',
  approach: [
    'Prepare spreadsheet and CSV exports with relevant inspection attributes and reporting years.',
    'Join work orders to asset records and add geographic context for GIS use.',
    'Apply explicit condition rules to assign priority, work type, and job plan.',
    'Present inspection status, defect patterns, priorities, and cost summaries in reporting views.'
  ],
  result: 'The work provided structured inspection records, consistent rule-based assignments, and reporting views for reviewing progress and maintenance needs.',
  boundary: 'This case study presents related historical processing and reporting components. It does not establish a single automated Power BI refresh chain or a measured cost-savings result. Client records and infrastructure details remain private.',
  flow: ['Inspection records', 'Data preparation', 'Priority rules', 'Reporting views'],
  links: [],
  relatedProjects: ['utility-inspection-etl'],
  gallery: [],
  evidenceSections: [
    {
      heading: 'Preparation, rules, and reporting',
      paragraphs: [
        'The project combined data preparation, inspection-priority logic, and analytical views. The diagram separates these components so that the reporting work and the underlying processing are clear.'
      ],
      diagram: {
        src: 'assets/evidence/ground-patrol-workflow.svg',
        title: 'Ground patrol data preparation, priority rules, and reporting components',
        caption: 'An explanatory diagram of related project components. Connections within each row describe the method; the diagram does not assert an automated connection between the rows.'
      }
    },
    {
      heading: 'Prepare records for comparison',
      paragraphs: [
        'Historical inspections arrived in spreadsheets and year-specific exports. Python preparation converted workbook data to CSV, retained relevant inspection and asset attributes, added the reporting year, and combined selected yearly files.',
        'A related SQL workflow joined work orders to asset locations, parent locations, and structure attributes. Python normalized dates and coordinates, while ArcPy created point features and added hazard-area context through a spatial overlay.'
      ]
    },
    {
      heading: 'Make priority assignments explicit',
      paragraphs: [
        'Condition codes mapped to a priority, work type, and job plan. When a record contained several findings, the calculation selected the lowest numerical priority. If equally urgent findings called for repair and replacement, replacement took precedence.',
        'These were deterministic business rules. The examples below illustrate the selection logic using hypothetical findings.'
      ],
      table: {
        caption: 'Illustrative priority selection',
        headers: ['Findings on one record', 'Selected action', 'Reason'],
        rows: [
          ['Priority 1: repair; priority 2: replace', 'Priority 1: repair', 'The lower numerical priority takes precedence.'],
          ['Priority 1: repair; priority 1: replace', 'Priority 1: replace', 'Replacement takes precedence at equal priority.']
        ]
      }
    },
    {
      heading: 'Review the operational questions',
      paragraphs: [
        'The GIS dashboard organized inspection progress, status, priorities, and geography. Power BI views expanded the analysis to work-order status, recurring defects, job plans, and cost summaries, with filters for reporting year, material, and location.'
      ],
      table: {
        caption: 'Questions addressed by the reporting views',
        headers: ['Question', 'View'],
        rows: [
          ['Where does inspection work remain?', 'Inspection status and progress with a map.'],
          ['Which defects and priorities recur?', 'Comparisons by reporting year, damage category, and asset material.'],
          ['What maintenance work is represented?', 'Work-order status, job-plan, and geographic summaries.'],
          ['How are recorded costs distributed?', 'Yearly and circuit-level cost summaries.']
        ]
      }
    }
  ]
};

// Deliberately omit result, metric, metricLabel, contribution, and context.
// The existing case retains its established outcome wording and ownership.
export const utilityInspectionUpdate = {
  approach: [
    'Collect helicopter track exports and flight metadata with Python and Selenium.',
    'Normalize flight attributes and construct ordered flight lines from timestamped points.',
    'Consolidate asset schemas and use spatial proximity to associate assets with flight coverage.',
    'Stage and refresh GIS records, calculate inspection priorities, and publish updated information to ArcGIS Portal.'
  ],
  boundary: 'Client records, infrastructure locations, credentials, and source code are not shared. Proximity to a flight path indicates possible inspection coverage; it does not independently verify that an asset was inspected.',
  links: [],
  relatedProjects: ['ground-patrol-analytics'],
  evidenceSections: [
    {
      heading: 'From source records to spatial coverage',
      paragraphs: [
        'The flight workflow combined exported track points with flight metadata, standardized the fields, and constructed ordered flight lines. A separate consolidation step mapped structures, poles, towers, and substations into a common asset schema.'
      ]
    },
    {
      heading: 'Define what the spatial match means',
      paragraphs: [
        'The archived method used a 350-foot proximity rule to associate existing assets with flight lines and attach flight attributes. This produced candidate coverage information for inspection reporting.',
        'A nearby flight path is a spatial relationship, not independent confirmation of an inspection. The coverage result must be interpreted alongside the operational inspection records.'
      ]
    },
    {
      heading: 'Connect processing with GIS delivery',
      bullets: [
        'Use stored timestamps to select new flight records for processing.',
        'Apply explicit field mappings when moving staged data into GIS feature classes.',
        'Join work orders with asset attributes and geographic context.',
        'Publish refreshed information for inspection dashboards and related analysis.'
      ],
      paragraphs: [
        'The retained project material includes processing scripts, saved GIS outputs, a tool guide, and historical geoprocessing messages. These support the implementation described here; individual tool-history entries are not counts of complete scheduled pipeline runs.',
        'The related ground patrol case focuses on inspection rules and reporting. The runnable example on this page uses invented records to demonstrate data-pipeline checks separately from the client workflow.'
      ]
    }
  ]
};
