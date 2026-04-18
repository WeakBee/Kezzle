"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getUser } from "@/lib/getUser";
import { DndContext, useDraggable } from "@dnd-kit/core";

const tileSize = 100;
const SNAP_DISTANCE = 40;
const tab = 20;

const handleLogout = async () => {
  await supabase.auth.signOut();
  window.location.href = "/";
};

const getRandomAnimeImage = async () => {
  try {
    // 🎲 random page (Jikan biasanya sampai ratusan page)
    const randomPage = Math.floor(Math.random() * 50) + 1;

    const res = await fetch(
      `https://api.jikan.moe/v4/anime?page=${randomPage}`
    );
    const data = await res.json();

    const list = data.data;

    // 🎯 random anime dari page
    const randomAnime =
      list[Math.floor(Math.random() * list.length)];

    return randomAnime.images.jpg.large_image_url;
  } catch (err) {
    console.error("Anime fetch error:", err);

    // fallback kalau error
    return `https://picsum.photos/600/600?random=${Math.random()}`;
  }
};

const getRandomAnimalImage = async () => {
  try {
    const isDog = Math.random() > 0.5;

    if (isDog) {
      const res = await fetch("https://dog.ceo/api/breeds/image/random");
      const data = await res.json();
      return data.message;
    } else {
      const res = await fetch("https://api.thecatapi.com/v1/images/search");
      const data = await res.json();
      return data[0].url;
    }
  } catch (err) {
    console.error("Animal error:", err);
    return `https://picsum.photos/600/600?random=${Math.random()}`;
  }
};

const getRandomGeneralImage = (size) => {
  const dimension = (size * 100) + 200;
  return `https://picsum.photos/${dimension}/${dimension}?random=${Math.random()}`;
};

const getRandomImage = async (size, category) => {
  if (category === "anime") {
    return await getRandomAnimeImage();
  }

  if (category === "animal") {
    return await getRandomAnimalImage();
  }

  return getRandomGeneralImage(size); // default random
};

