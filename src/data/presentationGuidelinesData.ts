export interface OralSlideItem {
  slideNumber: number;
  sectionTitle: string;
  purpose: string;
}

export const EPOSTER_PRESENTATION_GUIDELINES = {
  title: 'E-Poster Presentation Guidelines',
  subtitle: 'ONLINE • Widescreen 16:9 Single-Slide Official Template',
  mode: 'Online',
  timing: {
    presentationDuration: '8 minutes',
    qaDuration: '2 minutes',
    totalTime: '10 minutes',
  },
  section1Preparation: [
    'Prepare your E-Poster using the official SRMCON 2027 E-Poster PowerPoint template provided by the conference.',
    'Use the widescreen (16:9) slide layout.',
    'The E-Poster must be prepared as a single-slide presentation.',
    'Retain the conference header, institutional logos, three-column layout, dotted separators and conference footer.',
    'Do not remove or distort the official conference branding.',
    'Ensure that all text, images, graphs and tables are clear and readable when viewed on a computer screen.',
  ],
  section2Columns: [
    {
      heading: 'Column 1 – Background and Study Design',
      items: [
        'Title of the research',
        'Name of authors (maximum five)',
        'Institutional affiliations',
        'Introduction / Background',
        'Research Gap',
        'Aim and Objectives',
        'Materials and Methods',
      ],
    },
    {
      heading: 'Column 2 – Results',
      items: [
        'Results and major findings',
        'Tables, graphs, charts and relevant scientific images',
        'Highlight significant observations and key results',
      ],
    },
    {
      heading: 'Column 3 – Interpretation and Conclusions',
      items: [
        'Discussion',
        'Conclusion',
        'Scientific significance and potential applications',
        'Key References',
        'Acknowledgements (if applicable)',
      ],
    },
  ],
  section2Note:
    'The above is a recommended content arrangement. Authors may organise the sections within the three-column structure to suit their research, while ensuring that all essential scientific information is presented.',
  section3AuthorDetails: [
    'The research title should be concise and informative.',
    'A maximum of five authors may be included.',
    'The presenting author should be clearly identifiable.',
    'Include the complete institutional affiliation of all authors.',
    'The Presentation Code must be the Abstract ID assigned by the conference. Do not use the Registration ID as the Presentation Code.',
  ],
  section4OnlinePresentation: [
    'E-Poster presentations will be conducted exclusively in online mode.',
    'Each presenter will be allotted 8 minutes to present the E-Poster.',
    'A further 2 minutes will be allocated for questions and answers.',
    'Total presentation time: 10 minutes.',
    'Presenters should be prepared to explain the research methodology, major findings and scientific significance.',
    'Ensure a stable internet connection, a functional microphone and a suitable presentation device.',
    'Join the online session in advance and follow the instructions provided by the session coordinator.',
  ],
  section5ImportantInstructions: [
    'Use the official E-Poster template without changing its overall layout or conference branding.',
    'Avoid excessive text; use concise scientific explanations.',
    'Use high-quality images, charts and graphs wherever appropriate.',
    'Ensure that all text and visual elements are legible on a standard computer screen.',
    'Check spelling, grammar, author names and institutional affiliations before submission.',
    'The presenting author must be available for the entire allotted presentation and Q&A period.',
  ],
};

