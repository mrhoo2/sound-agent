"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ROOM_CATEGORIES,
  ROOM_TYPES,
  getRoomTypeById,
  getCategoryForRoom,
  checkCompliance,
  type RoomType,
  type ComplianceResult,
} from "@/lib/ashrae";

// BuildVision colors for status indicators
const STATUS_COLORS = {
  excellent: {
    bg: "bg-[#16DA7C]/10",
    border: "border-[#16DA7C]",
    text: "text-[#16DA7C]",
    icon: "✓✓",
    label: "Excellent",
  },
  good: {
    bg: "bg-[#16DA7C]/10",
    border: "border-[#16DA7C]/60",
    text: "text-[#16DA7C]",
    icon: "✓",
    label: "Pass",
  },
  marginal: {
    bg: "bg-[#FFCC17]/10",
    border: "border-[#FFCC17]",
    text: "text-[#FFCC17]",
    icon: "⚠",
    label: "Marginal",
  },
  fail: {
    bg: "bg-[#EC4343]/10",
    border: "border-[#EC4343]",
    text: "text-[#EC4343]",
    icon: "✗",
    label: "Fail",
  },
};

interface ComplianceCheckerProps {
  equipmentNC: number | undefined;
  onRoomTypeChange?: (roomType: RoomType | undefined) => void;
}