const formatTime = (time) => {
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

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

const playSound = (sound) => {
  if (!sound) return;
  sound.currentTime = 0;
  sound.play();
};


// 🎮 Main Component
export default function Game() {
  const [tiles, setTiles] = useState([]);
  const [shapes, setShapes] = useState([]);
  const [mounted, setMounted] = useState(false);

  const [size, setSize] = useState(null);
  const [image, setImage] = useState(null);
  const [started, setStarted] = useState(false);

  const [showHint, setShowHint] = useState(false);
  const [loading, setLoading] = useState(false);

  const [roomId, setRoomId] = useState(null);
  const [rooms, setRooms] = useState([]);

  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);

  const [win, setWin] = useState(false);

  const snapSound = typeof Audio !== "undefined" ? new Audio("/music/snap.mp3") : null;
  const winSound = typeof Audio !== "undefined" ? new Audio("/music/win.mp3") : null;

  const [category, setCategory] = useState("");

  const categories = [
    { label: "Random", value: "random" },
    { label: "Anime", value: "anime" },
    { label: "Cats & Dogs", value: "animal" },
  ];

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

  const initNewGame = () => {
    setTiles(createTiles());
    setShapes(generateShapes(size));
  };

  useEffect(() => {
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

      // 🔥 SNAP ke posisi benar
      updated = updated.map((tile) => {
        const dist = Math.hypot(
          tile.x - tile.correctX,
          tile.y - tile.correctY
        );

        if (dist < SNAP_DISTANCE) {
          playSound(snapSound);
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


  useEffect(() => {
    if (!started || !tiles.length || !roomId) return;

    const interval = setInterval(async () => {
      const user = await getUser();
      if (!user) return;

      await supabase.from("games").upsert({
        user_id: user.id,
        room_id: roomId,
        size,
        image,
        tiles,
        shapes, // 🔥 TAMBAH INI
        time,
        is_finished: win,
      }, {
        onConflict: "user_id,room_id",
      });
    }, 200);

    return () => clearInterval(interval);
  }, [tiles, time, win, started]);

  useEffect(() => {
    const loadRooms = async () => {
      const user = await getUser();
      if (!user) return;

      const { data } = await supabase
        .from("games")
        .select("room_id, image, size, time, is_finished")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setRooms(data || []);
    };

    loadRooms();
  }, []);

  // 🏆 WIN CHECK
  useEffect(() => {
    if (!tiles.length) return;

    const win = tiles.every((t) => t.locked);
    if (win) {
      setWin(true);
      playSound(winSound);
    }
  }, [tiles]);

  useEffect(() => {
    if (!running) return;

    const interval = setInterval(() => {
      setTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [running]);

  useEffect(() => {
    if (!tiles.length) return;

    const win = tiles.every((t) => t.locked);
    if (win) {
      setWin(true);
      setRunning(false); // 🔥 STOP TIMER
      playSound(winSound);
    }
  }, [tiles]);

  const createNewRoom = async () => {
    const user = await getUser();
    if (!user) return;

    const newRoomId = crypto.randomUUID();

    const img = await getRandomImage(size, category);

    const initialTiles = createTiles();

    await supabase.from("games").insert({
      user_id: user.id,
      room_id: newRoomId,
      size,
      image: img,
      tiles: initialTiles,
      time: 0,
      is_finished: false,
    });

    setRoomId(newRoomId);
    setImage(img);
    setTiles(initialTiles);
    setTime(0);
    setStarted(true);
    setRunning(true);
    initNewGame();
  };

  const loadRoom = async (room_id) => {
    const user = await getUser();

    const { data } = await supabase
      .from("games")
      .select("*")
      .eq("user_id", user.id)
      .eq("room_id", room_id)
      .single();

    if (data) {
      setIsLoadingSaved(true); // 🔥 penting

      setRoomId(room_id);
      setSize(data.size);
      setImage(data.image);
      setTiles(data.tiles);
      setShapes(data.shapes);
      setTime(data.time);
      setStarted(true);
      setRunning(true);

      setTimeout(() => {
        setIsLoadingSaved(false); // reset lagi setelah ready
      }, 500);
    }
  };

  if (!mounted) return null;

  if (!started) {
    return (
      <div className="fixed inset-0 flex flex-col sm:flex-row gap-4 items-center justify-center bg-black/60 z-50 text-black">
        <div className="bg-white rounded-xl p-6 w-[350px] shadow-xl">
          <h2 className="text-lg font-bold mb-4 text-black">
            Start Puzzle
          </h2>

          {/* SIZE */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Ukuran Puzzle
            </label>
            <select
              className="w-full border rounded px-3 py-2"
              onChange={(e) => setSize(Number(e.target.value))}
            >
              <option value="">Pilih ukuran</option>
              <option value="3">3 x 3</option>
              <option value="4">4 x 4</option>
              <option value="5">5 x 5</option>
              <option value="6">6 x 6</option>
              <option value="7">7 x 7</option>
              <option value="8">8 x 8</option>
              <option value="9">9 x 9</option>
              <option value="10">10 x 10</option>
            </select>
          </div>

          {/* IMAGE */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Pilih Kategori
            </label>

            <select
              className="w-full border rounded px-3 py-2"
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Pilih kategori</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <button
              onClick={createNewRoom}
              className="bg-green-500 text-white px-3 py-2 rounded w-full"
            >
              + Create New Room
            </button>
          </div>

          <button onClick={handleLogout} className="fixed top-4 right-4 bg-red-500 text-white px-3 py-1 rounded">
            Logout
          </button>
        </div>

        <div className="bg-white rounded-xl p-6 w-[350px] shadow-xl">
          <h2 className="text-lg font-bold mb-4 text-black">
            Your Rooms
          </h2>
              {/* test */}
          <div className="mt-4">
            <div className="mt-3 space-y-2 max-h-[200px] overflow-auto">
              {rooms.map((r) => (
                <div
                  key={r.room_id}
                  onClick={() => loadRoom(r.room_id)}
                  className="p-2 bg-gray-100 rounded cursor-pointer hover:bg-gray-200"
                >
                  🎮 Room {r.room_id.slice(0, 6)} <br />
                  ⏱ {formatTime(r.time)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  } else {
    const boardSize = size * tileSize;

    const resetGame = async () => {
      const newImage = await getRandomImage(size, category);

      setImage(newImage);
      setWin(false);
      setTiles(createTiles());
      setShapes(generateShapes(size));
      setTime(0);
      setRunning(true);
    };

    const dynamicMargin = size >= 8 ? 600 : 300;
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gray-200 overflow-hidden sm:min-w-screen sm:min-h-screen ${dynamicMargin === 600
            ? "min-w-[600vw] min-h-[600vh]"
            : "min-w-[300vw] min-h-[300vh]"
          }`}
      >
        {/* HEADER */}
        <h1 className="text-[5rem] font-bold mb-6 text-black mt-40">
          Kezzle
        </h1>

        <div className="bg-black text-white px-4 py-1 rounded">
          ⏱ {formatTime(time)}
        </div>

        {/* BOARD WRAPPER (yang dikasih spacing) */}
        <div className="p-20 pt-0">
          <DndContext onDragEnd={handleDragEnd}>
            <div
              style={{
                width: boardSize + tab - 4,
                height: boardSize + tab - 3,
                position: "relative",
                borderRadius: "16px",
                overflow: "visible",

                // 🪵 texture kayu (nanti kamu ganti url sendiri)
                backgroundImage: "url('/wood-texture.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",

                // 🧱 border realistic
                border: "8px solid #8b5a2b",

                // 🌑 outer shadow (angkat dari background)
                boxShadow: `
                  0 20px 40px rgba(0,0,0,0.3),
                  inset 0 6px 12px rgba(255,255,255,0.2),
                  inset 0 -6px 12px rgba(0,0,0,0.4)
                `,

                margin: `50px ${dynamicMargin * 2}px ${dynamicMargin}px ${dynamicMargin * 2}px`,
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
                    image={image}
                    size={size}
                  />
                );
              })}
            </div>
          </DndContext>
        </div>

        <div className="fixed bottom-6 right-6 z-40">
          {/* 🔘 BUTTON */}
          <div
            onMouseDown={() => setShowHint(true)}
            onMouseUp={() => setShowHint(false)}
            onMouseLeave={() => setShowHint(false)}
            onTouchStart={() => setShowHint(true)}
            onTouchEnd={() => setShowHint(false)}
            className="cursor-pointer select-none"
          >
            <div className="bg-black/70 text-white text-xs px-3 py-1 rounded-t text-center">
              Hold Hint
            </div>

            {/* 🖼 IMAGE PREVIEW */}
            <div className="relative">
              <img
                src={image}
                className={`w-40 h-40 object-cover rounded-b shadow-lg border-2 border-white transition-all duration-200
                  ${showHint ? "opacity-100 scale-100" : "opacity-30 scale-95"}
                `}
              />

              {/* overlay gelap saat hidden */}
              {!showHint && (
                <div className="absolute inset-0 bg-black/40 rounded-b"></div>
              )}
            </div>
          </div>

        </div>

        {win && (
          <div className="fixed inset-0 flex items-center justify-center pt-96 z-50">

            <div className="bg-white p-6 rounded-xl text-center shadow-xl text-black">
              <h2 className="text-2xl font-bold mb-4">🎉 You Win!</h2>

              <div className="bg-black text-white px-4 py-1 rounded mb-2">
                Finish Time : {formatTime(time)}
              </div>

              <div className="flex gap-2 justify-center">
                <button
                  onClick={resetGame}
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                  🔄 Random Image
                </button>

                <button
                  onClick={() => {
                    setStarted(false);
                    setWin(false);
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded"
                >
                  ⚙️ Change Settings
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    );
  }
}

// 🧩 Tile Component
function Tile({ tile, shape, image, size }) {
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
    opacity: 1,
    touchAction: "none", // 🔥 WAJIB buat mobile
    userSelect: "none",
    WebkitUserSelect: "none",

    // ✨ REALISTIC SHADOW
    filter: tile.locked
      ? "drop-shadow(0 2px 2px rgba(0,0,0,0.3))"
      : "drop-shadow(0 6px 8px rgba(0,0,0,0.4))",

    // 🔥 biar keliatan beda saat diangkat
    zIndex: transform ? 10 : tile.locked ? 1 : 5,
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
          href={image} // 🔥 dari state
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
            stroke="rgba(0,0,0,0.25)"
            strokeWidth="1.5"
          />
        )}
      </svg>
    </div>
  );
}