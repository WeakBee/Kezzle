"use client";
import { useState, useEffect } from "react";
import { DndContext, useDraggable } from "@dnd-kit/core";

const size = 5;
const tileSize = 100;
const SNAP_DISTANCE = 40;
const tab = 20;

// 🧠 Generate shape jigsaw
const generateShapes = (size) => {
  const shapes = [];

  for (let row = 0; row < size; row++) {
    shapes[row] = [];

    for (let col = 0; col < size; col++) {
      const top = row === 0 ? 0 : -shapes[row - 1][col].bottom;
      const left = col === 0 ? 0 : -shapes[row][col - 1].right;

      const right = col === size - 1 ? 0 : Math.random() > 0.5 ? 1 : -1;
      const bottom = row === size - 1 ? 0 : Math.random() > 0.5 ? 1 : -1;

      shapes[row][col] = { top, right, bottom, left };
    }
  }

  return shapes;
};

// 🎨 Generate SVG path
const createPath = (shape) => {
  const size = 100;

  let d = `M 0 0 `;

  // TOP
  if (shape.top === 0) d += `H ${size} `;
  else
    d += `H ${size / 2 - tab}
          Q ${size / 2} ${shape.top === 1 ? -tab : tab}
          ${size / 2 + tab} 0
          H ${size} `;

  // RIGHT
  if (shape.right === 0) d += `V ${size} `;
  else
    d += `V ${size / 2 - tab}
          Q ${size + (shape.right === 1 ? tab : -tab)} ${size / 2}
          ${size} ${size / 2 + tab}
          V ${size} `;

  // BOTTOM
  if (shape.bottom === 0) d += `H 0 `;
  else
    d += `H ${size / 2 + tab}
          Q ${size / 2} ${size + (shape.bottom === 1 ? tab : -tab)}
          ${size / 2 - tab} ${size}
          H 0 `;

  // LEFT
  if (shape.left === 0) d += `Z`;
  else
    d += `V ${size / 2 + tab}
          Q ${shape.left === 1 ? -tab : tab} ${size / 2}
          0 ${size / 2 - tab}
          V 0 Z`;

  return d;
};

