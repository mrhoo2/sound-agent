/**
 * ASHRAE Room Types and Recommended NC Levels
 * Based on ASHRAE Handbook - HVAC Applications Chapter 48: Noise and Vibration Control
 * 
 * NC ratings represent the MAXIMUM recommended background noise level for each space type.
 * Lower NC values indicate quieter requirements.
 */

export interface RoomType {
  id: string;
  name: string;
  category: RoomCategory;
  ncMin: number;      // Minimum recommended NC
  ncMax: number;      // Maximum recommended NC (target)
  description: string;
}

export type RoomCategory = 
  | "residential"
  | "office"
  | "conference"
  | "education"
  | "healthcare"
  | "hospitality"
  | "retail"
  | "worship"
  | "entertainment"
  | "industrial";

export interface RoomCategoryInfo {
  id: RoomCategory;
  name: string;
  icon: string;
}

export const ROOM_CATEGORIES: RoomCategoryInfo[] = [
  { id: "residential", name: "Residential", icon: "🏠" },
  { id: "office", name: "Office", icon: "🏢" },
  { id: "conference", name: "Conference & Meeting", icon: "👥" },
  { id: "education", name: "Education", icon: "🎓" },
  { id: "healthcare", name: "Healthcare", icon: "🏥" },
  { id: "hospitality", name: "Hospitality", icon: "🏨" },
  { id: "retail", name: "Retail & Commercial", icon: "🛒" },
  { id: "worship", name: "Worship & Assembly", icon: "⛪" },
  { id: "entertainment", name: "Entertainment", icon: "🎭" },
  { id: "industrial", name: "Industrial", icon: "🏭" },
];

/**
 * ASHRAE Room Types Database
 * NC ranges based on ASHRAE Handbook recommendations
 */
