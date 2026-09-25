// Public portfolio copy. Local source evidence is recorded separately in docs/.
import screenshotGroups from './screenshots.json' with { type: 'json' };
import { nearMapProject } from './nearmap-case.mjs';
import { parcelProject } from './parcel-case.mjs';
import { groundPatrolProject, utilityInspectionUpdate } from './inspection-cases.mjs';
import { doctoralResearchUpdate } from './research-update.mjs';
export const profile = {
  name: 'Esad Kopru', location: 'Dallas, Texas', email: 'esad.kopru@gmail.com', github: 'https://github.com/efkopru',
  description: 'Geospatial data science, data engineering, and software engineering. Python, SQL, spatial optimization, automated data pipelines, and public web GIS.',
  roles: [
    { id: 'data-science', name: 'Data science', title: 'Geospatial data scientist', summary: 'Spatial analysis, OCR, machine learning, and optimization grounded in operational questions.' },
    { id: 'data-engineering', name: 'Data engineering', title: 'Geospatial data engineer', summary: 'Spatial ETL, database refreshes, data quality, and enterprise GIS integration.' },
    { id: 'software-engineering', name: 'Software engineering', title: 'Geospatial software engineer', summary: 'Public web maps, geospatial applications, APIs, and tools that make GIS usable.' }
  ],
  skills: [
    ['Programming', 'Python, SQL, JavaScript, R, C#, .NET, Arcade'],
    ['Spatial systems', 'ArcGIS Enterprise and Online, ArcPy, QGIS, PostgreSQL/PostGIS, pgRouting'],
    ['Data pipelines', 'FME, GDAL, Selenium, pandas, GeoPandas, rasterio'],
    ['Analysis and modeling', 'Spatial statistics, scikit-learn, integer programming, heuristics, remote sensing']
  ],
  experience: [
    { title: 'Software Developer - GIS', employer: 'City of Lewisville', dates: 'November 2021 to present', points: ['Maintain and enhance the public JavaScript web map; delivered nine widgets, including navigation, swipe, measurement, and legend tools, and modernized the application with web components.', 'Created the GIS Hub and Open Data site. Migrated 150+ map services to ArcGIS Online and decommissioned five servers, eliminating $100K in server management costs.', 'Conducted network accessibility analysis supporting a $750K federal award. Developed OCR workflows identifying 1,000+ potential lead-pipe-free locations with $1M+ in estimated savings.'] },
    { title: 'Geospatial Data Engineer', employer: 'Independent Consultant', dates: 'September 2022 to August 2025', points: ['Engineered Selenium and ArcPy ETL connecting helicopter tracks, work orders, and inspection records to ArcGIS Portal. The automated pipeline completed 30+ monthly production executions.', 'Orchestrated enterprise geodatabase refreshes and inspection-based priority calculations, reducing processing time by 80% per run.', 'Performed regression, classification, interpolation, hotspot, and remote-sensing analyses using operational and spatial data.'] },
    { title: 'GIS Data Analyst', employer: 'City of Lewisville', dates: 'January 2019 to December 2020', points: ['Automated ETL with stored procedures, FME, and Python as part of 50+ workflows developed across the analyst and intern roles. Reduced one two-hour manual process to a two-minute job.', 'Maintained a 500+ mile street network and performed QA/QC on 5,000+ spatial and non-spatial records.'] },
    { title: 'GIS Intern', employer: 'City of Lewisville', dates: 'March 2018 to December 2018', points: ['Supported GIS data management, analysis, and automation.'] },
    { title: 'Teaching Assistant / ERP Access Control Intern', employer: 'The University of Texas at Dallas', dates: 'January to August 2021', points: ['Developed C# and .NET task-automation scripts using Telerik, saving three hours per operation.'] },
    { title: 'Teaching Assistant', employer: 'The University of Texas at Dallas', dates: 'August 2017 to May 2018', points: ['Supported GIS programming, environmental, and spatial optimization coursework.'] }
  ],
  education: ['PhD, Geospatial Information Sciences, The University of Texas at Dallas, May 2024', 'MS, Geospatial Information Sciences, The University of Texas at Dallas, December 2019', 'BS, Computer Engineering, Erciyes University, July 2013'],
  certifications: ['Wherobots Geospatial Data Engineering Associate, 2025', 'ESRI ArcGIS Developer Foundation, 2022', 'ESRI ArcGIS Desktop Associate, 2020']
};

