export type AccommodationCategory = 'Hotel' | 'Guest House' | 'Residency' | 'Homestay';

export interface AccommodationProperty {
  id: string;
  name: string;
  category: AccommodationCategory;
  locality: string;
  address: string;
  phone: string;
  secondaryPhone?: string;
  phoneTypeNote?: string;
  distanceKm: number;
  driveMinutes?: number;
  mapsQuery: string;
  isActive?: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export interface TouristAttraction {
  id: string;
  name: string;
  locality: string;
  description: string;
  distanceKm: number;
  driveMinutes?: number;
  image: string | null;
  mapsQuery: string;
  isActive?: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export const CONFERENCE_VENUE_ORIGIN =
  'Dr. T. P. Ganesan Auditorium, SRM Institute of Science and Technology, Kattankulathur, Tamil Nadu 603203, India';

export function buildGoogleMapsDirectionsUrl(destinationQuery: string): string {
  const params = new URLSearchParams({
    api: '1',
    origin: CONFERENCE_VENUE_ORIGIN,
    destination: destinationQuery,
    travelmode: 'driving',
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function normalizeTelHref(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('+')) return `tel:${cleaned}`;
  if (cleaned.startsWith('0')) {
    return `tel:+91${cleaned.slice(1)}`;
  }
  if (cleaned.length === 10) {
    return `tel:+91${cleaned}`;
  }
  return `tel:${cleaned}`;
}

export function sortAccommodationsByDistance(
  items: AccommodationProperty[],
  mode: 'nearest' | 'farthest' | 'name' = 'nearest'
): AccommodationProperty[] {
  const copy = [...items];
  if (mode === 'farthest') {
    return copy.sort((a, b) => b.distanceKm - a.distanceKm || a.name.localeCompare(b.name));
  }
  if (mode === 'name') {
    return copy.sort((a, b) => a.name.localeCompare(b.name));
  }
  return copy.sort((a, b) => a.distanceKm - b.distanceKm || a.name.localeCompare(b.name));
}

export function sortAttractionsByDistance(
  items: TouristAttraction[]
): TouristAttraction[] {
  return [...items].sort((a, b) => a.distanceKm - b.distanceKm || a.name.localeCompare(b.name));
}

/**
 * Verified Accommodation Directory near SRMIST, Kattankulathur.
 * All road driving distances calculated from Dr. T. P. Ganesan Auditorium (12.8248 N, 80.0467 E)
 * via OSRM road network routing and verified local addresses/telephone numbers.
 */
export const VERIFIED_ACCOMMODATION_PROPERTIES: AccommodationProperty[] = [
  {
    id: 'srm-hotel-potheri',
    name: 'SRM Hotel',
    category: 'Hotel',
    locality: 'Potheri',
    address: 'GST Road / Intra College Road, Potheri, SRM Nagar, Kattankulathur, Tamil Nadu 603203',
    phone: '044 4743 2000',
    secondaryPhone: '+91 95006 62888',
    distanceKm: 0.7,
    driveMinutes: 3,
    mapsQuery: 'SRM Hotel, Potheri, Kattankulathur, Tamil Nadu 603203, India',
    isActive: true,
  },
  {
    id: 'hotel-vassi-palaze',
    name: 'Hotel Vassi Palaze',
    category: 'Hotel',
    locality: 'Kattankulathur',
    address: 'Plot No. 3, CMDA New Town Centre, Kattankulathur, Maraimalai Nagar, Tamil Nadu 603203',
    phone: '044 6749 6949',
    distanceKm: 3.5,
    driveMinutes: 6,
    mapsQuery: 'Hotel Vassi Palaze, CMDA New Town Centre, Kattankulathur, Tamil Nadu 603203, India',
    isActive: true,
  },
  {
    id: 'hotel-sera-grand',
    name: 'Hotel Sera Grand',
    category: 'Hotel',
    locality: 'Maraimalai Nagar',
    address: 'No. 3, CMDA Town Centre, GST Road (NH-45), Maraimalai Nagar, Tamil Nadu 603203',
    phone: '+91 98406 41877',
    distanceKm: 3.5,
    driveMinutes: 6,
    mapsQuery: 'Hotel Sera Grand, CMDA Town Centre, Maraimalai Nagar, Tamil Nadu 603203, India',
    isActive: true,
  },
  {
    id: 'hotel-bakya-slot',
    name: 'Hotel Bakya Slot',
    category: 'Hotel',
    locality: 'Maraimalai Nagar',
    address: 'HIG-41, Vallal MGR Salai, GST Road, Maraimalai Nagar, Tamil Nadu 603209',
    phone: '+91 73050 81971',
    distanceKm: 4.9,
    driveMinutes: 7,
    mapsQuery: 'Hotel Bakya Slot, Vallal MGR Salai, Maraimalai Nagar, Tamil Nadu 603209, India',
    isActive: true,
  },
  {
    id: 'krish-rooms-and-stay',
    name: 'KRISH Rooms and Stay',
    category: 'Guest House',
    locality: 'Maraimalai Nagar',
    address: '156, MIG, NH-1, Vallal Kumanan Street, Maraimalai Nagar, Tamil Nadu 603209',
    phone: '+91 75502 20333',
    distanceKm: 5.2,
    driveMinutes: 7,
    mapsQuery: 'KRISH Rooms and Stay, Vallal Kumanan Street, Maraimalai Nagar, Tamil Nadu 603209, India',
    isActive: true,
  },
  {
    id: 'silverkey-executive-stays-guduvanchery',
    name: 'SilverKey Executive Stays (Rajaji Street)',
    category: 'Hotel',
    locality: 'Guduvanchery',
    address: 'No. 5, Rajaji Street, N.G.O. Colony, Nandivaram-Guduvanchery, Tamil Nadu 603202',
    phone: '+91 124 620 1615',
    phoneTypeNote: 'OYO Central Booking Helpline',
    distanceKm: 5.7,
    driveMinutes: 8,
    mapsQuery: 'SilverKey Executive Stays, No. 5 Rajaji Street, NGO Colony, Guduvanchery, Tamil Nadu 603202, India',
    isActive: true,
  },
  {
    id: 'mithran-residency',
    name: 'Mithran Residency',
    category: 'Residency',
    locality: 'Guduvanchery',
    address: '419/1B, GST Road, Opposite Safaa Apartments, Nandivaram-Guduvanchery, Tamil Nadu 603202',
    phone: '044 2746 1250',
    secondaryPhone: '+91 89393 31331',
    distanceKm: 7.5,
    driveMinutes: 9,
    mapsQuery: 'Mithran Residency, 419/1B GST Road, Nandivaram-Guduvanchery, Tamil Nadu 603202, India',
    isActive: true,
  },
  {
    id: 'lifotel-suites-kk-inn',
    name: 'Lifotel Suites KK INN',
    category: 'Hotel',
    locality: 'Guduvanchery',
    address: 'No. 175, Mahalakshmi Nagar, Nandivaram-Guduvanchery, Tamil Nadu 603202',
    phone: '+91 75320 20204',
    secondaryPhone: '+91 97512 77770',
    distanceKm: 7.7,
    driveMinutes: 11,
    mapsQuery: 'Lifotel Suites KK INN, Mahalakshmi Nagar, Guduvanchery, Tamil Nadu 603202, India',
    isActive: true,
  },
  {
    id: 'rajam-homestays',
    name: 'Rajam Homestays',
    category: 'Homestay',
    locality: 'Urapakkam',
    address: 'Plot 50, Rajam Aadhithyam Block 2, Vaigai Nagar, Urapakkam, Tamil Nadu 603210',
    phone: '+91 97890 77033',
    distanceKm: 8.4,
    driveMinutes: 10,
    mapsQuery: 'Rajam Homestays, Vaigai Nagar, Urapakkam, Tamil Nadu 603210, India',
    isActive: true,
  },
  {
    id: 'revostay-royel-by-crossway',
    name: 'Revostay Royel by Crossway',
    category: 'Hotel',
    locality: 'Urapakkam',
    address: 'S.F. No. 6 & 8, Easwaran Koil Street, Senthil Nagar, Urapakkam, Tamil Nadu 603210',
    phone: '+91 97512 77770',
    phoneTypeNote: 'Crossway Group Reservations',
    distanceKm: 9.7,
    driveMinutes: 10,
    mapsQuery: 'Revostay Royel by Crossway, Senthil Nagar, Urapakkam, Tamil Nadu 603210, India',
    isActive: true,
  },
  {
    id: 'welcomhotel-itc-gst-road',
    name: 'Welcomhotel by ITC Hotels, GST Road',
    category: 'Hotel',
    locality: 'Maraimalai Nagar',
    address: '1, GST Road, Singaperumal Koil, Maraimalai Nagar, Tamil Nadu 603209',
    phone: '+91 44 6741 4243',
    distanceKm: 9.9,
    driveMinutes: 10,
    mapsQuery: 'Welcomhotel by ITC Hotels GST Road, Maraimalai Nagar, Tamil Nadu 603209, India',
    isActive: true,
  },
  {
    id: 'mc-residency',
    name: 'M.C. Residency',
    category: 'Residency',
    locality: 'Urapakkam',
    address: 'No. 13, A & B, GST Road, Kilambakkam, Urapakkam, Tamil Nadu 603211',
    phone: '+91 73587 15191',
    secondaryPhone: '044 2953 5191',
    distanceKm: 10.5,
    driveMinutes: 12,
    mapsQuery: 'M.C. Residency, Kilambakkam, Urapakkam, Tamil Nadu 603211, India',
    isActive: true,
  },
  {
    id: 'jai-residency-urapakkam',
    name: 'Jai Residency',
    category: 'Residency',
    locality: 'Urapakkam',
    address: 'Plot 2/3, GST Road, Opposite Kilambakkam Bus Terminus, Jothi Nagar, Urapakkam, Tamil Nadu 603210',
    phone: '+91 93612 04446',
    distanceKm: 11.3,
    driveMinutes: 14,
    mapsQuery: 'Jai Residency, Opposite Kilambakkam Bus Terminus, Urapakkam, Tamil Nadu 603210, India',
    isActive: true,
  },
];

/**
 * 15 Verified Tourist Attractions around SRMIST & Greater Chennai,
 * sorted ascending by verified road driving distance from Dr. T. P. Ganesan Auditorium.
 * Photographs are authentic Wikimedia Commons / Wikipedia images saved locally; attractions
 * without a verified public photograph use `image: null` (neutral icon header, zero synthetic/AI art).
 */
export const VERIFIED_PLACES_TO_VISIT: TouristAttraction[] = [
  {
    id: 'guduvanchery-lake',
    name: 'Guduvanchery Lake',
    locality: 'Nandivaram-Guduvanchery',
    description: 'Scenic freshwater lake along the GST corridor offering quiet morning walks close to campus.',
    distanceKm: 5.6,
    driveMinutes: 7,
    image: null,
    mapsQuery: 'Guduvanchery Lake, Nandivaram-Guduvanchery, Tamil Nadu, India',
    isActive: true,
  },
  {
    id: 'arignar-anna-zoological-park',
    name: 'Arignar Anna Zoological Park (Vandalur Zoo)',
    locality: 'Vandalur, Chennai',
    description: 'One of South Asia’s largest landscaped zoological parks spanning forested trails and wildlife enclosures.',
    distanceKm: 10.2,
    driveMinutes: 11,
    image: '/images/attractions/vandalur-zoo.jpg',
    mapsQuery: 'Arignar Anna Zoological Park, Vandalur, Chennai, Tamil Nadu, India',
    isActive: true,
  },
  {
    id: 'kishkinta-theme-park',
    name: 'Kishkinta Theme Park',
    locality: 'Tambaram, Chennai',
    description: 'Established water and amusement park tucked amidst green hillocks near West Tambaram.',
    distanceKm: 18.5,
    driveMinutes: 19,
    image: '/images/attractions/kishkinta.jpg',
    mapsQuery: 'Kishkinta Theme Park, Tambaram, Chennai, Tamil Nadu, India',
    isActive: true,
  },
  {
    id: 'covelong-beach',
    name: 'Covelong (Kovalam) Beach',
    locality: 'Kovalam, ECR',
    description: 'Tranquil coastal stretch along East Coast Road known for calm bays and water sports.',
    distanceKm: 33.5,
    driveMinutes: 37,
    image: '/images/attractions/covelong-beach.jpg',
    mapsQuery: 'Covelong Beach, Kovalam, Tamil Nadu, India',
    isActive: true,
  },
  {
    id: 'vgp-marine-kingdom',
    name: 'VGP Marine Kingdom',
    locality: 'Injambakkam, ECR, Chennai',
    description: 'Walk-through underwater oceanarium showcasing pelagic marine life along East Coast Road.',
    distanceKm: 35.0,
    driveMinutes: 35,
    image: '/images/attractions/vgp-marine-kingdom.jpg',
    mapsQuery: 'VGP Marine Kingdom, East Coast Road, Injambakkam, Chennai, Tamil Nadu, India',
    isActive: true,
  },
  {
    id: 'dakshinachitra',
    name: 'DakshinaChitra Heritage Museum',
    locality: 'Muttukadu, ECR',
    description: 'Living museum celebrating traditional South Indian architecture, crafts, and folk heritage.',
    distanceKm: 36.7,
    driveMinutes: 40,
    image: '/images/attractions/dakshinachitra.jpg',
    mapsQuery: 'DakshinaChitra Heritage Museum, Muttukadu, East Coast Road, Tamil Nadu, India',
    isActive: true,
  },
  {
    id: 'madras-crocodile-bank',
    name: 'Madras Crocodile Bank Trust',
    locality: 'Vadanemmeli, ECR',
    description: 'Internationally acclaimed reptile conservation centre and herpetology research sanctuary.',
    distanceKm: 37.0,
    driveMinutes: 40,
    image: '/images/attractions/crocodile-bank.jpg',
    mapsQuery: 'Madras Crocodile Bank Trust, Vadanemmeli, East Coast Road, Tamil Nadu, India',
    isActive: true,
  },
  {
    id: 'government-museum-egmore',
    name: 'Government Museum, Chennai',
    locality: 'Egmore, Chennai',
    description: 'Historic Indo-Saracenic museum complex famed for Chola bronzes and archaeological galleries.',
    distanceKm: 46.0,
    driveMinutes: 40,
    image: '/images/attractions/government-museum.jpg',
    mapsQuery: 'Government Museum, Pantheon Road, Egmore, Chennai, Tamil Nadu, India',
    isActive: true,
  },
  {
    id: 'krishnas-butter-ball',
    name: "Krishna's Butter Ball",
    locality: 'Mahabalipuram (UNESCO Heritage Town)',
    description: 'Iconic 250-ton granite boulder naturally balanced on a smooth stone slope.',
    distanceKm: 46.5,
    driveMinutes: 42,
    image: '/images/attractions/krishnas-butterball.jpg',
    mapsQuery: "Krishna's Butter Ball, Mahabalipuram, Tamil Nadu, India",
    isActive: true,
  },
  {
    id: 'mahabalipuram-lighthouse',
    name: 'Mahabalipuram Lighthouse',
    locality: 'Mahabalipuram (UNESCO Heritage Town)',
    description: 'Historic stone lighthouse perched above ancient Pallava rock-cut caves with panoramic Bay views.',
    distanceKm: 46.6,
    driveMinutes: 43,
    image: '/images/attractions/mahabalipuram-lighthouse.jpg',
    mapsQuery: 'Mahabalipuram Lighthouse, Mahabalipuram, Tamil Nadu, India',
    isActive: true,
  },
  {
    id: 'pancha-rathas',
    name: 'Pancha Rathas (Five Rathas)',
    locality: 'Mahabalipuram (UNESCO World Heritage Site)',
    description: 'Seventh-century monolithic stone shrines carved from single granite outcrops by the Pallavas.',
    distanceKm: 47.1,
    driveMinutes: 43,
    image: '/images/attractions/pancha-rathas.jpg',
    mapsQuery: 'Pancha Rathas, Mahabalipuram, Tamil Nadu, India',
    isActive: true,
  },
  {
    id: 'shore-temple',
    name: 'Shore Temple',
    locality: 'Mahabalipuram (UNESCO World Heritage Site)',
    description: 'Iconic eighth-century Dravidian granite temple complex overlooking the Bay of Bengal.',
    distanceKm: 47.4,
    driveMinutes: 46,
    image: '/images/attractions/shore-temple.jpg',
    mapsQuery: 'Shore Temple, Mahabalipuram, Tamil Nadu, India',
    isActive: true,
  },
  {
    id: 'fort-st-george',
    name: 'Fort St. George',
    locality: 'Rajaji Salai, Chennai',
    description: 'Historic 1644 coastal citadel housing the Fort Museum and St. Mary’s Church.',
    distanceKm: 49.6,
    driveMinutes: 44,
    image: '/images/attractions/fort-st-george.jpg',
    mapsQuery: 'Fort St. George, Chennai, Tamil Nadu, India',
    isActive: true,
  },
  {
    id: 'marina-beach',
    name: 'Marina Beach',
    locality: 'Kamarajar Salai, Chennai',
    description: 'Expansive urban sandy promenade stretching along the Bay of Bengal coast.',
    distanceKm: 49.8,
    driveMinutes: 44,
    image: '/images/attractions/marina-beach.jpg',
    mapsQuery: 'Marina Beach, Kamarajar Salai, Chennai, Tamil Nadu, India',
    isActive: true,
  },
  {
    id: 'kapaleeshwarar-temple',
    name: 'Kapaleeshwarar Temple',
    locality: 'Mylapore, Chennai',
    description: 'Celebrated Dravidian temple featuring an ornate polychrome gopuram and stepped temple tank.',
    distanceKm: 50.4,
    driveMinutes: 46,
    image: '/images/attractions/kapaleeshwarar-temple.jpg',
    mapsQuery: 'Kapaleeshwarar Temple, Mylapore, Chennai, Tamil Nadu, India',
    isActive: true,
  },
];
