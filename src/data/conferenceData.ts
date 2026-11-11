export interface Track {
  id: string;
  number: string;
  title: string;
  topics: string[];
  description: string;
  focusArea: string;
  iconType?: string;
  badgeBg?: string;
  badgeText?: string;
}

export interface Speaker {
  id: string;
  name: string;
  titlePrefix: string;
  affiliationPlaceholder: string;
  linkedInUrl: string;
  domain: string;
}

export interface ProgrammeSession {
  timePlaceholder: string;
  title: string;
  hall: string;
  type: 'plenary' | 'keynote' | 'parallel' | 'conclave' | 'quiz' | 'valedictory' | 'inauguration';
  description: string;
}

export const CONFERENCE_INFO = {
  title: 'AI-Powered Innovations in Drug Discovery and Development',
  shortTitle: 'AI-DD2027',
  tagline: 'Transforming Discovery. Accelerating Innovation. Advancing Healthcare.',
  dates: '15–16 February 2027',
  year: '2027',
  location: 'SRM College of Pharmacy, SRMIST, Kattankulathur, Tamil Nadu, India',
  host: 'SRM College of Pharmacy, SRM Institute of Science and Technology',
  collaborator: 'INTI International University, Malaysia',
  auditorium: 'Dr. T. P. Ganesan Auditorium, SRMIST',
  stats: [
    { value: '02', label: 'Conference Days' },
    { value: '03', label: 'Conference Halls' },
    { value: '03', label: 'Invited Speakers' },
    { value: '07', label: 'Scientific Tracks' },
    { value: '100+', label: 'Expected Abstracts' },
  ],
  officialEmails: [
    'dean.pharmacy.ktr@srmist.edu.in',
    'narayanj@srmist.edu.in',
  ],
  registrationFee: 2500,
};