export const projects = [
  {
    id: 'utility-inspection-etl', title: 'Utility inspection data pipeline', type: 'Professional work', roles: ['data-engineering', 'software-engineering'], featured: true,
    summary: 'An automated pipeline for utility inspection records and helicopter tracks.', metric: '80%', metricLabel: 'less refresh processing time per run',
    context: 'Independent consulting · September 2022 to August 2025', tools: ['Python', 'Selenium', 'ArcPy', 'SQL', 'ArcGIS Portal'],
    problem: 'Inspection data came from several sources and needed regular updates in the GIS database.',
    contribution: 'I built and maintained the pipeline, linked helicopter tracks with work orders and inspections, and published the updated data to ArcGIS Portal.',
    approach: ['Collect records and helicopter tracks with Python and Selenium.', 'Refresh GIS database tables with truncate-and-append processing.', 'Calculate inspection jobs and priorities, then publish the updated data.'],
    result: 'The automated pipeline completed 30+ scheduled monthly runs and removed two hours of manual work per run. GIS database refreshes took 80% less processing time per run.',
    boundary: 'Client records, infrastructure locations, credentials, and source code are not shared.',
    flow: ['Operational records', 'ETL and refresh', 'Inspection priorities', 'ArcGIS Portal'], links: []
  },
  {
    id: 'lead-service-line-ocr', title: 'Finding evidence in water-service records', type: 'Professional work', roles: ['data-science', 'data-engineering'], featured: true,
    summary: 'OCR helped find water-service records for checking possible lead-pipe-free locations.', metric: '1,000+', metricLabel: 'potential lead-pipe-free locations identified',
    context: 'City of Lewisville · Software Developer - GIS', tools: ['Python', 'R', 'OCR', 'Record analysis'],
    problem: 'Useful service-line details were stored in historical drawings that were difficult to search.',
    contribution: 'I built Python and R workflows to read text from the drawings and find locations for further review.',
    approach: ['Read text from historical drawings with OCR.', 'Search the extracted text and group related service records.', 'Send possible matches for review against the service-line inventory.'],
    result: 'The broader City effort identified 1,000+ potential lead-pipe-free locations, with $1M+ in estimated savings. The City team was a 2023 TCEQ Technical/Technology award finalist for Lead Services.',
    boundary: 'Potential locations still need material confirmation, and the savings are estimates. The separate synthetic ML prototype does not show historical accuracy or realized savings.',
    flow: ['As-built drawings', 'OCR text', 'Evidence retrieval', 'Review candidates'], links: [{ label: 'TCEQ team recognition', url: 'https://www.tceq.texas.gov/p2/events/teea/finalists#2023' }]
  },
  {
    id: 'interactive-maps-a-custom-js-app', title: 'Public web GIS and application modernization', type: 'Professional work', roles: ['software-engineering'], featured: true,
    summary: 'A public city map with nine new widgets and updated web components.', metric: '9', metricLabel: 'new widgets delivered',
    context: 'City of Lewisville · Software Developer - GIS', tools: ['JavaScript', 'ArcGIS APIs', 'Web components', 'HTML', 'CSS'],
    problem: 'Residents and staff need simple map tools, while the application needs ongoing updates and maintenance.',
    contribution: 'I maintain the public map and delivered nine widgets, including navigation, swipe, measurement, and legend tools. I also replaced traditional widgets with web components.',
    approach: ['Connect GIS services to the web map.', 'Build and maintain tools for map users.', 'Update application components while keeping the map available.'],
    result: 'The public map provides access to City GIS information. The related GIS Hub brings public datasets and maps together.',
    boundary: 'The City runs the application; employee-only features require authentication.',
    links: [{ label: 'Open public city map', url: 'https://maps.cityoflewisville.com/' }, { label: 'Explore public GIS Hub', url: 'https://hub-lewisville.opendata.arcgis.com/' }, { label: 'View related public source', url: 'https://github.com/efkopru/interactive-maps' }]
  },
  {
    id: 'accessibility-analysis', title: 'Measuring access to community amenities', type: 'Professional work', roles: ['data-science'], featured: true,
    summary: 'A study of which neighborhoods have limited access to community amenities.', metric: '$750K', metricLabel: 'federal award supported by the analysis',
    context: 'City of Lewisville · Software Developer - GIS', tools: ['Network analysis', 'Isochrones', 'Spatial aggregation', 'Weighted scoring'],
    problem: 'The City needed to compare access to amenities using street routes and local socioeconomic conditions.',
    contribution: 'I measured network access, combined it with socioeconomic indicators, and identified underserved areas.',
    approach: ['Map the areas reachable through the street network.', 'Summarize access for each census tract.', 'Combine access and socioeconomic measures with weighted scores.'],
    result: 'The analysis supported a $750K federal award.',
    boundary: 'Internal scoring inputs and decision records are not shared.',
    flow: ['Street network', 'Reachable areas', 'Tract-level scoring', 'Planning evidence'], links: []
  },
  {
    id: 'arcgis-enterprise-and-online', title: 'Modernizing enterprise GIS delivery', type: 'Professional work', roles: ['data-engineering', 'software-engineering'], featured: true,
    summary: 'Moving map services to ArcGIS Online and retiring on-premises servers.', metric: '150+', metricLabel: 'map services migrated',
    context: 'City of Lewisville · Software Developer - GIS', tools: ['ArcPy', 'ArcGIS Python API', 'REST APIs', 'ArcGIS Online', 'ArcGIS Hub'],
    problem: 'Managing many map services on local servers required ongoing maintenance.',
    contribution: 'I migrated 150+ map services with Python and ArcGIS APIs. I also created the City GIS Hub and Open Data site.',
    approach: ['Automate migration with Python and ArcGIS APIs.', 'Move map services to ArcGIS Online.', 'Organize public datasets and maps in ArcGIS Hub.'],
    result: 'Five on-premises ArcGIS servers were decommissioned, eliminating $100K in server management costs. The GIS Hub provides public access to City resources.',
    boundary: 'The $100K figure is not an annual savings claim; administrative settings and credentials remain private.', links: [{ label: 'Explore the City GIS Hub', url: 'https://hub-lewisville.opendata.arcgis.com/' }]
  },
  {
    id: 'doctoral-research', title: 'Multiple-target access optimization', type: 'Doctoral research', roles: ['data-science', 'software-engineering'], featured: true,
    summary: 'Finding a low-cost road network from one starting point to several destinations.', metric: 'PhD', metricLabel: 'Geospatial Information Sciences · 2024',
    context: 'The University of Texas at Dallas · Doctoral research', tools: ['Python', 'R', 'Integer programming', 'MIP', 'OMPR'],
    problem: 'Choosing a separate shortest route to each destination can miss opportunities to share parts of the network.',
    contribution: 'I developed an integer-programming model in Python and R to choose connections that share paths between destinations.',
    approach: ['Represent roads and connections as a vector network.', 'Use integer programming in Python and R to choose connections with low total cost.', 'Use convex-hull preprocessing to reduce the search area.'],
    result: 'The work formed part of my PhD, completed in May 2024. The experiments examined the total cost of connecting one starting point to several destinations.',
    boundary: 'Results depend on the network, solver settings, and assumptions used to reduce the search area.',
    links: []
  }
];

