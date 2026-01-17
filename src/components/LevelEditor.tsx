import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  Play, 
  Copy, 
  Trash2, 
  Move, 
  Square, 
  BoxSelect,
  Target,
  Crosshair,
  Package,
  Users,
  MapPin,
  Check,
  Settings
} from 'lucide-react';
import { TileType, Vec2 } from '@/game/types';
import { LevelData, createEmptyLevel, encodeLevelToString, EnemySpawn } from '@/game/levelData';
import { COLORS } from '@/game/config';
import { toast } from 'sonner';

type EditorTool = 'floor' | 'wall' | 'cover' | 'spawn' | 'exit' | 'ammo' | 'enemy' | 'waypoint' | 'erase';

interface LevelEditorProps {
  onBack: () => void;
  onPlayTest: (level: LevelData) => void;
}

export const LevelEditor: React.FC<LevelEditorProps> = ({ onBack, onPlayTest }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [level, setLevel] = useState<LevelData>(() => createEmptyLevel(20, 20));
  const [selectedTool, setSelectedTool] = useState<EditorTool>('floor');
  const [selectedEnemyIndex, setSelectedEnemyIndex] = useState<number | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [levelName, setLevelName] = useState('Untitled Level');
  const [authorName, setAuthorName] = useState('Anonymous');
  const [cameraOffset, setCameraOffset] = useState<Vec2>({ x: 0, y: 0 });
  const [showExportCode, setShowExportCode] = useState(false);
  const [exportCode, setExportCode] = useState('');
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [newWidth, setNewWidth] = useState('20');
  const [newHeight, setNewHeight] = useState('20');

  const tileSize = 28;

  const tools: { id: EditorTool; icon: React.ReactNode; label: string; color: string }[] = [
    { id: 'floor', icon: <Square className="w-4 h-4" />, label: 'Floor', color: '#1a1a2e' },
    { id: 'wall', icon: <BoxSelect className="w-4 h-4" />, label: 'Wall', color: '#2d2d44' },
    { id: 'cover', icon: <Move className="w-4 h-4" />, label: 'Cover', color: '#3d5a5a' },
    { id: 'spawn', icon: <Target className="w-4 h-4" />, label: 'Spawn', color: '#00ff88' },
    { id: 'exit', icon: <Crosshair className="w-4 h-4" />, label: 'Exit', color: '#00d4ff' },
    { id: 'ammo', icon: <Package className="w-4 h-4" />, label: 'Ammo', color: '#ffcc00' },
    { id: 'enemy', icon: <Users className="w-4 h-4" />, label: 'Enemy', color: '#ff4444' },
    { id: 'waypoint', icon: <MapPin className="w-4 h-4" />, label: 'Waypoint', color: '#ff8844' },
    { id: 'erase', icon: <Trash2 className="w-4 h-4" />, label: 'Erase', color: '#666' },
  ];

  const getTileAt = (clientX: number, clientY: number): Vec2 | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left - cameraOffset.x) / tileSize);
    const y = Math.floor((clientY - rect.top - cameraOffset.y) / tileSize);
    
    if (x >= 0 && x < level.gridWidth && y >= 0 && y < level.gridHeight) {
      return { x, y };
    }
    return null;
  };

  const applyTool = useCallback((tile: Vec2) => {
    setLevel(prev => {
      const newGrid = prev.grid.map(row => [...row]);
      const newEnemySpawns = [...prev.enemySpawns];
      let newSpawnPos = prev.spawnPos;
      let newExitPos = prev.exitPos;

      switch (selectedTool) {
        case 'floor':
          newGrid[tile.y][tile.x] = TileType.FLOOR;
          break;
        case 'wall':
          newGrid[tile.y][tile.x] = TileType.WALL;
          break;
        case 'cover':
          newGrid[tile.y][tile.x] = TileType.COVER;
          break;
        case 'ammo':
          newGrid[tile.y][tile.x] = TileType.AMMO;
          break;
        case 'spawn':
          // Clear old spawn
          for (let y = 0; y < prev.gridHeight; y++) {
            for (let x = 0; x < prev.gridWidth; x++) {
              if (newGrid[y][x] === TileType.SPAWN) {
                newGrid[y][x] = TileType.FLOOR;
              }
            }
          }
          newGrid[tile.y][tile.x] = TileType.SPAWN;
          newSpawnPos = { x: tile.x + 0.5, y: tile.y + 0.5 };
          break;
        case 'exit':
          // Clear old exit
          for (let y = 0; y < prev.gridHeight; y++) {
            for (let x = 0; x < prev.gridWidth; x++) {
              if (newGrid[y][x] === TileType.EXIT) {
                newGrid[y][x] = TileType.FLOOR;
              }
            }
          }
          newGrid[tile.y][tile.x] = TileType.EXIT;
          newExitPos = { x: tile.x + 0.5, y: tile.y + 0.5 };
          break;
        case 'enemy':
          // Check if there's already an enemy here
          const existingIdx = newEnemySpawns.findIndex(e => 
            Math.floor(e.pos.x) === tile.x && Math.floor(e.pos.y) === tile.y
          );
          if (existingIdx === -1) {
            newEnemySpawns.push({
              pos: { x: tile.x + 0.5, y: tile.y + 0.5 },
              waypoints: [{ x: tile.x + 0.5, y: tile.y + 0.5 }],
              angle: 0,
            });
            setSelectedEnemyIndex(newEnemySpawns.length - 1);
          } else {
            setSelectedEnemyIndex(existingIdx);
          }
          break;
        case 'waypoint':
          if (selectedEnemyIndex !== null && newEnemySpawns[selectedEnemyIndex]) {
            newEnemySpawns[selectedEnemyIndex] = {
              ...newEnemySpawns[selectedEnemyIndex],
              waypoints: [
                ...newEnemySpawns[selectedEnemyIndex].waypoints,
                { x: tile.x + 0.5, y: tile.y + 0.5 }
              ]
            };
          } else {
            toast.error('Select an enemy first to add waypoints');
          }
          break;
        case 'erase':
          newGrid[tile.y][tile.x] = TileType.FLOOR;
          // Also remove enemy if present
          const enemyIdx = newEnemySpawns.findIndex(e => 
            Math.floor(e.pos.x) === tile.x && Math.floor(e.pos.y) === tile.y
          );
          if (enemyIdx !== -1) {
            newEnemySpawns.splice(enemyIdx, 1);
            if (selectedEnemyIndex === enemyIdx) {
              setSelectedEnemyIndex(null);
            }
          }
          break;
      }

      return {
        ...prev,
        grid: newGrid,
        enemySpawns: newEnemySpawns,
        spawnPos: newSpawnPos,
        exitPos: newExitPos,
      };
    });
  }, [selectedTool, selectedEnemyIndex]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const tile = getTileAt(e.clientX, e.clientY);
    if (tile) {
      setIsDrawing(true);
      applyTool(tile);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const tile = getTileAt(e.clientX, e.clientY);
    if (tile && selectedTool !== 'enemy' && selectedTool !== 'spawn' && selectedTool !== 'exit') {
      applyTool(tile);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleExport = () => {
    const exportLevel: LevelData = {
      ...level,
      name: levelName,
      author: authorName,
      createdAt: Date.now(),
    };
    const code = encodeLevelToString(exportLevel);
    setExportCode(code);
    setShowExportCode(true);
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(exportCode);
      toast.success('Level code copied to clipboard!');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handlePlayTest = () => {
    const testLevel: LevelData = {
      ...level,
      name: levelName,
      author: authorName,
      createdAt: Date.now(),
    };
    onPlayTest(testLevel);
  };

  const handleClearWaypoints = () => {
    if (selectedEnemyIndex !== null) {
      setLevel(prev => {
        const newEnemySpawns = [...prev.enemySpawns];
        if (newEnemySpawns[selectedEnemyIndex]) {
          newEnemySpawns[selectedEnemyIndex] = {
            ...newEnemySpawns[selectedEnemyIndex],
            waypoints: [newEnemySpawns[selectedEnemyIndex].pos]
          };
        }
        return { ...prev, enemySpawns: newEnemySpawns };
      });
    }
  };

  // Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(cameraOffset.x, cameraOffset.y);

    // Draw tiles
    for (let y = 0; y < level.gridHeight; y++) {
      for (let x = 0; x < level.gridWidth; x++) {
        const tile = level.grid[y][x];
        let color = COLORS.floor;
        
        switch (tile) {
          case TileType.WALL: color = COLORS.wall; break;
          case TileType.COVER: color = COLORS.cover; break;
          case TileType.EXIT: color = COLORS.exit; break;
          case TileType.SPAWN: color = COLORS.player; break;
          case TileType.AMMO: color = COLORS.ammo; break;
        }
        
        ctx.fillStyle = color;
        ctx.fillRect(x * tileSize, y * tileSize, tileSize - 1, tileSize - 1);
      }
    }

    // Draw enemies and waypoints
    level.enemySpawns.forEach((enemy, idx) => {
      const isSelected = idx === selectedEnemyIndex;
      
      // Draw waypoint path
      if (enemy.waypoints.length > 1) {
        ctx.strokeStyle = isSelected ? '#ff8844' : '#664422';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(enemy.waypoints[0].x * tileSize, enemy.waypoints[0].y * tileSize);
        enemy.waypoints.forEach(wp => {
          ctx.lineTo(wp.x * tileSize, wp.y * tileSize);
        });
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw waypoint markers
        enemy.waypoints.forEach((wp, wpIdx) => {
          if (wpIdx === 0) return;
          ctx.fillStyle = isSelected ? '#ff8844' : '#664422';
          ctx.beginPath();
          ctx.arc(wp.x * tileSize, wp.y * tileSize, 4, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = '#fff';
          ctx.font = '8px monospace';
          ctx.fillText(String(wpIdx), wp.x * tileSize - 3, wp.y * tileSize + 3);
        });
      }
      
      // Draw enemy
      ctx.fillStyle = isSelected ? '#ff6666' : COLORS.enemy;
      ctx.beginPath();
      ctx.arc(
        enemy.pos.x * tileSize,
        enemy.pos.y * tileSize,
        tileSize / 3,
        0,
        Math.PI * 2
      );
      ctx.fill();
      
      if (isSelected) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    ctx.restore();
  }, [level, cameraOffset, selectedEnemyIndex, tileSize]);

  return (
    <div className="w-screen h-screen bg-background flex">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r border-border p-4 flex flex-col">
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="mb-4 justify-start text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Menu
        </Button>

        <h2 className="text-xl font-bold text-primary mb-4">Level Editor</h2>

        {/* Level info */}
        <div className="space-y-3 mb-6">
          <div>
            <label className="text-xs text-muted-foreground">Level Name</label>
            <Input
              value={levelName}
              onChange={(e) => setLevelName(e.target.value)}
              className="bg-background border-border"
              maxLength={50}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Author</label>
            <Input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="bg-background border-border"
              maxLength={30}
            />
          </div>
        </div>

        {/* Tools */}
        <div className="mb-4">
          <label className="text-xs text-muted-foreground mb-2 block">Tools</label>
          <div className="grid grid-cols-3 gap-1">
            {tools.map(tool => (
              <Button
                key={tool.id}
                variant={selectedTool === tool.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTool(tool.id)}
                className={`flex flex-col h-14 p-1 ${selectedTool === tool.id ? 'bg-primary' : 'border-border'}`}
                title={tool.label}
              >
                <div style={{ color: selectedTool === tool.id ? undefined : tool.color }}>
                  {tool.icon}
                </div>
                <span className="text-[10px] mt-1">{tool.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Enemy info */}
        {selectedEnemyIndex !== null && (
          <div className="bg-background border border-border rounded-lg p-3 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-foreground">
                Enemy #{selectedEnemyIndex + 1}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedEnemyIndex(null)}
                className="h-6 w-6 p-0"
              >
                ✕
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              {level.enemySpawns[selectedEnemyIndex]?.waypoints.length || 0} waypoints
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearWaypoints}
              className="w-full text-xs border-border"
            >
              Clear Waypoints
            </Button>
          </div>
        )}

        <div className="flex-1" />

        {/* Actions */}
        <div className="space-y-2">
          <Button 
            onClick={() => setShowSizeModal(true)}
            variant="outline"
            className="w-full border-border"
          >
            <Settings className="w-4 h-4 mr-2" />
            Resize ({level.gridWidth}×{level.gridHeight})
          </Button>
          <Button 
            onClick={handlePlayTest}
            className="w-full bg-primary hover:bg-primary/80"
          >
            <Play className="w-4 h-4 mr-2" />
            Play Test
          </Button>
          <Button 
            onClick={handleExport}
            variant="outline"
            className="w-full border-accent text-accent hover:bg-accent/10"
          >
            <Copy className="w-4 h-4 mr-2" />
            Export Code
          </Button>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-crosshair"
        />

        {/* Instructions */}
        <div className="absolute bottom-4 left-4 bg-card/90 border border-border rounded-lg p-3 text-xs text-muted-foreground">
          <p>Click/drag to place tiles</p>
          <p>Select <span className="text-primary">Enemy</span> tool, then <span className="text-primary">Waypoint</span> to add patrol paths</p>
        </div>
      </div>

      {/* Export modal */}
      {showExportCode && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-bold text-primary mb-4">Level Code</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Share this code with others so they can play your level!
            </p>
            <textarea
              value={exportCode}
              readOnly
              className="w-full h-32 bg-background border border-border rounded p-2 text-xs font-mono text-foreground resize-none"
            />
            <div className="flex gap-2 mt-4">
              <Button onClick={handleCopyCode} className="flex-1 bg-primary">
                <Copy className="w-4 h-4 mr-2" />
                Copy Code
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowExportCode(false)}
                className="border-border"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Resize modal */}
      {showSizeModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-xl font-bold text-primary mb-4">Resize Level</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Set new dimensions (10-100 tiles). Warning: may crop existing content.
            </p>
            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Width</label>
                <Input
                  type="number"
                  min="10"
                  max="100"
                  value={newWidth}
                  onChange={(e) => setNewWidth(e.target.value)}
                  className="bg-background border-border"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Height</label>
                <Input
                  type="number"
                  min="10"
                  max="100"
                  value={newHeight}
                  onChange={(e) => setNewHeight(e.target.value)}
                  className="bg-background border-border"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  const w = Math.max(10, Math.min(100, parseInt(newWidth) || 20));
                  const h = Math.max(10, Math.min(100, parseInt(newHeight) || 20));
                  setLevel(createEmptyLevel(w, h));
                  setShowSizeModal(false);
                  toast.success(`Level resized to ${w}×${h}`);
                }}
                className="flex-1 bg-primary"
              >
                Apply
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowSizeModal(false)}
                className="border-border"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
