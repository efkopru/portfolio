// Public portfolio copy. Local source evidence is recorded separately in docs/.
import screenshotGroups from './screenshots.json' with { type: 'json' };
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
    { title: 'Software Developer - GIS', employer: 'City of Lewisville', dates: 'November 2021 to present', points: ['Maintain and enhance the public JavaScript web map; delivered nine widgets and modernized the application with web components.', 'Created the GIS Hub and Open Data site. Migrated 150+ map services to ArcGIS Online and decommissioned five servers, eliminating $100K in server management costs.', 'Conducted network accessibility analysis supporting a $750K federal award. Developed OCR workflows identifying 1,000+ potential lead-pipe-free locations with $1M+ in estimated savings.'] },
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
    summary: 'Automated helicopter-track, work-order, and inspection data processing for an electric utility.', metric: '80%', metricLabel: 'less refresh processing time per run',
    context: 'Independent consulting · September 2022 to August 2025', tools: ['Python', 'Selenium', 'ArcPy', 'SQL', 'ArcGIS Portal'],
    problem: 'Structure-inspection analytics depended on operational records arriving from multiple sources and recurring enterprise geodatabase refreshes.',
    contribution: 'I engineered and maintained the ETL workflow, connected helicopter tracks with work-order and inspection records, and orchestrated publication to ArcGIS Portal.',
    approach: ['Ingest operational records and helicopter tracks through Selenium and Python workflows.', 'Refresh enterprise geodatabase tables with controlled truncate-and-append processing.', 'Calculate inspection-based jobs and priorities, then publish refreshed data for analysis in ArcGIS Portal.'],
    result: 'The automated pipeline completed 30+ monthly production executions and eliminated two hours of manual work per run. Enterprise geodatabase refresh processing time decreased by 80% per run.',
    boundary: 'The execution count belongs to the automated pipeline. Client records, infrastructure locations, credentials, and source code are not distributed with this case study.',
    flow: ['Operational records', 'ETL and refresh', 'Inspection priorities', 'ArcGIS Portal'], links: []
  },
  {
    id: 'lead-service-line-ocr', title: 'Finding evidence in water-service records', type: 'Professional work', roles: ['data-science', 'data-engineering'], featured: true,
    summary: 'OCR and record analysis helped identify potential lead-pipe-free locations for further review.', metric: '1,000+', metricLabel: 'potential lead-pipe-free locations identified',
    context: 'City of Lewisville · Software Developer - GIS', tools: ['Python', 'R', 'OCR', 'Record analysis'],
    problem: 'Historical as-built drawings contained information needed to investigate service-line materials, but the evidence was difficult to search and aggregate.',
    contribution: 'I developed OCR and analysis workflows in Python and R to extract useful evidence from the drawings and identify candidate locations for review.',
    approach: ['Extract text from historical drawings with OCR.', 'Search and aggregate document evidence to locate potentially relevant service records.', 'Use the resulting candidates to support review of the broader service-line inventory.'],
    result: 'The broader historical effort identified 1,000+ potential lead-pipe-free locations and generated $1M+ in estimated savings. The City team was a 2023 TCEQ Technical/Technology award finalist for Lead Services.',
    boundary: 'A candidate is not a confirmed material classification. Preserved historical code demonstrates OCR-text retrieval and aggregation. A separate synthetic ML prototype is not evidence of historical model accuracy or realized savings.',
    flow: ['As-built drawings', 'OCR text', 'Evidence retrieval', 'Review candidates'], links: [{ label: 'TCEQ team recognition', url: 'https://www.tceq.texas.gov/p2/events/teea/finalists#2023' }]
  },
  {
    id: 'interactive-maps-a-custom-js-app', title: 'Public web GIS and application modernization', type: 'Professional work', roles: ['software-engineering'], featured: true,
    summary: 'A maintained public mapping application, nine new widgets, and a transition to JavaScript web components.', metric: '9', metricLabel: 'new widgets delivered',
    context: 'City of Lewisville · Software Developer - GIS', tools: ['JavaScript', 'ArcGIS APIs', 'Web components', 'HTML', 'CSS'],
    problem: 'Residents and staff need a usable way to explore city data, while the underlying web application needs ongoing maintenance and modernization.',
    contribution: 'I maintain and enhance the custom interactive web map, delivered nine new widgets, and modernized the application by replacing traditional widgets with web components.',
    approach: ['Connect GIS services to a browser-based mapping interface.', 'Develop and maintain user-facing map tools.', 'Modernize application components while continuing to support public access.'],
    result: 'The public map is a working example of maintained geospatial software. The related GIS Hub organizes public datasets and interactive maps for community access.',
    boundary: 'The City operates the live application. Some employee features require authentication; access to the public map does not imply access to staff systems.',
    links: [{ label: 'Open public city map', url: 'https://maps.cityoflewisville.com/' }, { label: 'Explore public GIS Hub', url: 'https://hub-lewisville.opendata.arcgis.com/' }, { label: 'View related public source', url: 'https://github.com/efkopru/interactive-maps' }]
  },
  {
    id: 'accessibility-analysis', title: 'Measuring access to community amenities', type: 'Professional work', roles: ['data-science'], featured: true,
    summary: 'Street-network accessibility and socioeconomic scoring identified underserved areas.', metric: '$750K', metricLabel: 'federal award supported by the analysis',
    context: 'City of Lewisville · Software Developer - GIS', tools: ['Network analysis', 'Isochrones', 'Spatial aggregation', 'Weighted scoring'],
    problem: 'Planning decisions needed a tract-level view of access to amenities that accounted for the street network and socioeconomic conditions.',
    contribution: 'I conducted the accessibility analysis, combined network-based measures with socioeconomic indicators, and identified underserved areas.',
    approach: ['Calculate street-network isochrones to describe reachable areas.', 'Aggregate accessibility measures at census tract level.', 'Combine socioeconomic factors through weighted scoring to identify underserved areas.'],
    result: 'The analysis supported a $750K federal award. The financial figure refers to the award, not revenue or a model-performance measurement.',
    boundary: 'The public summary describes the method and documented outcome. Internal scoring inputs and decision records are not included.',
    flow: ['Street network', 'Reachable areas', 'Tract-level scoring', 'Planning evidence'], links: []
  },
  {
    id: 'arcgis-enterprise-and-online', title: 'Modernizing enterprise GIS delivery', type: 'Professional work', roles: ['data-engineering', 'software-engineering'], featured: true,
    summary: 'Automated migration of map services to ArcGIS Online and retirement of on-premises infrastructure.', metric: '150+', metricLabel: 'map services migrated',
    context: 'City of Lewisville · Software Developer - GIS', tools: ['ArcPy', 'ArcGIS Python API', 'REST APIs', 'ArcGIS Online', 'ArcGIS Hub'],
    problem: 'A large map-service estate required ongoing server management and a more maintainable path for publishing public geospatial information.',
    contribution: 'I migrated 150+ map services using ArcPy and ArcGIS Python and REST APIs, and created the City GIS Hub and Open Data site.',
    approach: ['Automate service migration through Python and ArcGIS APIs.', 'Move map services into ArcGIS Online.', 'Organize public datasets and interactive maps through ArcGIS Hub.'],
    result: 'Five on-premises ArcGIS servers were decommissioned, eliminating $100K in server management costs. The public Hub provides access to City GIS resources.',
    boundary: 'The cost figure is the documented project outcome; no annual or recurring period is inferred. Administrative configurations and credentials remain private.', links: [{ label: 'Explore the City GIS Hub', url: 'https://hub-lewisville.opendata.arcgis.com/' }]
  },
  {
    id: 'doctoral-research', title: 'Multiple-target access optimization', type: 'Doctoral research', roles: ['data-science', 'software-engineering'], featured: true,
    summary: 'An integer-programming approach to connecting a source with multiple targets in a spatial network.', metric: 'PhD', metricLabel: 'Geospatial Information Sciences · 2024',
    context: 'The University of Texas at Dallas · Doctoral research', tools: ['Python', 'R', 'Integer programming', 'MIP', 'OMPR'],
    problem: 'Spatial network planning can require access from a source to several targets, making it an optimization problem rather than a collection of independent shortest paths.',
    contribution: 'I developed an integer-programming-based multiple-target access algorithm as part of my doctoral research in geospatial information sciences.',
    approach: ['Represent access decisions on a spatial network.', 'Express the multiple-target access problem through integer programming.', 'Implement the formulation using MIP in Python and OMPR in R.'],
    result: 'The work formed part of my PhD, completed in May 2024. Public R source includes an OMPR/GLPK formulation, convex-hull preprocessing, and example network data.',
    boundary: 'The published source includes example networks and solver-based implementations. Performance depends on the problem instance, solver configuration, and preprocessing assumptions.',
    links: []
  }
];