export const SCIENTIFIC_TRACKS: Track[] = [
  {
    id: 'track-01',
    number: '01',
    title: 'Pharmaceutical Technology & Pharmaceutics',
    focusArea: 'Formulation Design & Advanced Drug Delivery',
    description: 'Novel drug delivery systems, nanocarriers, liposomal formulations and advanced pharmaceutical technologies.',
    iconType: 'formulation-pill',
    badgeBg: 'bg-cyan-50',
    badgeText: 'text-[#087E8B]',
    topics: [
      'Novel Drug Delivery Systems & Nanocarriers',
      'Liposomal & Polymeric Formulations',
      'Continuous Manufacturing & Process Analytical Technology',
      'Targeted Drug Delivery Systems',
      'Advanced Pharmaceutical Technologies & 3D Printing',
    ],
  },
  {
    id: 'track-02',
    number: '02',
    title: 'Pharmacology & Experimental Therapeutics',
    focusArea: 'Translational Pharmacology & Disease Biology',
    description: 'Preclinical disease models, mechanistic pharmacology and molecular target validation.',
    iconType: 'dna-target',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-[#7554D9]',
    topics: [
      'Preclinical In Vivo & In Vitro Disease Models',
      'Mechanistic Pharmacology & Signaling Cascades',
      'Molecular Target Identification & Validation',
      'Safety Pharmacology & Predictive Toxicology',
      'Translational Disease Phenotyping & Biomarkers',
    ],
  },
  {
    id: 'track-03',
    number: '03',
    title: 'Pharmaceutical Chemistry & Drug Discovery',
    focusArea: 'Medicinal Chemistry & Generative Molecular Design',
    description: 'Computer-aided drug design, generative AI and molecular discovery.',
    iconType: 'chemistry-flask',
    badgeBg: 'bg-cyan-50',
    badgeText: 'text-[#087E8B]',
    topics: [
      'Computer-Aided Drug Design (CADD) & Structure-Based Design',
      'Generative AI for De Novo Molecular Discovery',
      'Medicinal Chemistry & Hit-to-Lead Optimization',
      'Molecular Docking & Molecular Dynamics Simulations',
      'Automated Retrosynthesis & Chemical Space Exploration',
    ],
  },
  {
    id: 'track-04',
    number: '04',
    title: 'Pharmaceutical Analysis & Analytical Technologies',
    focusArea: 'Spectroscopy, Chromatography & Quality Profiling',
    description: 'Advanced analytical methods, impurity profiling and pharmaceutical quality assessment.',
    iconType: 'analytics-flask',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-[#7554D9]',
    topics: [
      'Advanced HPLC, UPLC, LC-MS & GC-MS Methodologies',
      'Impurity Profiling & Degradation Pathway Characterization',
      'Spectroscopic Characterization (NMR, FTIR, UV-Vis)',
      'Bioanalytical Method Validation & Pharmacokinetics',
      'Pharmaceutical Quality Assessment & Stability Profiling',
    ],
  },
  {
    id: 'track-05',
    number: '05',
    title: 'Pharmacy Practice & Clinical Pharmacy',
    focusArea: 'Hospital Care, Pharmacovigilance & Patient Outcomes',
    description: 'Evidence-based clinical pharmacy, medication safety and patient-centred research.',
    iconType: 'clinical-hospital',
    badgeBg: 'bg-cyan-50',
    badgeText: 'text-[#087E8B]',
    topics: [
      'Evidence-Based Clinical Pharmacy & Ward Interventions',
      'Pharmacovigilance & Adverse Drug Reaction Monitoring',
      'Medication Safety, Stewardship & Error Prevention',
      'Patient-Centred Outcomes & Health-Related Quality of Life',
      'Therapeutic Drug Monitoring (TDM) & Clinical Pharmacogenomics',
    ],
  },
  {
    id: 'track-06',
    number: '06',
    title: 'Pharmacognosy & Natural Product Research',
    focusArea: 'Phytochemistry, Herbal Therapeutics & Ethnobotany',
    description: 'Bioassay-guided fractionation, secondary metabolite characterisation and natural product research.',
    iconType: 'natural-leaf',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-[#D97706]',
    topics: [
      'Bioassay-Guided Fractionation & Isolation',
      'Secondary Metabolite Characterisation & Structural Elucidation',
      'Phytochemistry & Herbal Drug Standardization',
      'Ethnobotany & Traditional Medicine Validation',
      'Natural Product Lead Identification for Drug Discovery',
    ],
  },
  {
    id: 'track-07',
    number: '07',
    title: 'Regulatory Affairs & Pharmaceutical Quality Assurance',
    focusArea: 'Global Compliance, GMP & Dossier Submissions',
    description: 'Global regulatory requirements, pharmaceutical quality systems and compliance.',
    iconType: 'regulatory-scale',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-[#2563EB]',
    topics: [
      'Global Regulatory Filings & CTD/eCTD Dossier Submissions',
      'Pharmaceutical Quality Systems & cGMP Compliance',
      'Regulatory Science for Advanced Therapy Medicinal Products',
      'Quality Risk Management (QRM) & Quality by Design (QbD)',
      'Global Pharmacopoeial Standards & Auditing Frameworks',
    ],
  },
];

export const INVITED_SPEAKERS: Speaker[] = [
  {
    id: 'speaker-1',
    name: 'Dr. Geetha Subramaniam',
    titlePrefix: 'Dr.',
    affiliationPlaceholder: 'Faculty & Distinguished Scientist (Affiliation details will be announced)',
    linkedInUrl: 'https://www.linkedin.com/in/geetha-subramaniam-650b2b41/',
    domain: 'Pharmaceutical Science & Biotechnology',
  },
  {
    id: 'speaker-2',
    name: 'Prof. Claudiu T. Supuran',
    titlePrefix: 'Prof.',
    affiliationPlaceholder: 'Professor & Eminent Researcher (Affiliation details will be announced)',
    linkedInUrl: 'https://www.linkedin.com/in/claudiu-supuran-b0b60643/',
    domain: 'Medicinal Chemistry & Enzyme Inhibition',
  },
  {
    id: 'speaker-3',
    name: 'Maitri Sanghavi',
    titlePrefix: 'Ms.',
    affiliationPlaceholder: 'Senior Bioinformatician & Life Sciences Specialist (Affiliation details will be announced)',
    linkedInUrl: 'https://www.linkedin.com/in/maitri-sanghavi-b572ba66/',
    domain: 'Computational Biology & Clinical Analytics',
  },
];

export const PRESENTATION_FORMATS = [
  {
    id: 'oral',
    format: 'Oral Presentations',
    mode: 'Hybrid (Online & In-Person)',
    location: 'Conference Halls A, B & C',
    description: 'Delivered in dual hybrid mode enabling synchronous international and domestic scientific discourse.',
  },
  {
    id: 'poster',
    format: 'Poster Presentations',
    mode: 'Offline / In-Person Exhibition',
    location: 'Auditorium Exhibition Foyer',
    description: 'Dedicated physical scientific poster boards adjacent to the main auditorium for interactive delegate discussion.',
  },
  {
    id: 'quiz',
    format: 'Scientific Quiz Competition',
    mode: 'Dedicated Conference Session',
    location: 'Main Auditorium Hall',
    description: 'Structured competitive scientific quiz testing advanced pharmaceutical science and AI innovation acumen.',
  },
];

export const PROGRAMME_DAY_1: ProgrammeSession[] = [
  {
    timePlaceholder: 'Morning Session',
    title: 'Inaugural Ceremony & Opening Keynote Address',
    hall: 'Main Hall (Dr. T. P. Ganesan Auditorium)',
    type: 'inauguration',
    description: 'Official conference inauguration, lamp lighting ceremony, welcome address by SRM College of Pharmacy leadership, and opening scientific remarks.',
  },
  {
    timePlaceholder: 'Mid-Morning',
    title: 'Plenary Lectures by Invited International Speakers',
    hall: 'Main Hall',
    type: 'plenary',
    description: 'Keynote scientific deliberations by invited plenary speakers focusing on transformative AI paradigms in molecular drug discovery.',
  },
  {
    timePlaceholder: 'Early Afternoon',
    title: 'Parallel Scientific Sessions – Track Deliberations',
    hall: 'Halls A, B and C',
    type: 'parallel',
    description: 'Simultaneous paper presentations across Track 01, Track 02, and Track 03 evaluated by scientific session chairs.',
  },
  {
    timePlaceholder: 'Afternoon Feature',
    title: 'Industry–Academia Conclave: Connecting Discovery with Application',
    hall: 'Main Hall',
    type: 'conclave',
    description: 'Flagship roundtable dialogue uniting pharmaceutical industry leaders and academic researchers to accelerate translational biotechnology.',
  },
  {
    timePlaceholder: 'Late Afternoon',
    title: 'Hybrid Oral Scientific Paper Presentations',
    hall: 'Halls A, B and C',
    type: 'parallel',
    description: 'Selected peer-reviewed participant oral papers presented in hybrid format for global attendees and onsite judges.',
  },
];

export const PROGRAMME_DAY_2: ProgrammeSession[] = [
  {
    timePlaceholder: 'Morning Session',
    title: 'Invited Expert Lectures & Emerging Paradigms',
    hall: 'Main Hall',
    type: 'keynote',
    description: 'Keynote lectures highlighting novel neurotherapeutics, precision medicine, and high-throughput formulation analytics.',
  },
  {
    timePlaceholder: 'Mid-Morning',
    title: 'Parallel Scientific Sessions – Tracks 04 & 05',
    hall: 'Halls A, B and C',
    type: 'parallel',
    description: 'Focused scientific sessions exploring neuropharmacology, biologics, gene therapy vectors, and clinical toxicology.',
  },
  {
    timePlaceholder: 'Early Afternoon',
    title: 'Offline Poster Presentation & Exhibition Jury Walk',
    hall: 'Auditorium Exhibition Foyer',
    type: 'parallel',
    description: 'Curated scientific poster exhibition, delegate interactions, and evaluation by distinguished poster jury panel.',
  },
  {
    timePlaceholder: 'Afternoon Feature',
    title: 'Scientific Quiz Competition',
    hall: 'Main Hall',
    type: 'quiz',
    description: 'High-energy inter-institutional pharmaceutical scientific quiz competition with audience and delegate engagement.',
  },
  {
    timePlaceholder: 'Evening Session',
    title: 'Valedictory Function, Awards & Closing Remarks',
    hall: 'Main Hall (Dr. T. P. Ganesan Auditorium)',
    type: 'valedictory',
    description: 'Conferment of Best Oral and Poster Paper Awards, certificate distribution, conference report presentation, and vote of thanks.',
  },
];

export interface CommitteeDirectoryItem {
  id: string;
  number: string;
  name: string;
  iconName: 'clipboard' | 'atom' | 'utensils' | 'bus' | 'calendar' | 'music' | 'book' | 'trophy' | 'megaphone';
  convenor?: string;
  members: string[];
  displayMemberCount?: number;
}

export const CHIEF_PATRONS = [
  { name: 'Dr. T. R. Paarivendhar', title: 'Founder Chancellor, SRM Institute of Science and Technology' },
  { name: 'Dr. Ravi Pachamoothoo', title: 'Pro-Chancellor (Administration), SRM Institute of Science and Technology' },
  { name: 'Dr. P. Sathyanarayanan', title: 'Pro-Chancellor (Academics), SRM Institute of Science and Technology' },
];

export const PATRONS = [
  { name: 'Prof. C. Muthamizhchelvan', title: 'Vice Chancellor, SRM Institute of Science and Technology' },
  { name: 'Prof. S. Ponnusamy', title: 'Registrar, SRM Institute of Science and Technology' },
  { name: 'INTI International University Leadership', title: 'Malaysia' },
];

export const CONFERENCE_LEADERSHIP = {
  convenor: {
    title: 'Conference Convenor',
    name: 'Dr. V. Chitra',
    designation: 'Dean, SRM College of Pharmacy, SRMIST',
    institution: 'SRM Institute of Science and Technology (SRMIST)',
  },
  organisingSecretary: {
    title: 'Organising Secretary',
    name: 'Dr. V. Damodharan',
    designation: 'Vice Principal, SRM College of Pharmacy',
    institution: 'SRM Institute of Science and Technology (SRMIST)',
  },
};

export const ORGANISING_COMMITTEES_DIRECTORY: CommitteeDirectoryItem[] = [
  {
    id: 'registration',
    number: '01',
    name: 'Registration Committee',
    iconName: 'clipboard',
    convenor: 'Dr. J. Kavitha',
    displayMemberCount: 4,
    members: [
      'Dr. G.P. Pazhani',
      'Dr. R. Kavitha',
      'Dr. N. Krishna Prabha',
      'Dr. Vineetha R.',
    ],
  },
  {
    id: 'scientific',
    number: '02',
    name: 'Scientific Committee',
    iconName: 'atom',
    convenor: 'Dr. M. G. Rajanandh',
    displayMemberCount: 5,
    members: [
      'Dr. K. Gayathiri',
      'Dr. J. Narayanan',
      'Dr. R. Sri Devi',
      'Dr. K. Kanaka Parvathi',
      'Dr. Nirenjen S.',
    ],
  },
  {
    id: 'catering',
    number: '03',
    name: 'Catering Committee',
    iconName: 'utensils',
    convenor: 'Dr. V. Velmurugan',
    displayMemberCount: 5,
    members: [
      'Dr. V. Velmurugan',
      'Dr. D. Priya',
      'Dr. Rapuru Rushendran',
      'Dr. Gouranga Dutta',
      'Mrs. N. Sridevi',
    ],
  },
  {
    id: 'transport',
    number: '04',
    name: 'Transport and Accommodation Committee',
    iconName: 'bus',
    convenor: 'Dr. V. Manimaran',
    displayMemberCount: 6,
    members: [
      'Dr. T. Sundarrajan',
      'Dr. B. ShanthaKumar',
      'Dr. Nandimandalam Sai Supra Siddhu',
      'Dr. CH Hemanth Kumar',
      'Dr. Chagaleti Bharath Kumar',
    ],
  },
  {
    id: 'inauguration',
    number: '05',
    name: 'Inauguration Committee',
    iconName: 'calendar',
    convenor: 'Prof. S. Sangeetha',
    displayMemberCount: 3,
    members: [
      'Dr. P.N. Remya',
      'Dr. Gandi Sony Pears',
      'Dr. Sruthi Laakshmi M.',
    ],
  },
  {
    id: 'cultural',
    number: '06',
    name: 'Cultural Committee',
    iconName: 'music',
    convenor: 'Dr. M. Sumithra',
    displayMemberCount: 2,
    members: [
      'Dr. A. Priyadharshini',
      'Dr. Kella Alekhya',
    ],
  },
  {
    id: 'souvenir',
    number: '07',
    name: 'Souvenir Committee',
    iconName: 'book',
    convenor: 'Dr. Vijayakumar T. M.',
    displayMemberCount: 3,
    members: [
      'Dr. S. Sarumathy',
      'Dr. S. Sakthi Priyadarsini',
      'Dr. M. Jagadeesan',
    ],
  },
  {
    id: 'sponsorship',
    number: '08',
    name: 'Sponsorship Committee',
    iconName: 'trophy',
    members: [
      'Prof. M. S. Umashankar',
    ],
  },
  {
    id: 'social-media',
    number: '09',
    name: 'Social Media Committee',
    iconName: 'megaphone',
    members: [
      'Dr. J. Narayanan',
    ],
  },
];

// Retain legacy export for backward compatibility
export const COMMITTEES_DATA = [
  { category: 'Chief Patrons', members: CHIEF_PATRONS },
  { category: 'Patrons', members: PATRONS },
];
