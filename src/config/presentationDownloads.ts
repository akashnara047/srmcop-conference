export interface PresentationDocument {
  id: string;
  name: string;
  format: 'E-Poster' | 'Oral' | 'Poster' | 'Shared';
  type: 'template' | 'guidelines';
  filename: string;
  url: string | null; // Kept null until document is officially uploaded
  status: 'available' | 'pending';
  pendingNotice: string;
}

export interface PresentationFormatCardItem {
  id: 'eposter' | 'oral' | 'poster';
  title: string;
  statusBadge: 'ONLINE' | 'OFFLINE';
  badgeColorClass: string;
  description: string;
  imageKey: 'eposterPresentation' | 'oralPresentation' | 'posterPresentation';
  imageAlt: string;
  templateDocId: string;
  guidelinesDocId: string;
}

// Central document registry mapping the 2 templates and 3 guidelines
export const PRESENTATION_DOCUMENTS: Record<string, PresentationDocument> = {
  // Shared Oral and E-Poster template
  'shared-oral-eposter-template': {
    id: 'shared-oral-eposter-template',
    name: 'Shared Oral & E-Poster Template',
    format: 'Shared',
    type: 'template',
    filename: 'AICONDD_2027_Oral_and_EPoster_Template.docx',
    url: null, // Pending Secretariat upload
    status: 'pending',
    pendingNotice: 'The official Oral & E-Poster template will be available for download here upon secretariat release.',
  },
  // Separate Poster template
  'poster-template': {
    id: 'poster-template',
    name: 'Poster Presentation Template',
    format: 'Poster',
    type: 'template',
    filename: 'AICONDD_2027_Poster_Presentation_Template.pptx',
    url: null, // Pending Secretariat upload
    status: 'pending',
    pendingNotice: 'The official Poster template will be available for download here upon secretariat release.',
  },
  // E-Poster Guidelines
  'eposter-guidelines': {
    id: 'eposter-guidelines',
    name: 'E-Poster Guidelines',
    format: 'E-Poster',
    type: 'guidelines',
    filename: 'AICONDD_2027_EPoster_Presentation_Guidelines.pdf',
    url: null, // Pending Secretariat upload
    status: 'pending',
    pendingNotice: 'The official E-Poster Guidelines will be available for download here upon secretariat release.',
  },
  // Oral Presentation Guidelines
  'oral-guidelines': {
    id: 'oral-guidelines',
    name: 'Oral Presentation Guidelines',
    format: 'Oral',
    type: 'guidelines',
    filename: 'AICONDD_2027_Oral_Presentation_Guidelines.pdf',
    url: null, // Pending Secretariat upload
    status: 'pending',
    pendingNotice: 'The official Oral Presentation Guidelines will be available for download here upon secretariat release.',
  },
  // Poster Presentation Guidelines
  'poster-guidelines': {
    id: 'poster-guidelines',
    name: 'Poster Presentation Guidelines',
    format: 'Poster',
    type: 'guidelines',
    filename: 'AICONDD_2027_Poster_Presentation_Guidelines.pdf',
    url: null, // Pending Secretariat upload
    status: 'pending',
    pendingNotice: 'The official Poster Presentation Guidelines will be available for download here upon secretariat release.',
  },
};

// Three presentation cards configuration matching the approved mockup
export const PRESENTATION_CARDS_DATA: PresentationFormatCardItem[] = [
  {
    id: 'eposter',
    title: 'E-Poster Presentation',
    statusBadge: 'ONLINE',
    badgeColorClass: 'bg-[#0284C7] text-white',
    description: 'Present your research digitally through an electronic poster.',
    imageKey: 'eposterPresentation',
    imageAlt: 'E-Poster Presentation - Laptop displaying digital scientific poster',
    templateDocId: 'shared-oral-eposter-template',
    guidelinesDocId: 'eposter-guidelines',
  },
  {
    id: 'oral',
    title: 'Oral Presentation',
    statusBadge: 'OFFLINE',
    badgeColorClass: 'bg-[#10B981] text-white',
    description: 'Present your research in person before the scientific audience.',
    imageKey: 'oralPresentation',
    imageAlt: 'Oral Presentation - Researcher presenting at a conference podium',
    templateDocId: 'shared-oral-eposter-template',
    guidelinesDocId: 'oral-guidelines',
  },
  {
    id: 'poster',
    title: 'Poster Presentation',
    statusBadge: 'ONLINE',
    badgeColorClass: 'bg-[#0284C7] text-white',
    description: 'Showcase your research findings through the poster presentation format.',
    imageKey: 'posterPresentation',
    imageAlt: 'Poster Presentation - Scientific research poster displayed on a conference stand',
    templateDocId: 'poster-template',
    guidelinesDocId: 'poster-guidelines',
  },
];

// Abstract submission 4-step workflow
export const SUBMISSION_STEPS = [
  {
    number: '01',
    title: 'Prepare',
    description: 'Use the official abstract template.',
  },
  {
    number: '02',
    title: 'Choose',
    description: 'Select your presentation format (E-Poster / Oral / Poster).',
  },
  {
    number: '03',
    title: 'Submit',
    description: 'Upload your abstract through the Abstract Portal.',
  },
  {
    number: '04',
    title: 'Track',
    description: 'Check the status using your Abstract ID.',
  },
];