projects.push(
  {
    id: 'lead-service-line-evidence-workbench', title: 'Lead Service Line Evidence Workbench', type: 'Synthetic-data demonstration', roles: ['data-science', 'data-engineering', 'software-engineering'],
    summary: 'A local Python workflow that connects document evidence, material predictions, and traceable human review.',
    context: 'Independent project · Version 3 · Synthetic demonstration data', tools: ['Python', 'OCR', 'pandas', 'scikit-learn', 'Grouped evaluation', 'Data validation'],
    problem: 'A material mention in a document is not enough to classify a service line. It must refer to the correct property, service side, and time, and unresolved evidence must remain visible.',
    contribution: 'I developed a third version of the lead-service-line prototype with explicit contracts between page extraction, asset-side linking, model inputs, and reviewer decisions.',
    approach: ['Preserve page-level text, extraction status, and source identifiers so reviewers can trace a material mention back to its evidence.', 'Link evidence to an asset and service side, with ambiguous matches retained for review.', 'Prepare dated snapshots and keep independently verified material labels separate from extracted mentions and model features.', 'Fit text and structured-data models with separate calibration groups and evaluate on held-out groups.', 'Use uncertainty and policy checks to create risk, learning, and random-audit queues; a prediction never becomes a verified material label.', 'Record the configuration, model environment, and output provenance needed to reproduce a local run.'],
    result: 'The workbench produces a reproducible synthetic demonstration with evidence records, calibrated material predictions, and review queues that can be inspected locally.',
    boundary: 'The published data and demonstration are synthetic. This is not a deployed utility system, a regulatory determination, or evidence of field accuracy or municipal savings. Real use requires locally verified labels, independent validation, and accountable human review.',
    flow: ['Page evidence', 'Asset-side snapshot', 'Calibrated model', 'Review record'], links: []
  },
  {
    id: 'lead-service-review-prototype', title: 'Lead pipe prediction prototype', type: 'Synthetic-data demonstration', roles: ['data-science', 'data-engineering'],
    summary: 'A synthetic-data prototype for predicting pipe materials and organizing human review.',
    context: 'Independent prototype · Synthetic demonstration data', tools: ['Python', 'TF-IDF', 'Logistic regression', 'Gradient boosting', 'Grouped evaluation'],
    problem: 'Document text may be incomplete or conflicting, so predictions must allow for uncertainty.',
    contribution: 'I built a local prototype that combines text and structured data to predict materials and organize records for review.',
    approach: ['Extract service-side, status, year, and negation details; keep rule-based guesses separate from verified labels.', 'Combine TF-IDF logistic regression with gradient boosting, then calibrate predictions on separate groups.', 'Test geographic, time-based, and cross-utility splits using synthetic data.', 'Leave uncertain cases unresolved and create separate risk, learning, and random-check queues.', 'Match records and prepare data snapshots separately from the training command.'],
    result: 'The prototype produces predictions and review queues, with notes explaining the models, data, and outputs.',
    boundary: 'This is a local synthetic-data prototype, not a deployed utility model. The historical $1M+ estimated savings came from separate work.',
    flow: ['Document evidence', 'Prepared model table', 'Calibrated predictions', 'Human review'], links: []
  },
  {
    id: 'water-conservation-routes', title: 'Routing water-conservation inspections', type: 'Professional work', roles: ['data-science'],
    summary: 'Shorter routes for inspecting commercial, industrial, and multifamily water meters.', metric: '3 hours', metricLabel: 'less travel per route',
    context: 'City of Lewisville · Software Developer - GIS', tools: ['Network analysis', 'Route optimization', 'GIS'],
    problem: 'Inspection teams needed to spend less time traveling between water-meter locations.',
    contribution: 'I used shortest-path optimization to plan irrigation-inspection routes.',
    approach: ['Identify the meters that need inspection.', 'Calculate routes between inspection stops.', 'Provide the routes for field use.'],
    result: 'The routing work reduced travel time by three hours per route.',
    boundary: 'This result applies to the inspection workflow, not the separate public TSP demo; customer records and GIS datasets are not shared.',
    links: [{ label: 'Related public TSP code', url: 'https://github.com/efkopru/traveling-salesman' }]
  },
  {
    id: 'python-and-notebooks', title: 'Automating recurring GIS work', type: 'Professional work', roles: ['data-engineering', 'software-engineering'],
    summary: 'Automating repetitive GIS tasks with Python, FME, and SQL.', metric: '50+', metricLabel: 'ETL workflows automated',
    context: 'City of Lewisville · GIS analyst and intern work', tools: ['Python', 'SQL', 'FME', 'Flask', 'Qt', 'Tkinter'],
    problem: 'Data conversion, database updates, and map publishing involved repeated manual steps.',
    contribution: 'I automated 50+ ETL workflows using stored procedures, FME, and Python. I also built task interfaces with Qt, Tkinter, and Flask.',
    approach: ['Convert files and tables into spatial data.', 'Automate database updates with SQL and Python.', 'Build simple interfaces and publishing workflows for recurring tasks.'],
    result: 'One two-hour manual process became a two-minute automated job. Across the analyst and intern roles, I also managed 8+ ArcGIS Servers, ArcGIS Portal, and 90+ hosted feature services.',
    boundary: 'The time saving applies to one workflow; full source projects and datasets are not included.', links: []
  },
  {
    id: 'building-footprint-extraction', title: 'Building footprints from aerial imagery', type: 'Public code', roles: ['data-science', 'data-engineering'],
    summary: 'A two-stage workflow: prepare aerial imagery, then extract building footprints with ESRI’s pretrained deep-learning model.',
    context: 'Independent portfolio project', tools: ['ArcGIS Pro', 'Raster processing', 'Pretrained deep learning'],
    problem: 'The imagery needs preparation, and extracted building outlines need to be checked.',
    contribution: 'I prepared the imagery, applied ESRI’s pretrained model, and inspected the building outlines it produced.',
    approach: ['Create imagery tiles and a raster mosaic in ArcGIS Pro.', 'Run ESRI’s pretrained US buildings model with its documented default settings.', 'Check for missed buildings and problems caused by the imagery.'],
    result: 'The repository includes the workflow and example results, including buildings missed where imagery contained attribution text.',
    boundary: 'This uses a pretrained model. The example does not measure accuracy across a wider dataset.',
    links: [{ label: 'View extraction workflow', url: 'https://github.com/efkopru/extract-features' }]
  },
  {
    id: 'traveling-salesman', title: 'Comparing route-optimization algorithms', type: 'Public code', roles: ['data-science', 'software-engineering'],
    summary: 'Comparing Python methods for finding a route through a set of stops.',
    context: 'Independent portfolio project', tools: ['Python', 'Optimization', 'Heuristics', 'Algorithm comparison'],
    problem: 'Better routes can take longer to calculate as the number of stops grows.',
    contribution: 'I implemented and compared several Traveling Salesman Problem solvers.',
    approach: ['Compare exact methods with greedy and local-search methods.', 'Test simulated annealing and genetic algorithms.', 'Compare route maps and running times for the example problems.'],
    result: 'The repository includes Python code, route images, and comparisons of the tested algorithms.',
    boundary: 'Results apply to the tested examples, not every routing problem or the separate municipal inspection project.',
    links: [{ label: 'View TSP source', url: 'https://github.com/efkopru/traveling-salesman' }]
  },
  {
    id: 'income-level-prediction-using-r', title: 'Comparing income-classification models in R', type: 'Learning project', roles: ['data-science'],
    summary: 'Comparing R models for predicting income categories.',
    context: 'Independent learning project · Historical R code', tools: ['R', 'Logistic regression', 'Random forest', 'SVM'],
    problem: 'Different classification models can give different results on the same data.',
    contribution: 'I compared several income-classification methods in R as a learning project.',
    approach: ['Explore the input data and income categories.', 'Fit logistic regression, decision trees, random forests, and a linear SVM.', 'Compare the model outputs.'],
    result: 'The repository includes the original IncomeLevelPrediction.R script.',
    boundary: 'This is an exploratory learning project, not a validated accuracy benchmark or a deployed decision system.',
    links: [{ label: 'View R source', url: 'https://github.com/efkopru/ILPrediction' }, { label: 'View original presentation', url: 'https://docs.google.com/presentation/d/1TP-t51nEhcaOQrtdFjXIwcz5CdQMXi_Y/htmlpresent' }]
  },
  {
    id: 'workforce-participation', title: 'Interactive workforce atlas', type: 'Public application', roles: ['software-engineering', 'data-science'],
    summary: 'An interactive D3 atlas comparing U.S. state labor-market patterns from January 2020 through August 2026.',
    context: 'Independent portfolio project', tools: ['JavaScript', 'D3', 'TopoJSON', 'Data visualization', 'Interactive maps'],
    problem: 'A single static chart makes it difficult to compare changes across states, dates, and labor-market indicators.',
    contribution: 'I built an atlas with geographic and tile-grid maps, linked trend charts, time controls, state profiles, and shareable views.',
    approach: ['Read the monthly CSV snapshot and preserve missing observations as gaps.', 'Calculate national rates from summed state counts instead of averaging state percentages.', 'Keep color scales fixed across the time series so map colors remain comparable during animation.', 'Synchronize the metric, month, selected state, and map view through a shared application state and URL hash.'],
    result: 'The published application covers 50 states and Washington, DC across 80 monthly periods of Bureau of Labor Statistics data. Visitors can compare metrics, animate the timeline, inspect state trends, and share a selected view. The app and source are available on GitHub.',
    boundary: 'The app uses a BLS data snapshot rebuilt in September 2026, not a live feed. State job-openings data end in December 2025 because BLS publishes them annually, and missing observations remain visible as gaps.',
    links: [{ label: 'Open interactive atlas', url: 'https://efkopru.github.io/workforce-participation/' }, { label: 'View source on GitHub', url: 'https://github.com/efkopru/workforce-participation' }]
  },
  {
    id: 's2s-transformer-bias-correction', title: 'Space-time forecast calibration', type: 'Synthetic-data demonstration', roles: ['data-science', 'software-engineering'],
    summary: 'Comparing a transformer with simpler forecast corrections using synthetic data.',
    context: 'Independent portfolio demonstration', tools: ['Python', 'NumPy', 'PyTorch', 'Transformers', 'Forecast calibration'],
    problem: 'A complex forecast model needs to be compared with simpler methods.',
    contribution: 'I built a synthetic-data comparison with statistical baselines, a NumPy reference, and a PyTorch transformer.',
    approach: ['Create a synthetic forecast-correction task.', 'Compare the transformer with statistical corrections.', 'Publish the tests, measurements, and results.'],
    result: 'The repository and demo page show the experiment setup and results.',
    boundary: 'The results use synthetic data, not real-world climate tests; data-loading code does not show operational forecast accuracy.',
    links: [{ label: 'Explore benchmark', url: 'https://efkopru.github.io/s2s-transformer-bias-correction/' }, { label: 'View source', url: 'https://github.com/efkopru/s2s-transformer-bias-correction' }]
  },
  {
    id: 'dask-ensemble-calibration', title: 'Ensemble calibration with Dask', type: 'Synthetic-data demonstration', roles: ['data-engineering', 'data-science'],
    summary: 'Adjusting forecast bias and spread with Dask, using synthetic ensembles.',
    context: 'Independent portfolio demonstration', tools: ['Python', 'Dask', 'Array processing', 'Ensemble calibration'],
    problem: 'A group of forecasts may be consistently biased or show too much or too little variation.',
    contribution: 'I built a synthetic-data demo that uses Dask arrays to adjust forecast bias and spread.',
    approach: ['Store synthetic ensemble forecasts in Dask arrays.', 'Apply rolling corrections to bias and spread.', 'Check the results with CRPS scores and rank histograms.'],
    result: 'The repository and demo show the processing steps and calibration results.',
    boundary: 'These synthetic tests do not demonstrate production throughput, real forecast accuracy, or a deployed distributed system.',
    links: [{ label: 'Explore calibration demo', url: 'https://efkopru.github.io/dask-ensemble-calibration/' }, { label: 'View source', url: 'https://github.com/efkopru/dask-ensemble-calibration' }]
  },
  {
    id: 'vit-heatwave-calibration', title: 'Spatial temperature correction with a vision transformer', type: 'Synthetic-data demonstration', roles: ['data-science'],
    summary: 'Using a vision transformer to correct synthetic temperature maps at finer resolution.',
    context: 'Independent portfolio demonstration', tools: ['Python', 'PyTorch', 'Vision transformer', 'Spatial downscaling'],
    problem: 'A coarse temperature grid cannot show the same spatial detail as a finer grid.',
    contribution: 'I built a vision-transformer demo for spatial correction and downscaling.',
    approach: ['Create synthetic temperature maps.', 'Convert an 8×8 input grid to a 32×32 output grid.', 'Inspect the corrected maps.'],
    result: 'The code and demo page show the workflow and synthetic outputs.',
    boundary: 'These synthetic temperature maps are not validated heatwave forecasts or tests on observed climate records.',
    links: [{ label: 'Explore spatial correction', url: 'https://efkopru.github.io/vit-heatwave-calibration/' }, { label: 'View source', url: 'https://github.com/efkopru/vit-heatwave-calibration' }]
  },
  {
    id: 'transformer-bias-correction', title: 'Sequence-based forecast bias correction', type: 'Synthetic-data demonstration', roles: ['data-science', 'software-engineering'],
    summary: 'Learning forecast corrections from simulated time series with a PyTorch transformer.',
    context: 'Independent portfolio demonstration', tools: ['Python', 'PyTorch', 'Transformers', 'Time series'],
    problem: 'Simulated forecast errors provide a simple way to test learned corrections.',
    contribution: 'I built a transformer workflow to correct simulated forecast sequences.',
    approach: ['Create simulated forecast and reference sequences.', 'Train a PyTorch transformer to learn the corrections.', 'Show the workflow and outputs in a public demo.'],
    result: 'The source code and demo page show the sequence-modeling example.',
    boundary: 'This simulated-data demo is separate from the space-time benchmark and is not an operational forecast model.',
    links: [{ label: 'Explore sequence correction', url: 'https://efkopru.github.io/transformer-bias-correction/' }, { label: 'View source', url: 'https://github.com/efkopru/transformer-bias-correction' }]
  },
  {
    id: 'spatial-analysis', title: 'Applied spatial analysis and mapping', type: 'Analysis portfolio', roles: ['data-science'],
    summary: 'Maps and analyses of access, land cover, terrain, parcels, and routes.',
    context: 'Selected historical portfolio examples', tools: ['GIS', 'QGIS', 'Spatial analysis', 'Network analysis', 'Remote sensing'],
    problem: 'Planning questions often need several types of geographic data to be considered together.',
    contribution: 'I mapped income, attendance zones, rental status, code enforcement, and tree locations. I also analyzed viewsheds, sea-level scenarios, land-cover change, and parcel suitability.',
    approach: ['Combine maps and attribute data for a specific question.', 'Apply terrain, routing, or change-detection methods as needed.', 'Present the results in maps and short summaries.'],
    result: 'The gallery shows a range of spatial-analysis work, including OpenStreetMap data retrieval and shortest- and fastest-path analysis in QGIS.',
    boundary: 'These screenshots show previous work; the full datasets and methods are not included.', links: []
  },
  {
    id: 'crime-analysis', title: 'Automating data delivery for a crime dashboard', type: 'Professional work', roles: ['data-engineering', 'software-engineering'],
    summary: 'Automatic updates from SQL Server to an ArcGIS Online crime dashboard.',
    context: 'Historical GIS dashboard portfolio', tools: ['SQL Server', 'ETL', 'ArcGIS Online', 'Dashboards'],
    problem: 'The dashboard needed fresh data without repeated manual database exports.',
    contribution: 'I contributed to this project end to end, from automated SQL Server data updates and ArcGIS Online layers to dashboard design and implementation.',
    approach: ['Read records from SQL Server.', 'Convert the tables into GIS layers.', 'Update the hosted layers used by the dashboard.'],
    result: 'The automated workflow kept the dashboard layers connected to their source database.',
    boundary: 'This is a reporting workflow, not predictive policing or individual-risk scoring; incident records and authenticated dashboards are not included.', links: []
  },
  {
    id: 'geospatial-processing-tools', title: 'Raster and document processing utilities', type: 'Public code', roles: ['data-engineering', 'software-engineering'],
    summary: 'Python tools for converting PDF pages and preparing raster-processing dependencies.',
    context: 'Independent portfolio tools', tools: ['Python', 'GDAL', 'Rasterio', 'Docker', 'PDF processing'],
    problem: 'Documents and raster files often need preparation before GIS analysis.',
    contribution: 'I published PDF conversion tools and examples for packaging raster-processing software.',
    approach: ['Convert selected PDF pages with format, DPI, grayscale, and size options.', 'Explore Docker and Lambda-layer packaging for raster dependencies.', 'Provide GDAL code for compressing GeoTIFF files.'],
    result: 'Both repositories contain source code that can be reviewed independently of employer systems.',
    boundary: 'The raster examples explore packaging and compression, not a validated production AWS Lambda deployment.',
    links: [{ label: 'PDF conversion source', url: 'https://github.com/efkopru/pdf-to-image' }, { label: 'Raster packaging source', url: 'https://github.com/efkopru/aws-lambda-rasterio' }]
  }
);