projects.push(
  {
    id: 'lead-service-review-prototype', title: 'Lead pipe prediction prototype', type: 'Synthetic-data demonstration', roles: ['data-science', 'data-engineering'],
    summary: 'A separate local ML prototype for material probabilities, uncertainty, and human review of service-line evidence.',
    context: 'Independent prototype · Synthetic demonstration data', tools: ['Python', 'TF-IDF', 'Logistic regression', 'Gradient boosting', 'Grouped evaluation'],
    problem: 'Document keywords can be useful evidence without being verified material labels. A review workflow also needs to account for conflicting records and uncertainty.',
    contribution: 'I developed a local prototype that separates document evidence from training labels, combines text and structured models, and produces distinct review queues.',
    approach: ['Extract evidence with service side, status, negation, and year; keep weak rule votes separate from verified targets.', 'Combine TF-IDF logistic regression with structured gradient boosting, then calibrate on separate held-out groups.', 'Evaluate spatial, temporal, and cross-utility splits using synthetic data.', 'Use prediction sets and quality gates to abstain when appropriate, with separate risk, learning, and random-audit queues.'],
    result: 'The prototype implements an evidence-to-review workflow with model/data cards and auditable output artifacts. Its public case study describes the design without exposing source records or model bundles.',
    boundary: 'This is a local synthetic-data prototype, not a deployed utility model or a regulatory decision system. It did not produce the historical $1M+ estimated savings. Entity resolution and snapshot construction are separate controls, not fully orchestrated by the training command.',
    flow: ['Document evidence', 'Prepared model table', 'Calibrated predictions', 'Human review'], links: []
  },
  {
    id: 'water-conservation-routes', title: 'Routing water-conservation inspections', type: 'Professional work', roles: ['data-science'],
    summary: 'Shortest-path optimization for inspections of commercial, industrial, and multifamily water meters.', metric: '3 hours', metricLabel: 'less travel per route',
    context: 'City of Lewisville · Software Developer - GIS', tools: ['Network analysis', 'Route optimization', 'GIS'],
    problem: 'Inspection teams needed more efficient travel between water-meter locations.',
    contribution: 'I applied shortest-path optimization to irrigation-inspection routes serving commercial, industrial, and multifamily properties.',
    approach: ['Identify the meter locations required for inspection.', 'Use network-based routing to organize travel between inspection stops.', 'Provide routes that support field inspection operations.'],
    result: 'The routing work reduced travel time by three hours per route.',
    boundary: 'The result is specific to this inspection workflow. Historical screenshots are shown; underlying customer records and GIS datasets are not distributed. The public TSP demonstration below is a separate project.',
    links: [{ label: 'Related public TSP code', url: 'https://github.com/efkopru/traveling-salesman' }]
  },
  {
    id: 'python-and-notebooks', title: 'Automating recurring GIS work', type: 'Professional work', roles: ['data-engineering', 'software-engineering'],
    summary: 'Python, FME, and SQL workflows replace repetitive data conversion, refresh, and publishing tasks.', metric: '50+', metricLabel: 'ETL workflows automated',
    context: 'City of Lewisville · GIS analyst and intern work', tools: ['Python', 'SQL', 'FME', 'Flask', 'Qt', 'Tkinter'],
    problem: 'Recurring GIS tasks required manual conversion, joins, database updates, and publication across desktop and enterprise systems.',
    contribution: 'I automated more than 50 ETL workflows using stored procedures, FME, and Python, including interfaces built with Qt, Tkinter, and Flask.',
    approach: ['Convert source tables and files into spatial datasets.', 'Automate database processing through stored procedures and Python.', 'Build task-specific interfaces and publishing workflows for recurring GIS operations.'],
    result: 'One two-hour manual process became a two-minute automated job. Across my GIS analyst and intern roles, I managed 8+ ArcGIS Servers, ArcGIS Portal, and 90+ hosted feature services. The broader portfolio includes CSV geocoding, hosted-layer updates, SQL-to-GIS publishing, and database refresh tasks.',
    boundary: 'The two-hour to two-minute result describes one workflow, not every pipeline. Historical interfaces and code excerpts are shown for the ModelBuilder, VB.NET, SQL, R, and Python examples; complete source projects and underlying datasets are not distributed here.', links: []
  },
  {
    id: 'building-footprint-extraction', title: 'Building footprints from aerial imagery', type: 'Public code', roles: ['data-science', 'data-engineering'],
    summary: 'An imagery-processing workflow that applies ESRI’s pretrained US building-extraction model.',
    context: 'Independent portfolio project', tools: ['ArcGIS Pro', 'Raster processing', 'Pretrained deep learning'],
    problem: 'Building-footprint extraction requires imagery preparation as well as inspection of model outputs.',
    contribution: 'I assembled a workflow for tiling and mosaicking imagery, applying the pretrained model, and inspecting the extracted footprints.',
    approach: ['Prepare imagery tiles and construct a raster mosaic in ArcGIS Pro.', 'Apply ESRI’s pretrained US buildings model with the documented default parameters.', 'Inspect results for missed buildings and imagery-related artifacts.'],
    result: 'The public repository includes the workflow and result examples. It documents missed buildings associated with attribution text in the imagery.',
    boundary: 'This applies an existing pretrained model; it is not a claim of custom model training or validated accuracy. Imagery attribution and reuse permissions still apply.',
    links: [{ label: 'View extraction workflow', url: 'https://github.com/efkopru/extract-features' }]
  },
  {
    id: 'traveling-salesman', title: 'Comparing route-optimization algorithms', type: 'Public code', roles: ['data-science', 'software-engineering'],
    summary: 'A Python comparison of exact methods and heuristics for the Traveling Salesman Problem.',
    context: 'Independent portfolio project', tools: ['Python', 'Optimization', 'Heuristics', 'Algorithm comparison'],
    problem: 'Route optimization involves a tradeoff between solution quality and computational effort as the number of stops increases.',
    contribution: 'I implemented a collection of TSP solvers and comparisons so their behavior can be examined on example routing problems.',
    approach: ['Compare exact methods with greedy and local-search approaches.', 'Explore simulated annealing and genetic algorithms.', 'Inspect route visualizations and timing comparisons for the tested instances.'],
    result: 'The public repository contains Python source and result images for comparing algorithm behavior.',
    boundary: 'Example benchmarks describe the tested instances. They are not universal performance guarantees or results from the separate municipal inspection-routing project.',
    links: [{ label: 'View TSP source', url: 'https://github.com/efkopru/traveling-salesman' }]
  },
  {
    id: 'income-level-prediction-using-r', title: 'Comparing income-classification models in R', type: 'Learning project', roles: ['data-science'],
    summary: 'An exploratory comparison of logistic regression, trees, random forests, and support vector machines.',
    context: 'Independent learning project · Historical R code', tools: ['R', 'Logistic regression', 'Random forest', 'SVM'],
    problem: 'Different classification methods can behave differently on the same tabular prediction task.',
    contribution: 'I used R to explore and compare several classification approaches for an income-level prediction task.',
    approach: ['Explore the tabular predictors and classification target.', 'Fit logistic regression, classification trees, random forests, and a linear SVM.', 'Compare model outputs within the exploratory workflow.'],
    result: 'The public IncomeLevelPrediction.R script makes the historical implementation available for inspection.',
    boundary: 'This is a historical learning project. Results are exploratory; no validated accuracy benchmark or deployed decision system is claimed.',
    links: [{ label: 'View R source', url: 'https://github.com/efkopru/ILPrediction' }, { label: 'View original presentation', url: 'https://docs.google.com/presentation/d/1TP-t51nEhcaOQrtdFjXIwcz5CdQMXi_Y/htmlpresent' }]
  },
  {
    id: 'workforce-participation', title: 'An interactive workforce atlas', type: 'Public application', roles: ['software-engineering', 'data-science'],
    summary: 'A D3 atlas for exploring labor-market patterns over time and comparing states.',
    context: 'Independent portfolio project', tools: ['JavaScript', 'D3', 'Data visualization', 'Interactive maps'],
    problem: 'Labor-market patterns vary by geography and time, making a static chart insufficient for many comparisons.',
    contribution: 'I built an interactive atlas that combines geographic and tile-map views with time controls and state comparisons.',
    approach: ['Represent the dataset in linked visual and geographic views.', 'Use time controls to compare the displayed periods.', 'Provide state-level comparisons through a browser interface.'],
    result: 'The public application displays the January 2020 through January 2026 period, with source available alongside the demo.',
    boundary: 'The displayed period is a dataset snapshot. The page is not represented as a continuously updated labor-market feed.',
    links: [{ label: 'Open workforce atlas', url: 'https://efkopru.github.io/workforce-participation/' }, { label: 'View source', url: 'https://github.com/efkopru/workforce-participation' }]
  },
  {
    id: 's2s-transformer-bias-correction', title: 'Space-time forecast calibration', type: 'Synthetic-data demonstration', roles: ['data-science', 'software-engineering'],
    summary: 'A transformer-calibration benchmark with statistical baselines and explicit synthetic-data evaluation.',
    context: 'Independent portfolio demonstration', tools: ['Python', 'NumPy', 'PyTorch', 'Transformers', 'Forecast calibration'],
    problem: 'Forecast calibration needs comparable baselines and evaluation before a more complex model can be justified.',
    contribution: 'I built a synthetic-data benchmark comparing transformer-based calibration with statistical baselines, including a NumPy reference and a PyTorch implementation.',
    approach: ['Create a controlled synthetic forecast-calibration task.', 'Compare the transformer with statistical baseline corrections.', 'Provide tests, metrics, and result artifacts for the benchmark.'],
    result: 'The repository and companion page expose the experimental setup and results for inspection.',
    boundary: 'Reported experiments use synthetic data. Real-data loader code does not establish operational forecast skill or a validated real-world climate benchmark.',
    links: [{ label: 'Explore benchmark', url: 'https://efkopru.github.io/s2s-transformer-bias-correction/' }, { label: 'View source', url: 'https://github.com/efkopru/s2s-transformer-bias-correction' }]
  },
  {
    id: 'dask-ensemble-calibration', title: 'Ensemble calibration with Dask', type: 'Synthetic-data demonstration', roles: ['data-engineering', 'data-science'],
    summary: 'Array-based calibration with rolling bias and spread corrections, CRPS, and rank histograms.',
    context: 'Independent portfolio demonstration', tools: ['Python', 'Dask', 'Array processing', 'Ensemble calibration'],
    problem: 'Ensemble forecasts need evaluation of both systematic bias and the spread of their predictions.',
    contribution: 'I built a synthetic ensemble-calibration demonstration using Dask arrays and rolling correction workflows.',
    approach: ['Represent synthetic ensemble forecasts as Dask arrays.', 'Apply rolling bias and spread corrections.', 'Inspect probabilistic calibration using CRPS and rank histograms.'],
    result: 'The public repository and demo show the processing approach and calibration diagnostics.',
    boundary: 'The experiments use synthetic ensembles. They do not establish production-scale throughput, operational forecast performance, or a deployed distributed system.',
    links: [{ label: 'Explore calibration demo', url: 'https://efkopru.github.io/dask-ensemble-calibration/' }, { label: 'View source', url: 'https://github.com/efkopru/dask-ensemble-calibration' }]
  },
  {
    id: 'vit-heatwave-calibration', title: 'Spatial temperature correction with a vision transformer', type: 'Synthetic-data demonstration', roles: ['data-science'],
    summary: 'A PyTorch experiment in residual spatial correction and downscaling of synthetic temperature fields.',
    context: 'Independent portfolio demonstration', tools: ['Python', 'PyTorch', 'Vision transformer', 'Spatial downscaling'],
    problem: 'Coarse temperature fields do not express all of the spatial structure a finer-resolution representation can show.',
    contribution: 'I built a demonstration of residual spatial correction and downscaling using a vision transformer.',
    approach: ['Construct synthetic temperature fields for a controlled experiment.', 'Map an 8×8 input grid to a 32×32 output grid.', 'Inspect the corrected spatial fields through the published demonstration.'],
    result: 'The public code and companion page illustrate the modeling workflow and its synthetic outputs.',
    boundary: 'These are synthetic temperature fields. The results are not a validated heatwave forecasting product or evidence of skill on observed climate records.',
    links: [{ label: 'Explore spatial correction', url: 'https://efkopru.github.io/vit-heatwave-calibration/' }, { label: 'View source', url: 'https://github.com/efkopru/vit-heatwave-calibration' }]
  },
  {
    id: 'transformer-bias-correction', title: 'Sequence-based forecast bias correction', type: 'Synthetic-data demonstration', roles: ['data-science', 'software-engineering'],
    summary: 'A PyTorch transformer for learning forecast corrections from simulated time series.',
    context: 'Independent portfolio demonstration', tools: ['Python', 'PyTorch', 'Transformers', 'Time series'],
    problem: 'Systematic errors in forecast time series provide a controlled setting for exploring learned bias correction.',
    contribution: 'I implemented a transformer-based correction workflow using simulated time-series data.',
    approach: ['Construct simulated forecast and reference sequences.', 'Train a PyTorch transformer to learn the correction task.', 'Present the workflow and outputs through a public demonstration.'],
    result: 'The source and companion page provide an inspectable sequence-modeling example.',
    boundary: 'The demonstration uses simulated data. It is separate from the space-time calibration benchmark and is not represented as an operational model.',
    links: [{ label: 'Explore sequence correction', url: 'https://efkopru.github.io/transformer-bias-correction/' }, { label: 'View source', url: 'https://github.com/efkopru/transformer-bias-correction' }]
  },
  {
    id: 'spatial-analysis', title: 'Applied spatial analysis and mapping', type: 'Analysis portfolio', roles: ['data-science'],
    summary: 'Examples spanning accessibility, land cover, terrain, parcel suitability, and network analysis.',
    context: 'Selected historical portfolio examples', tools: ['GIS', 'QGIS', 'Spatial analysis', 'Network analysis', 'Remote sensing'],
    problem: 'Planning and operations questions often require combining location, attributes, terrain, and network relationships.',
    contribution: 'My historical portfolio includes income and attendance-zone mapping, rental-status and code-enforcement comparisons, tree locations, viewsheds, sea-level scenarios, land-cover change, and parcel suitability.',
    approach: ['Combine spatial layers and attributes to address a defined geographic question.', 'Use terrain, network, or change-detection methods where the question requires them.', 'Communicate results through maps and analytical summaries.'],
    result: 'These examples show the breadth of my spatial-analysis work. QGIS examples include OpenStreetMap data retrieval and shortest/fastest-path analysis.',
    boundary: 'The earlier screenshot gallery did not include full methods or reproducible datasets. No causal conclusion, accuracy figure, or new quantitative result is inferred from those images.', links: []
  },
  {
    id: 'crime-analysis', title: 'Automating data delivery for a crime dashboard', type: 'Professional work', roles: ['data-engineering', 'software-engineering'],
    summary: 'An automated SQL Server to ArcGIS Online workflow supporting a crime-trend dashboard.',
    context: 'Historical GIS dashboard portfolio', tools: ['SQL Server', 'ETL', 'ArcGIS Online', 'Dashboards'],
    problem: 'A dashboard needs refreshed spatial data rather than one-off manual exports from its source database.',
    contribution: 'I built a workflow that converts SQL Server tables into ArcGIS Online layers and automates their updates for a crime-trend dashboard.',
    approach: ['Read source records from SQL Server.', 'Convert the tables into GIS layers.', 'Refresh the hosted layers used by the dashboard.'],
    result: 'The update workflow was automated, connecting the database with the layers displayed in the dashboard.',
    boundary: 'This is a reporting and data-delivery example. It makes no predictive-policing or individual-risk claims. Incident-level records and authenticated dashboards are not embedded.', links: []
  },
  {
    id: 'geospatial-processing-tools', title: 'Raster and document processing utilities', type: 'Public code', roles: ['data-engineering', 'software-engineering'],
    summary: 'Python utilities for PDF page conversion and source for raster-processing packaging.',
    context: 'Independent portfolio tools', tools: ['Python', 'GDAL', 'Rasterio', 'Docker', 'PDF processing'],
    problem: 'Geospatial workflows often begin with document conversion or raster preparation before analysis can start.',
    contribution: 'I published PDF conversion utilities and raster-processing packaging examples.',
    approach: ['Convert selected PDF pages with configurable format, DPI, grayscale, and resizing options.', 'Explore Docker and Lambda-layer packaging for raster dependencies.', 'Include GDAL GeoTIFF compression source in the raster-processing repository.'],
    result: 'Both repositories expose source that can be inspected independently of employer systems.',
    boundary: 'The raster work explores dependency packaging and compression. It is not presented as a validated production AWS Lambda deployment.',
    links: [{ label: 'PDF conversion source', url: 'https://github.com/efkopru/pdf-to-image' }, { label: 'Raster packaging source', url: 'https://github.com/efkopru/aws-lambda-rasterio' }]
  }
);

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