export function ComplianceChecker({ equipmentNC, onRoomTypeChange }: ComplianceCheckerProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  
  const selectedRoom = useMemo(() => {
    return selectedRoomId ? getRoomTypeById(selectedRoomId) : undefined;
  }, [selectedRoomId]);
  
  const compliance = useMemo(() => {
    if (equipmentNC === undefined || !selectedRoom) return undefined;
    return checkCompliance(equipmentNC, selectedRoom);
  }, [equipmentNC, selectedRoom]);
  
  const categoryInfo = useMemo(() => {
    if (!selectedRoomId) return undefined;
    return getCategoryForRoom(selectedRoomId);
  }, [selectedRoomId]);
  
  const handleRoomChange = (roomId: string) => {
    setSelectedRoomId(roomId);
    const room = getRoomTypeById(roomId);
    onRoomTypeChange?.(room);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-body-lg font-bold">ASHRAE Compliance Check</CardTitle>
        <CardDescription className="text-body-sm text-muted-foreground">
          Compare equipment noise against ASHRAE room recommendations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Room Type Selector */}
        <div className="space-y-2">
          <Label htmlFor="room-type">Target Room Type</Label>
          <Select value={selectedRoomId} onValueChange={handleRoomChange}>
            <SelectTrigger id="room-type" className="w-full">
              <SelectValue placeholder="Select a room type..." />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {ROOM_CATEGORIES.map((category) => {
                const roomsInCategory = ROOM_TYPES.filter(
                  (room) => room.category === category.id
                );
                if (roomsInCategory.length === 0) return null;
                
                return (
                  <SelectGroup key={category.id}>
                    <SelectLabel className="flex items-center gap-2 text-muted-foreground">
                      <span>{category.icon}</span>
                      <span>{category.name}</span>
                    </SelectLabel>
                    {roomsInCategory.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{room.name}</span>
                          <span className="text-muted-foreground text-micro ml-2">
                            NC {room.ncMin}-{room.ncMax}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Selected Room Info */}
        {selectedRoom && (
          <div className="p-3 rounded-md bg-accent/50 space-y-2">
            <div className="flex items-center gap-2">
              {categoryInfo && <span className="text-lg">{categoryInfo.icon}</span>}
              <span className="font-medium">{selectedRoom.name}</span>
            </div>
            <p className="text-micro text-muted-foreground">{selectedRoom.description}</p>
            <div className="flex items-center gap-4 text-detail">
              <div>
                <span className="text-muted-foreground">Target: </span>
                <span className="font-medium">NC {selectedRoom.ncMin}-{selectedRoom.ncMax}</span>
              </div>
              {equipmentNC !== undefined && (
                <div>
                  <span className="text-muted-foreground">Equipment: </span>
                  <span className="font-medium">NC {equipmentNC}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Compliance Result */}
        {compliance && (
          <ComplianceResultDisplay result={compliance} roomType={selectedRoom!} />
        )}

        {/* No NC Rating Message */}
        {selectedRoom && equipmentNC === undefined && (
          <div className="p-4 rounded-md border border-dashed border-muted-foreground/30 text-center">
            <p className="text-body-sm text-muted-foreground">
              Enter sound data above to check compliance with {selectedRoom.name}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ComplianceResultDisplayProps {
  result: ComplianceResult;
  roomType: RoomType;
}

function ComplianceResultDisplay({ result, roomType }: ComplianceResultDisplayProps) {
  const statusStyle = STATUS_COLORS[result.status];
  
  return (
    <div className={`p-4 rounded-lg border-2 ${statusStyle.bg} ${statusStyle.border}`}>
      {/* Status Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-bold ${statusStyle.text}`}>
            {statusStyle.icon}
          </span>
          <span className={`text-body-lg font-bold ${statusStyle.text}`}>
            {statusStyle.label}
          </span>
        </div>
        <div className="text-right">
          <div className={`text-h5 font-bold ${statusStyle.text}`}>
            NC {result.equipmentNC}
          </div>
          <div className="text-micro text-muted-foreground">
            Equipment Rating
          </div>
        </div>
      </div>

      {/* Visual Bar */}
      <div className="mb-3">
        <NCComplianceBar 
          equipmentNC={result.equipmentNC} 
          targetMin={result.targetNCMin} 
          targetMax={result.targetNCMax}
          status={result.status}
        />
      </div>

      {/* Message */}
      <p className="text-body-sm">{result.message}</p>

      {/* Margin Details */}
      <div className="mt-3 pt-3 border-t border-current/10 grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-micro text-muted-foreground">Target Range</div>
          <div className="font-medium text-detail">NC {roomType.ncMin}-{roomType.ncMax}</div>
        </div>
        <div>
          <div className="text-micro text-muted-foreground">Equipment</div>
          <div className="font-medium text-detail">NC {result.equipmentNC}</div>
        </div>
        <div>
          <div className="text-micro text-muted-foreground">Margin</div>
          <div className={`font-medium text-detail ${result.margin >= 0 ? 'text-[#16DA7C]' : 'text-[#EC4343]'}`}>
            {result.margin >= 0 ? '+' : ''}{result.margin} NC
          </div>
        </div>
      </div>
    </div>
  );
}

interface NCComplianceBarProps {
  equipmentNC: number;
  targetMin: number;
  targetMax: number;
  status: ComplianceResult["status"];
}

function NCComplianceBar({ equipmentNC, targetMin, targetMax, status }: NCComplianceBarProps) {
  // Calculate positions (scale from NC 15 to NC 70)
  const minNC = 15;
  const maxNC = 70;
  const range = maxNC - minNC;
  
  const targetMinPos = ((targetMin - minNC) / range) * 100;
  const targetMaxPos = ((targetMax - minNC) / range) * 100;
  const equipmentPos = Math.min(100, Math.max(0, ((equipmentNC - minNC) / range) * 100));
  
  const statusStyle = STATUS_COLORS[status];
  
  return (
    <div className="relative h-8 bg-muted rounded-md overflow-hidden">
      {/* Target range (green zone) */}
      <div 
        className="absolute h-full bg-[#16DA7C]/20"
        style={{
          left: `${targetMinPos}%`,
          width: `${targetMaxPos - targetMinPos}%`,
        }}
      />
      
      {/* Excellent zone (below target min) */}
      <div 
        className="absolute h-full bg-[#16DA7C]/10"
        style={{
          left: '0%',
          width: `${targetMinPos}%`,
        }}
      />
      
      {/* Target min marker */}
      <div 
        className="absolute h-full w-0.5 bg-[#16DA7C]"
        style={{ left: `${targetMinPos}%` }}
      />
      
      {/* Target max marker */}
      <div 
        className="absolute h-full w-0.5 bg-[#16DA7C]"
        style={{ left: `${targetMaxPos}%` }}
      />
      
      {/* Equipment position marker */}
      <div 
        className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md ${
          status === 'excellent' || status === 'good' ? 'bg-[#16DA7C]' : 
          status === 'marginal' ? 'bg-[#FFCC17]' : 'bg-[#EC4343]'
        }`}
        style={{ left: `calc(${equipmentPos}% - 8px)` }}
      />
      
      {/* Scale labels */}
      <div className="absolute bottom-0 left-0 text-micro text-muted-foreground px-1">15</div>
      <div className="absolute bottom-0 right-0 text-micro text-muted-foreground px-1">70</div>
    </div>
  );
}

/**
 * Compact compliance indicator for inline use
 */
interface ComplianceIndicatorProps {
  status: ComplianceResult["status"];
  showLabel?: boolean;
}

export function ComplianceIndicator({ status, showLabel = true }: ComplianceIndicatorProps) {
  const statusStyle = STATUS_COLORS[status];
  
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${statusStyle.bg}`}>
      <span className={statusStyle.text}>{statusStyle.icon}</span>
      {showLabel && (
        <span className={`text-micro font-medium ${statusStyle.text}`}>
          {statusStyle.label}
        </span>
      )}
    </div>
  );
}
