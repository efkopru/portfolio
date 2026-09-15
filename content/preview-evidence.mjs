// Public-safe companion material, used only by the alternate portfolio preview.
// These diagrams explain existing summaries; they are not recovered project artifacts.
export const previewEvidence = {
  'utility-inspection-etl': {
    diagrams: [{
      src: 'assets/evidence/utility-inspection-pipeline.svg',
      title: 'Utility inspection pipeline: explanatory architecture',
      caption: 'New explanatory diagram based on the public case-study summary. It shows the documented workflow, not a client system screenshot. No infrastructure locations, records, credentials, or private source are included.',
      width: 1200,
      height: 600
    }],
    links: []
  },
  'accessibility-analysis': {
    diagrams: [{
      src: 'assets/evidence/accessibility-method.svg',
      title: 'Community accessibility: explanatory method',
      caption: 'New method diagram based on the public case-study summary. This is not a measured accessibility map. Internal inputs, travel cutoffs, scoring weights, and decision records are not reproduced.',
      width: 1200,
      height: 600
    }],
    links: []
  },
  'lead-service-review-prototype': {
    diagrams: [],
    note: 'Newly authored educational companion using entirely synthetic records. It is not the original prototype implementation, a recovered employer artifact, a field-validated model, or evidence of historical savings. It demonstrates a small grouped-split logistic baseline, not the full model described in the case study.',
    links: [
      { href: 'examples/lead-pipe-synthetic/README.md', label: 'Read the synthetic companion guide' },
      { href: 'examples/lead-pipe-synthetic/demo.py', label: 'Inspect the Python example' },
      { href: 'examples/lead-pipe-synthetic/test_demo.py', label: 'Inspect the tests' }
    ]
  }
};

// The preview build copies only this allowlist beneath /preview/.
export const previewCompanionFiles = [
  'assets/evidence/utility-inspection-pipeline.svg',
  'assets/evidence/accessibility-method.svg',
  'examples/lead-pipe-synthetic/README.md',
  'examples/lead-pipe-synthetic/demo.py',
  'examples/lead-pipe-synthetic/test_demo.py'
];