// 🎮 Main Component
export default function Home() {
  const [tiles, setTiles] = useState([]);
  const [shapes, setShapes] = useState([]);
  const [mounted, setMounted] = useState(false);

  // 🎲 generate tiles (client only)
  const createTiles = () => {
    const boardSize = size * tileSize;

    return Array.from({ length: size * size }, (_, i) => {
      const row = Math.floor(i / size);
      const col = i % size;

      let x, y;

      // 🎯 random posisi DI LUAR board
      const side = Math.floor(Math.random() * 4);

      switch (side) {
        case 0: // kiri
          x = Math.random() * -150;
          y = Math.random() * boardSize;
          break;
        case 1: // kanan
          x = boardSize + Math.random() * 150;
          y = Math.random() * boardSize;
          break;
        case 2: // atas
          x = Math.random() * boardSize;
          y = Math.random() * -150;
          break;
        case 3: // bawah
          x = Math.random() * boardSize;
          y = boardSize + Math.random() * 150;
          break;
      }

      return {
        id: i,
        correctX: col * tileSize,
        correctY: row * tileSize,
        x,
        y,
        locked: false,
        group: i
      };
    });
  };

  const getNeighbors = (id) => {
    const row = Math.floor(id / size);
    const col = id % size;

    return [
      { id: id - size, dir: "top" },
      { id: id + size, dir: "bottom" },
      { id: id - 1, dir: "left" },
      { id: id + 1, dir: "right" },
    ].filter(n => n.id >= 0 && n.id < size * size);
  };

  const trySnapPieces = (tiles) => {
    const SNAP_THRESHOLD = 30;

    let newTiles = [...tiles];

    for (let tile of newTiles) {
      const neighbors = getNeighbors(tile.id);

      for (let n of neighbors) {
        const other = newTiles.find(t => t.id === n.id);
        if (!other) continue;

        // beda posisi seharusnya
        const dx = other.correctX - tile.correctX;
        const dy = other.correctY - tile.correctY;

        // posisi sekarang
        const actualDx = other.x - tile.x;
        const actualDy = other.y - tile.y;

        const dist = Math.hypot(dx - actualDx, dy - actualDy);

        if (dist < SNAP_THRESHOLD) {
          // 🔥 gabung group
          const groupId = tile.group;

          newTiles = newTiles.map(t => {
            if (t.group === other.group) {
              return { ...t, group: groupId };
            }
            return t;
          });
        }
      }
    }

    return newTiles;
  };

  useEffect(() => {
    setTiles(createTiles());
    setShapes(generateShapes(size));
    setMounted(true);
  }, []);

  // 🧲 SNAP LOGIC
  const handleDragEnd = (event) => {
    const { active, delta } = event;

    setTiles((prev) => {
      let updated = prev.map((tile) => {
        if (tile.group !== prev.find(t => t.id === active.id).group) {
          return tile;
        }

        return {
          ...tile,
          x: tile.x + delta.x,
          y: tile.y + delta.y
        };
      });

      // 🔥 SNAP antar piece
      // updated = trySnapPieces(updated);

      // 🔥 SNAP ke posisi benar
      updated = updated.map((tile) => {
        const dist = Math.hypot(
          tile.x - tile.correctX,
          tile.y - tile.correctY
        );

        if (dist < SNAP_DISTANCE) {
          return {
            ...tile,
            x: tile.correctX,
            y: tile.correctY,
            locked: true
          };
        }

        return tile;
      });

      return updated;
    });
  };

  // 🏆 WIN CHECK
  useEffect(() => {
    if (!tiles.length) return;

    const win = tiles.every((t) => t.locked);
    if (win) alert("🎉 Puzzle Selesai!");
  }, [tiles]);

  if (!mounted) return null;

  return (
    <div className="flex flex-col items-center justify-center min-w-[300vw] min-h-[300vh] sm:min-w-screen sm:min-h-screen bg-gray-200">
      <h1 className="text-xl font-bold mb-4 text-black">Kezzle</h1>

      <DndContext onDragEnd={handleDragEnd}>
        <div
          style={{
            width: size * tileSize,
            height: size * tileSize,
            position: "relative",
            border: "2px solid #ccc",
            backgroundColor: "white",
            margin: "400px" // 🔥 ruang buat piece luar
          }}
        >
          {tiles.map((tile) => {
            const row = Math.floor(tile.id / size);
            const col = tile.id % size;
            const shape = shapes[row]?.[col];

            return (
              <Tile
                key={tile.id}
                tile={tile}
                shape={shape}
              />
            );
          })}
        </div>
      </DndContext>
    </div>
  );
}

// 🧩 Tile Component
function Tile({ tile, shape }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: tile.id,
    disabled: tile.locked
  });

  const style = {
    position: "absolute",
    left: tile.x,
    top: tile.y,
    transform: transform
      ? `translate(${transform.x}px, ${transform.y}px)`
      : undefined,
    transition: tile.locked ? "all 0.2s ease" : undefined,
    cursor: tile.locked ? "default" : "grab",
    opacity: tile.locked ? 0.8 : 1
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <svg
        width="100"
        height="100"
        viewBox="0 0 100 100"
        style={{ overflow: "visible" }}
      >
        <defs>
          <clipPath id={`clip-${tile.id}`} clipPathUnits="userSpaceOnUse">
            {shape && <path d={createPath(shape)} />}
          </clipPath>
        </defs>

        {/* IMAGE */}
        <image
          href="/puzzle2.jpg"
          width={size * 100 + tab * 2}
          height={size * 100 + tab * 2}
          x={-(tile.id % size) * 100 - tab}
          y={-Math.floor(tile.id / size) * 100 - tab}
          clipPath={`url(#clip-${tile.id})`}
          preserveAspectRatio="none"
          style={{ imageRendering: "pixelated" }}
        />

        {/* 🔥 BORDER */}
        {shape && (
          <path
            d={createPath(shape)}
            fill="none"
            stroke="black"
            strokeWidth="2"
          />
        )}
      </svg>
    </div>
  );
}