/**
 * ASHRAE Integration Module
 * Room type recommendations and compliance checking
 */

export {
  // Types
  type RoomType,
  type RoomCategory,
  type RoomCategoryInfo,
  type ComplianceResult,
  // Data
  ROOM_CATEGORIES,
  ROOM_TYPES,
  // Functions
  getRoomTypesByCategory,
  getRoomTypeById,
  getCategoryForRoom,
  checkCompliance,
  getCompliantRoomTypes,
  getRoomTypesGrouped,
} from "./room-types";