export const ROOM_TYPES: RoomType[] = [
  // Residential
  {
    id: "bedroom",
    name: "Bedroom",
    category: "residential",
    ncMin: 25,
    ncMax: 30,
    description: "Sleeping areas requiring very quiet conditions",
  },
  {
    id: "living-room",
    name: "Living Room",
    category: "residential",
    ncMin: 30,
    ncMax: 35,
    description: "General living spaces for relaxation and conversation",
  },
  {
    id: "kitchen",
    name: "Kitchen",
    category: "residential",
    ncMin: 35,
    ncMax: 45,
    description: "Food preparation areas with appliance noise",
  },
  {
    id: "bathroom",
    name: "Bathroom",
    category: "residential",
    ncMin: 35,
    ncMax: 45,
    description: "Personal hygiene spaces",
  },

  // Office
  {
    id: "private-office",
    name: "Private Office",
    category: "office",
    ncMin: 30,
    ncMax: 35,
    description: "Executive or single-occupant offices requiring concentration",
  },
  {
    id: "open-office",
    name: "Open Plan Office",
    category: "office",
    ncMin: 40,
    ncMax: 45,
    description: "Open workspaces with multiple occupants",
  },
  {
    id: "reception",
    name: "Reception / Lobby",
    category: "office",
    ncMin: 40,
    ncMax: 45,
    description: "Building entrance and waiting areas",
  },
  {
    id: "corridor",
    name: "Corridor / Hallway",
    category: "office",
    ncMin: 40,
    ncMax: 45,
    description: "Circulation spaces between rooms",
  },

  // Conference & Meeting
  {
    id: "small-conference",
    name: "Small Conference Room",
    category: "conference",
    ncMin: 25,
    ncMax: 30,
    description: "Meeting rooms for 4-10 people",
  },
  {
    id: "large-conference",
    name: "Large Conference Room",
    category: "conference",
    ncMin: 25,
    ncMax: 30,
    description: "Meeting rooms for 10+ people",
  },
  {
    id: "boardroom",
    name: "Executive Boardroom",
    category: "conference",
    ncMin: 20,
    ncMax: 25,
    description: "High-level meeting spaces requiring excellent speech privacy",
  },
  {
    id: "teleconference",
    name: "Video/Teleconference Room",
    category: "conference",
    ncMin: 20,
    ncMax: 25,
    description: "Rooms with AV equipment requiring low background noise",
  },

  // Education
  {
    id: "classroom",
    name: "Classroom",
    category: "education",
    ncMin: 30,
    ncMax: 35,
    description: "Standard teaching spaces",
  },
  {
    id: "lecture-hall",
    name: "Lecture Hall",
    category: "education",
    ncMin: 25,
    ncMax: 30,
    description: "Large instructional spaces",
  },
  {
    id: "library",
    name: "Library",
    category: "education",
    ncMin: 30,
    ncMax: 35,
    description: "Quiet study and reading areas",
  },
  {
    id: "music-room",
    name: "Music Practice Room",
    category: "education",
    ncMin: 25,
    ncMax: 30,
    description: "Spaces for musical instruction and practice",
  },
  {
    id: "gymnasium",
    name: "Gymnasium",
    category: "education",
    ncMin: 45,
    ncMax: 50,
    description: "Indoor sports and physical education spaces",
  },

  // Healthcare
  {
    id: "patient-room",
    name: "Patient Room",
    category: "healthcare",
    ncMin: 25,
    ncMax: 30,
    description: "Inpatient sleeping and recovery rooms",
  },
  {
    id: "operating-room",
    name: "Operating Room",
    category: "healthcare",
    ncMin: 35,
    ncMax: 40,
    description: "Surgical suites with medical equipment",
  },
  {
    id: "exam-room",
    name: "Examination Room",
    category: "healthcare",
    ncMin: 30,
    ncMax: 35,
    description: "Medical examination and consultation spaces",
  },
  {
    id: "waiting-room",
    name: "Waiting Room",
    category: "healthcare",
    ncMin: 40,
    ncMax: 45,
    description: "Patient and visitor waiting areas",
  },
  {
    id: "icu",
    name: "ICU / Critical Care",
    category: "healthcare",
    ncMin: 25,
    ncMax: 30,
    description: "Intensive care units requiring quiet for patient recovery",
  },

  // Hospitality
  {
    id: "hotel-room",
    name: "Hotel Guest Room",
    category: "hospitality",
    ncMin: 30,
    ncMax: 35,
    description: "Standard hotel sleeping accommodations",
  },
  {
    id: "hotel-luxury",
    name: "Luxury Suite",
    category: "hospitality",
    ncMin: 25,
    ncMax: 30,
    description: "Premium hotel accommodations",
  },
  {
    id: "hotel-lobby",
    name: "Hotel Lobby",
    category: "hospitality",
    ncMin: 40,
    ncMax: 45,
    description: "Hotel entrance and reception areas",
  },
  {
    id: "restaurant",
    name: "Restaurant (Fine Dining)",
    category: "hospitality",
    ncMin: 35,
    ncMax: 40,
    description: "Upscale dining establishments",
  },
  {
    id: "restaurant-casual",
    name: "Restaurant (Casual)",
    category: "hospitality",
    ncMin: 40,
    ncMax: 45,
    description: "Casual dining and cafeterias",
  },
  {
    id: "bar-lounge",
    name: "Bar / Lounge",
    category: "hospitality",
    ncMin: 40,
    ncMax: 50,
    description: "Social drinking and entertainment venues",
  },

  // Retail & Commercial
  {
    id: "retail-store",
    name: "Retail Store",
    category: "retail",
    ncMin: 40,
    ncMax: 45,
    description: "General merchandise retail spaces",
  },
  {
    id: "supermarket",
    name: "Supermarket / Grocery",
    category: "retail",
    ncMin: 45,
    ncMax: 50,
    description: "Food retail with refrigeration equipment",
  },
  {
    id: "bank",
    name: "Bank / Financial",
    category: "retail",
    ncMin: 40,
    ncMax: 45,
    description: "Banking halls and financial service offices",
  },

  // Worship & Assembly
  {
    id: "sanctuary",
    name: "Sanctuary / Chapel",
    category: "worship",
    ncMin: 25,
    ncMax: 30,
    description: "Primary worship spaces",
  },
  {
    id: "fellowship-hall",
    name: "Fellowship Hall",
    category: "worship",
    ncMin: 35,
    ncMax: 40,
    description: "Multi-purpose assembly and gathering spaces",
  },
  {
    id: "courtroom",
    name: "Courtroom",
    category: "worship",
    ncMin: 25,
    ncMax: 30,
    description: "Legal proceedings requiring speech intelligibility",
  },

  // Entertainment
  {
    id: "concert-hall",
    name: "Concert Hall",
    category: "entertainment",
    ncMin: 15,
    ncMax: 20,
    description: "Venues for symphonic and classical music",
  },
  {
    id: "theater",
    name: "Theater / Drama",
    category: "entertainment",
    ncMin: 20,
    ncMax: 25,
    description: "Performing arts venues",
  },
  {
    id: "movie-theater",
    name: "Movie Theater",
    category: "entertainment",
    ncMin: 30,
    ncMax: 35,
    description: "Cinema and film screening rooms",
  },
  {
    id: "recording-studio",
    name: "Recording Studio",
    category: "entertainment",
    ncMin: 15,
    ncMax: 20,
    description: "Professional audio recording facilities",
  },
  {
    id: "broadcast-studio",
    name: "Broadcast Studio",
    category: "entertainment",
    ncMin: 20,
    ncMax: 25,
    description: "TV and radio broadcast facilities",
  },

  // Industrial
  {
    id: "factory-light",
    name: "Light Manufacturing",
    category: "industrial",
    ncMin: 50,
    ncMax: 60,
    description: "Assembly and light industrial work",
  },
  {
    id: "factory-heavy",
    name: "Heavy Manufacturing",
    category: "industrial",
    ncMin: 60,
    ncMax: 70,
    description: "Heavy industrial processes with machinery",
  },
  {
    id: "warehouse",
    name: "Warehouse",
    category: "industrial",
    ncMin: 55,
    ncMax: 65,
    description: "Storage and distribution facilities",
  },
  {
    id: "mechanical-room",
    name: "Mechanical Room",
    category: "industrial",
    ncMin: 60,
    ncMax: 70,
    description: "HVAC and building systems equipment rooms",
  },
];

