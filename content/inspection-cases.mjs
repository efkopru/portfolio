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
  summary: 'Automating flight-track processing and utility inspection data updates in enterprise GIS.',
  tools: ['Python', 'Selenium', 'ArcPy', 'pandas', 'SQL', 'ArcGIS Portal'],
  flow: ['Collect records', 'Build flight lines', 'Match nearby assets', 'Update GIS'],
  approach: [
    'Collect flight metadata with Selenium, retrieve GPS track exports, and join them with pandas.',
    'Select newer records, create points, and build lines grouped by flight and ordered by point sequence.',
    'Standardize flight attributes and stage points and lines in a local file geodatabase.',
    'Find assets within 350 feet of flight lines and attach the flight attributes using explicit field mappings.',
    'Select newer local records for enterprise-geodatabase append. The wider project also joined work orders, calculated inspection priorities, and delivered updated information through ArcGIS Portal.'
  ],
  boundary: 'Client records, infrastructure locations, credentials, and source code are not shared. Proximity to a flight path indicates possible inspection coverage; it does not independently verify that an asset was inspected.',
  links: [],
  relatedProjects: ['ground-patrol-analytics'],
  evidenceSections: [
    {
      heading: 'How the flight-track workflow works',
      paragraphs: [
        'The flight-track component combines flight metadata with GPS points, builds flight lines, and finds nearby utility assets. A Python launcher coordinates six scripts from collection through enterprise GIS updates.'
      ],
      diagram: {
        src: 'assets/evidence/utility-data-flow.svg',
        zoomable: true,
        title: 'Collect records, build flight lines, match nearby assets, and update GIS',
        caption: 'A simplified explanation of the historical flight-track workflow. No client records or infrastructure locations are shown. Select the diagram to view it full size.'
      }
    },
    {
      heading: 'How updates are handled',
      bullets: [
        'Combine sources: join flight metadata to GPS points by track identifier and standardize the fields with pandas.',
        'Select newer records: compare timestamps with the latest stored records, both before local processing and before enterprise append.',
        'Stage before delivery: prepare points, lines, and asset matches in a local file geodatabase, with explicit field mappings for GIS updates.',
        'Record progress: write per-stage logs, row counts, and subprocess status to help trace a run.'
      ]
    },
    {
      heading: 'Outputs and scope',
      table: {
        caption: 'What the flight-track component produces',
        headers: ['Output', 'Purpose'],
        rows: [
          ['Ordered flight lines', 'Review each flight path with its identifiers, dates, and movement attributes.'],
          ['Candidate asset coverage', 'Associate assets within 350 feet of a flight line with its flight attributes. Proximity alone does not confirm an inspection.']
        ]
      },
      paragraphs: [
        'These outputs support the wider project’s work-order joins, inspection priorities, and ArcGIS Portal reporting. The related ground patrol case explains the priority rules and reporting work.',
        'The runnable example below uses invented records. Its validation and rollback behavior belong to that teaching example, not to the historical flight-track scripts.'
      ]
    }
  ]
};