projects.push(nearMapProject, groundPatrolProject, parcelProject);
Object.assign(projects.find(project => project.id === 'utility-inspection-etl'), utilityInspectionUpdate);
Object.assign(projects.find(project => project.id === 'doctoral-research'), doctoralResearchUpdate);
projects.find(project => project.id === 'python-and-notebooks').relatedProjects = ['parcel-data-integration', 'nearmap-imagery-pipeline'];

for (const [group, images] of Object.entries(screenshotGroups)) {
  for (const image of images) image.group = group;
}
const galleries = {
  'spatial-analysis': [...screenshotGroups['spatial-analysis'], ...screenshotGroups.qgis],
  'arcgis-enterprise-and-online': screenshotGroups['arcgis-enterprise-and-online'],
  'python-and-notebooks': [...screenshotGroups['python-and-notebooks'], ...screenshotGroups['sql-and-javascript-and-r'], ...screenshotGroups['modelbuilder-and-arcmap-tool-in-vbnet']],
  'interactive-maps-a-custom-js-app': [...[4, 2, 3].map(index => screenshotGroups['sql-and-javascript-and-r'][index]), screenshotGroups['arcgis-enterprise-and-online'][7]],
  'doctoral-research': screenshotGroups['doctoral-research'],
  'water-conservation-routes': screenshotGroups['water-conservation-routes'],
  'building-footprint-extraction': screenshotGroups['building-footprint-extraction'],
  'traveling-salesman': screenshotGroups['traveling-salesman']
};
for (const project of projects) project.gallery = galleries[project.id] || screenshotGroups[project.id] || [];

export const legacyAliases = {
  'spatial-and-data-analysis': 'index.html?role=data-science#projects',
  'ml-optimization': 'index.html?role=data-science#projects',
  'development-and-etl': 'index.html?role=data-engineering#projects',
  'qgis': 'spatial-analysis/index.html#gallery-qgis',
  'code-enforcement-violations': 'spatial-analysis/index.html#screenshot-spatial-analysis-02',
  'sql-and-javascript-and-r': 'python-and-notebooks/index.html#gallery-sql-and-javascript-and-r',
  'modelbuilder-and-arcmap-tool-in-vbnet': 'python-and-notebooks/index.html#gallery-modelbuilder-and-arcmap-tool-in-vbnet',
  'interactive-maps-experience-builder': 'interactive-maps-a-custom-js-app/index.html#screenshot-arcgis-enterprise-and-online-08'
};
