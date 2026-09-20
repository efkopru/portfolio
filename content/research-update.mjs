export const doctoralResearchUpdate = {
  evidenceSections: [
    {
      heading: 'Follow-up experiments on synthetic networks',
      paragraphs: [
        'Follow-up work after the 2024 dissertation extended the R implementation with a multi-commodity flow formulation and a systematic comparison of full and convex-hull-reduced networks. The archived experiments span six hexagonal grid sizes, three target layouts, and four target counts.',
        'All 72 saved full/reduced comparisons have matching selected-edge costs. This supports cost preservation for those tested configurations. It does not establish that a convex-hull restriction preserves the best solution on every network.'
      ],
      diagram: {
        src: 'assets/evidence/network-benchmark.svg',
        title: 'Design of the archived network experiments',
        caption: 'Six grid sizes, three target layouts, and four target counts produce 72 paired configurations. Each compares the full network with a convex-hull-reduced network.'
      }
    },
    {
      heading: 'Target placement determines the benefit',
      paragraphs: [
        'These representative saved observations use a 271-cell grid with 12 targets. Concentrated radial targets leave a much smaller model. Targets near the corners can span the whole grid, leaving no nodes to remove and adding preprocessing overhead.',
        'For radial targets, the recorded times cover model construction and solving; hull preprocessing happened before the timer. The reduced near-corner and random timings also include hull computation. Each row is one saved run pair, so the times describe these experiments rather than a general performance guarantee.'
      ],
      table: {
        caption: 'Archived 271-cell, 12-target comparisons. Each value pair is full network / reduced network.',
        headers: ['Target layout', 'Nodes retained', 'Selected-edge cost', 'Recorded time (seconds)'],
        rows: [
          ['Radial arms', '271 / 31', '12 / 12', '71.83 / 6.60'],
          ['Near corners', '271 / 271', '54 / 54', '38.04 / 42.46'],
          ['Seeded random', '271 / 99', '32 / 32', '37.81 / 13.92']
        ]
      }
    },
    {
      heading: 'Implementation and validation scope',
      paragraphs: [
        'The follow-up model assigns one flow to each target while charging shared edges once. It also supports targets that must be endpoints, instead of allowing every target to serve as a waypoint.',
        'The repository includes checks against Dijkstra for single-target cases, comparisons between HiGHS and GLPK, and scenarios with barriers, narrow corridors, and different target layouts. The figures and table here summarize archived results; the solver and test suite were not rerun for this presentation.'
      ]
    }
  ]
};
