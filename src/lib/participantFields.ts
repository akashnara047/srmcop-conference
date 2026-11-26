export const PARTICIPANT_TITLE_OPTIONS = [
  'Mr.',
  'Mrs.',
  'Ms.',
  'Dr.',
  'Prof.',
] as const;

export type ParticipantTitle = (typeof PARTICIPANT_TITLE_OPTIONS)[number];

export const COURSE_PROGRAMME_OPTIONS = [
  'B.Pharm',
  'Pharm.D',
  'M.Pharm',
  'Ph.D',
  'Other Degrees',
] as const;

export type CourseProgramme = (typeof COURSE_PROGRAMME_OPTIONS)[number];

export const DESIGNATION_OPTIONS = [
  'Faculty',
  'Research Scholar',
  'Student',
  'Industry Professional',
  'Others',
] as const;

export type ParticipantDesignation = (typeof DESIGNATION_OPTIONS)[number];

export const FACULTY_DESIGNATION_OPTIONS = [
  'Lecturer',
  'Assistant Professor',
  'Associate Professor',
  'Professor',
] as const;

export type FacultyDesignation = (typeof FACULTY_DESIGNATION_OPTIONS)[number];

export const YEAR_OF_STUDY_OPTIONS_BY_COURSE: Record<string, readonly string[]> = {
  'B.Pharm': ['I Year', 'II Year', 'III Year', 'IV Year'],
  'Pharm.D': ['I Year', 'II Year', 'III Year', 'IV Year', 'V Year', 'VI Year'],
  'M.Pharm': ['I Year', 'II Year'],
};

export interface ParticipantFieldLike {
  title?: string | null;
  fullName?: string | null;
  course?: string | null;
  specialisation?: string | null;
  otherDegree?: string | null;
  designation?: string | null;
  facultyDesignation?: string | null;
  yearOfStudy?: string | null;
  courseOrDesignation?: string | null;
}

export function getYearOfStudyOptions(course?: string | null): readonly string[] {
  const key = (course || '').trim();
  return YEAR_OF_STUDY_OPTIONS_BY_COURSE[key] || [];
}

export function isYearOfStudyApplicable(
  designation?: string | null,
  course?: string | null
): boolean {
  return (designation || '').trim() === 'Student' && getYearOfStudyOptions(course).length > 0;
}

export function formatParticipantDisplayName(
  record?: { title?: string | null; fullName?: string | null } | null,
  fallback = ''
): string {
  const title = (record?.title || '').trim();
  const fullName = (record?.fullName || '').trim();
  if (title && fullName) {
    return `${title} ${fullName}`;
  }
  if (fullName) return fullName;
  if (title) return title;
  return fallback;
}

export function formatCourseProgrammeDisplay(record?: ParticipantFieldLike | null): string {
  const course = (record?.course || '').trim();
  if (!course) return '';
  if (course === 'M.Pharm') {
    const spec = (record?.specialisation || '').trim();
    return spec ? `${course} (${spec})` : course;
  }
  if (course === 'Other Degrees') {
    const other = (record?.otherDegree || '').trim();
    return other ? `${course} (${other})` : course;
  }
  return course;
}

export function formatDesignationDisplay(record?: ParticipantFieldLike | null): string {
  const designation = (record?.designation || '').trim();
  if (!designation) return '';
  if (designation === 'Faculty') {
    const fac = (record?.facultyDesignation || '').trim();
    return fac ? `${designation} (${fac})` : designation;
  }
  if (designation === 'Student') {
    const year = (record?.yearOfStudy || '').trim();
    if (year && isYearOfStudyApplicable(designation, record?.course)) {
      return `${designation} (${year})`;
    }
  }
  return designation;
}

export function formatAcademicProfileSummary(record?: ParticipantFieldLike | null): string {
  if (!record) return '';
  const coursePart = formatCourseProgrammeDisplay(record);
  const designationPart = formatDesignationDisplay(record);
  if (coursePart || designationPart) {
    return [coursePart, designationPart].filter(Boolean).join(' · ');
  }
  return (record.courseOrDesignation || '').trim();
}

export function getParticipantStructuredDetailRows(
  record?: ParticipantFieldLike | null
): Array<{ label: string; value: string }> {
  if (!record) return [];
  const rows: Array<{ label: string; value: string }> = [];
  const course = (record.course || '').trim();
  const specialisation = (record.specialisation || '').trim();
  const otherDegree = (record.otherDegree || '').trim();
  const designation = (record.designation || '').trim();
  const facultyDesignation = (record.facultyDesignation || '').trim();
  const yearOfStudy = (record.yearOfStudy || '').trim();
  const legacyCourseOrDesig = (record.courseOrDesignation || '').trim();

  if (course || designation) {
    if (course) {
      rows.push({ label: 'Course / Programme', value: course });
    }
    if (course === 'M.Pharm' && specialisation) {
      rows.push({ label: 'Specialisation', value: specialisation });
    }
    if (course === 'Other Degrees' && otherDegree) {
      rows.push({ label: 'Other Degree', value: otherDegree });
    }
    if (designation) {
      rows.push({ label: 'Designation', value: designation });
    }
    if (designation === 'Faculty' && facultyDesignation) {
      rows.push({ label: 'Faculty Designation', value: facultyDesignation });
    }
    if (
      designation === 'Student' &&
      isYearOfStudyApplicable(designation, course) &&
      yearOfStudy
    ) {
      rows.push({ label: 'Year of Study', value: yearOfStudy });
    }
  } else if (legacyCourseOrDesig) {
    rows.push({ label: 'Course / Designation', value: legacyCourseOrDesig });
  }

  return rows;
}