export const ORAL_PRESENTATION_GUIDELINES = {
  title: 'Oral Presentation Guidelines',
  subtitle: 'OFFLINE • Official 9-Slide Structure & Scientific Standards',
  duration: {
    presentationMinutes: '8 minutes',
    qaMinutes: '2 minutes',
    totalMinutes: '10 minutes',
    note: 'Presenters must complete their oral presentation strictly within the allotted 8 minutes, followed by a 2-minute Question & Answer (Q&A) session.',
  },
  slideStructure: [
    {
      slideNumber: 1,
      sectionTitle: 'Presentation Title, Authors, Affiliations and Presenting Author',
      purpose: 'Title matching accepted abstract, full author list (max 5), complete affiliations, corresponding author, and presenting author identification.',
    },
    {
      slideNumber: 2,
      sectionTitle: 'Introduction / Background',
      purpose: 'Scientific context, disease/therapeutic background, and rationale of the study.',
    },
    {
      slideNumber: 3,
      sectionTitle: 'Research Gap, Aim & Objectives',
      purpose: 'Clear articulation of the knowledge gap, overall study aim, and specific measurable objectives.',
    },
    {
      slideNumber: 4,
      sectionTitle: 'Methods',
      purpose: 'Experimental, analytical, in-silico, or computational workflow, materials, and evaluation parameters.',
    },
    {
      slideNumber: 5,
      sectionTitle: 'Results',
      purpose: 'Primary experimental/computational datasets presented through legible graphs, tables, or visualisations.',
    },
    {
      slideNumber: 6,
      sectionTitle: 'Results',
      purpose: 'Continued key findings, statistical comparisons, validation outcomes, or mechanistic data.',
    },
    {
      slideNumber: 7,
      sectionTitle: 'Discussion',
      purpose: 'Scientific interpretation of results, structure–activity/mechanistic insights, and comparison with existing literature.',
    },
    {
      slideNumber: 8,
      sectionTitle: 'Discussion',
      purpose: 'Translational relevance, strengths, limitations, and broader pharmaceutical or clinical implications.',
    },
    {
      slideNumber: 9,
      sectionTitle: 'Conclusion and Key References',
      purpose: 'Concise takeaway conclusions, future perspectives, and key peer-reviewed references.',
    },
  ] as OralSlideItem[],
  templateIntegrityRules: [
    'Use only the official conference PowerPoint template (oral-presentation-template.pptx).',
    'Maintain the exact 9-slide sequence outlined above.',
    'Do not remove, cover, or alter the conference identity, institutional logos, or designated Presentation Code area.',
  ],
  authorRules: [
    'A maximum of 5 authors may be listed on Slide 1.',
    'Clearly identify the presenting author (e.g., underline or mark with an asterisk).',
    'Include complete institutional affiliations (department, institution, city, and country) for all authors.',
    'Verify accuracy of every author’s spelling, initials, and affiliation details.',
    'Clearly identify the corresponding / supervising author where applicable.',
  ],
  formattingAndContentRules: [
    'Present scientific content concisely using clear, precise scientific language.',
    'Briefly explain the background and rationale supporting your research study.',
    'Clearly define the research gap, aim, and specific objectives.',
    'Summarise methodology logically so peers can follow experimental or computational steps.',
    'Present key findings cleanly using legible figures, graphs, tables, and high-resolution images.',
    'Ensure all chart axes, labels, units, and legends remain clearly readable from the back of the hall.',
    'Discuss scientific significance, interpretation, and literature comparisons concisely.',
    'Highlight clear study conclusions and translational or future implications.',
    'Include key references on the final slide in a consistent citation format.',
    'Avoid text-heavy slides, full paragraphs, and visual overcrowding — favour bullet points and visuals.',
    'Maintain large, readable font sizes and consistent formatting across all slides.',
    'Carefully verify spelling, scientific terminology, units, and element alignment before finalising.',
  ],
  presentationCodeRules: {
    headline: 'Your Abstract ID is your official Presentation Code',
    points: [
      'Use the exact Abstract ID generated during your abstract submission as your Presentation Code.',
      'Display your Abstract ID clearly in the designated Presentation Code area on every slide.',
      'Do not generate a separate or self-assigned code.',
      'Do not use your Registration ID in place of your Abstract ID.',
      'Keep the Presentation Code unobstructed and clearly visible throughout all 9 slides.',
    ],
  },
};

export const POSTER_PRESENTATION_GUIDELINES = {
  title: 'Poster Presentation Guidelines',
  subtitle: 'OFFLINE • 4 ft Height × 3 ft Width – Portrait Orientation',
  specifications: {
    dimensions: '4 ft Height × 3 ft Width',
    dimensionsShort: '4 ft × 3 ft',
    orientation: 'Portrait Orientation',
    templateNote: 'Prepare using the official conference poster template (poster-presentation-template.pptx).',
    maxAuthors: 'Maximum 5 authors',
    points: [
      'Strictly maintain 4 ft Height × 3 ft Width – Portrait Orientation dimensions.',
      'Use the official conference poster presentation template without altering page proportions.',
      'A maximum of 5 authors may be listed on the poster.',
      'Clearly identify the presenting author among the listed authors.',
      'Include complete institutional affiliations for all authors.',
      'Retain the original conference identity and institutional branding provided in the official template.',
    ],
  },
  requiredSections: [
    'Title of the Presentation',
    'Authors',
    'Affiliation',
    'Abstract',
    'Introduction / Background',
    'Methods',
    'Results',
    'Research Gap',
    'Discussion',
    'Conclusion',
    'References',
  ],
  reservedSpacesNote:
    'Retain the designated spaces provided in the official template for the Presenter’s College Logo and the Presentation Code.',
  contentAndDesignRules: [
    'Use a concise, informative presentation title matching your accepted abstract.',
    'Provide focused background context and clear scientific rationale.',
    'Clearly articulate the research gap addressed by your investigation.',
    'Present your experimental, analytical, or computational methodology logically.',
    'Display key findings effectively using clean graphs, tables, high-resolution images, and diagrams.',
    'Provide a concise discussion linking results to scientific implications, followed by clear conclusions.',
    'Include relevant scientific references in a consistent format.',
    'Ensure a clear, natural reading flow tailored to the 4 ft × 3 ft portrait layout.',
    'Use clean, readable font families and large text sizes easily legible from 1.5–2 metres away.',
    'Avoid excessive narrative paragraphs and visual overcrowding — keep sections scannable.',
    'Use high-resolution graphics and figures so images do not pixelate when printed at full scale.',
    'Maintain consistent alignment, grid structure, margins, and spacing across all poster blocks.',
  ],
  presentationCodeRules: {
    headline: 'Your Abstract ID is your official Presentation Code',
    points: [
      'Use the exact Abstract ID generated during abstract submission as your official Presentation Code.',
      'Display your Abstract ID clearly in the designated Presentation Code area on your poster.',
      'Do not generate a separate or self-assigned code.',
      'Do not use your Registration ID in place of your Abstract ID.',
    ],
  },
  finalPreparationChecklist: [
    'Verify the final poster print dimensions are exactly 4 ft Height × 3 ft Width before sending to print.',
    'Confirm strict Portrait orientation matches the conference poster display board.',
    'Inspect all text, figures, graphs, tables, and institutional logos for crisp legibility at actual print size.',
    'Proofread all author names, presenting author identification, institutional affiliations, and Abstract ID.',
    'Ensure the printed poster is durable and suitable for physical display at the conference venue.',
  ],
};