/**
 * Get room types by category
 */
export function getRoomTypesByCategory(category: RoomCategory): RoomType[] {
  return ROOM_TYPES.filter((room) => room.category === category);
}

/**
 * Get a specific room type by ID
 */
export function getRoomTypeById(id: string): RoomType | undefined {
  return ROOM_TYPES.find((room) => room.id === id);
}

/**
 * Get the category info for a room type
 */
export function getCategoryForRoom(roomId: string): RoomCategoryInfo | undefined {
  const room = getRoomTypeById(roomId);
  if (!room) return undefined;
  return ROOM_CATEGORIES.find((cat) => cat.id === room.category);
}

/**
 * Compliance check result
 */
export interface ComplianceResult {
  compliant: boolean;
  equipmentNC: number;
  targetNCMin: number;
  targetNCMax: number;
  margin: number;           // Positive = under target (good), Negative = over target (bad)
  status: "excellent" | "good" | "marginal" | "fail";
  message: string;
}

/**
 * Check if equipment NC rating complies with room requirements
 * 
 * Status levels:
 * - excellent: Equipment is quieter than the minimum recommended (best case)
 * - good: Equipment is within the recommended NC range
 * - marginal: Equipment exceeds target by 1-2 NC points (borderline)
 * - fail: Equipment exceeds target by 3+ NC points
 */
export function checkCompliance(equipmentNC: number, roomType: RoomType): ComplianceResult {
  const margin = roomType.ncMax - equipmentNC;
  const exceedance = equipmentNC - roomType.ncMax;
  
  let status: ComplianceResult["status"];
  let compliant: boolean;
  let message: string;
  
  if (equipmentNC <= roomType.ncMin) {
    // Exceeds requirements (quieter than minimum)
    status = "excellent";
    compliant = true;
    message = `Exceeds requirements by ${roomType.ncMin - equipmentNC} NC points`;
  } else if (equipmentNC <= roomType.ncMax) {
    // Meets requirements (within range)
    status = "good";
    compliant = true;
    message = `Meets requirements with ${margin} NC points margin`;
  } else if (exceedance <= 2) {
    // Marginal (1-2 NC points over - borderline)
    status = "marginal";
    compliant = false;
    message = `Exceeds target by ${exceedance} NC points (borderline)`;
  } else {
    // Fail (3+ NC points over)
    status = "fail";
    compliant = false;
    message = `Exceeds target by ${exceedance} NC points`;
  }
  
  return {
    compliant,
    equipmentNC,
    targetNCMin: roomType.ncMin,
    targetNCMax: roomType.ncMax,
    margin,
    status,
    message,
  };
}

/**
 * Get all room types that an equipment NC would comply with
 */
export function getCompliantRoomTypes(equipmentNC: number): RoomType[] {
  return ROOM_TYPES.filter((room) => equipmentNC <= room.ncMax);
}

/**
 * Get room types grouped by category
 */
export function getRoomTypesGrouped(): Record<RoomCategory, RoomType[]> {
  const grouped = {} as Record<RoomCategory, RoomType[]>;
  
  for (const category of ROOM_CATEGORIES) {
    grouped[category.id] = getRoomTypesByCategory(category.id);
  }
  
  return grouped;
}
