'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import '../styles/starry-background.css';

interface AppLayoutProps {
  children: React.ReactNode;
  currentPage?: string;
}

// Constellation definitions for each day of the week - Scaled to cover whole page
const constellations = {
  0: { // Sunday - Orion (The Hunter)
    name: 'Orion',
    stars: [
      { top: 25, left: 40 }, // Betelgeuse (shoulder)
      { top: 40, left: 35 }, // Bellatrix
      { top: 45, left: 40 }, // Alnitak (belt)
      { top: 45, left: 50 }, // Alnilam (belt)
      { top: 45, left: 60 }, // Mintaka (belt)
      { top: 60, left: 35 }, // Saiph
      { top: 70, left: 55 }, // Rigel (foot)
    ],
    lines: [[0,1], [1,2], [2,3], [3,4], [4,6], [5,2], [6,4]]
  },
  1: { // Monday - Ursa Major (Big Dipper)
    name: 'Ursa Major',
    stars: [
      { top: 20, left: 15 },
      { top: 15, left: 30 },
      { top: 12, left: 45 },
      { top: 18, left: 60 },
      { top: 30, left: 70 },
      { top: 45, left: 65 },
      { top: 55, left: 55 },
    ],
    lines: [[0,1], [1,2], [2,3], [3,4], [4,5], [5,6]]
  },
  2: { // Tuesday - Cassiopeia (W-shaped)
    name: 'Cassiopeia',
    stars: [
      { top: 15, left: 20 },
      { top: 25, left: 35 },
      { top: 15, left: 50 },
      { top: 25, left: 65 },
      { top: 15, left: 80 },
    ],
    lines: [[0,1], [1,2], [2,3], [3,4]]
  },
  3: { // Wednesday - Leo (The Lion)
    name: 'Leo',
    stars: [
      { top: 40, left: 20 }, // Regulus
      { top: 30, left: 30 },
      { top: 20, left: 45 },
      { top: 25, left: 60 },
      { top: 40, left: 65 },
      { top: 55, left: 50 },
    ],
    lines: [[0,1], [1,2], [2,3], [3,4], [4,5], [5,0]]
  },
  4: { // Thursday - Cygnus (Northern Cross)
    name: 'Cygnus',
    stars: [
      { top: 15, left: 50 }, // Deneb (top)
      { top: 40, left: 50 }, // Center
      { top: 70, left: 50 }, // Bottom
      { top: 40, left: 20 }, // Left wing
      { top: 40, left: 80 }, // Right wing
    ],
    lines: [[0,1], [1,2], [3,1], [1,4]]
  },
  5: { // Friday - Scorpius (The Scorpion)
    name: 'Scorpius',
    stars: [
      { top: 40, left: 50 }, // Antares (heart)
      { top: 30, left: 45 },
      { top: 20, left: 35 },
      { top: 50, left: 55 },
      { top: 60, left: 65 },
      { top: 70, left: 75 },
      { top: 80, left: 85 },
    ],
    lines: [[0,1], [1,2], [0,3], [3,4], [4,5], [5,6]]
  },
  6: { // Saturday - Pegasus (The Winged Horse)
    name: 'Pegasus',
    stars: [
      { top: 40, left: 15 },
      { top: 40, left: 45 },
      { top: 70, left: 45 },
      { top: 70, left: 15 },
      { top: 25, left: 30 }, // Wing
    ],
    lines: [[0,1], [1,2], [2,3], [3,0], [1,4]]
  },
};

export default function AppLayout({ children, currentPage }: AppLayoutProps) {
  const [currentConstellation, setCurrentConstellation] = useState<typeof constellations[0] | null>(null);

  useEffect(() => {
    // Get current day of week (0 = Sunday, 6 = Saturday)
    const dayOfWeek = new Date().getDay();
    setCurrentConstellation(constellations[dayOfWeek as keyof typeof constellations]);
  }, []);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Authentic Space Background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* More Regular Stars - Increased quantity */}
        {/* Large Stars */}
        <div className="star star-large bg-white"></div>
        <div className="star star-large bg-blue-200"></div>
        <div className="star star-large bg-cyan-200"></div>
        <div className="star star-large bg-white"></div>
        <div className="star star-large bg-blue-300"></div>
        <div className="star star-large bg-cyan-300"></div>
        <div className="star star-large bg-white"></div>
        <div className="star star-large bg-blue-200"></div>
        <div className="star star-large bg-cyan-200"></div>
        <div className="star star-large bg-white"></div>

        {/* Medium Stars */}
        <div className="star star-medium bg-white"></div>
        <div className="star star-medium bg-blue-400"></div>
        <div className="star star-medium bg-cyan-400"></div>
        <div className="star star-medium bg-white"></div>
        <div className="star star-medium bg-blue-300"></div>
        <div className="star star-medium bg-cyan-300"></div>
        <div className="star star-medium bg-white"></div>
        <div className="star star-medium bg-blue-400"></div>
        <div className="star star-medium bg-cyan-400"></div>
        <div className="star star-medium bg-white"></div>
        <div className="star star-medium bg-blue-300"></div>
        <div className="star star-medium bg-cyan-300"></div>
        <div className="star star-medium bg-white"></div>
        <div className="star star-medium bg-blue-400"></div>
        <div className="star star-medium bg-cyan-400"></div>
        <div className="star star-medium bg-white"></div>
        <div className="star star-medium bg-blue-300"></div>
        <div className="star star-medium bg-cyan-300"></div>
        <div className="star star-medium bg-white"></div>
        <div className="star star-medium bg-blue-400"></div>

        {/* Small Stars */}
        <div className="star star-small bg-white"></div>
        <div className="star star-small bg-blue-500"></div>
        <div className="star star-small bg-cyan-500"></div>
        <div className="star star-small bg-white"></div>
        <div className="star star-small bg-blue-400"></div>
        <div className="star star-small bg-cyan-400"></div>
        <div className="star star-small bg-white"></div>
        <div className="star star-small bg-blue-500"></div>
        <div className="star star-small bg-cyan-500"></div>
        <div className="star star-small bg-white"></div>
        <div className="star star-small bg-blue-400"></div>
        <div className="star star-small bg-cyan-400"></div>
        <div className="star star-small bg-white"></div>
        <div className="star star-small bg-blue-500"></div>
        <div className="star star-small bg-cyan-500"></div>
        <div className="star star-small bg-white"></div>
        <div className="star star-small bg-blue-400"></div>
        <div className="star star-small bg-cyan-400"></div>
        <div className="star star-small bg-white"></div>
        <div className="star star-small bg-blue-500"></div>
        <div className="star star-small bg-cyan-500"></div>
        <div className="star star-small bg-white"></div>
        <div className="star star-small bg-blue-400"></div>
        <div className="star star-small bg-cyan-400"></div>
        <div className="star star-small bg-white"></div>
        <div className="star star-small bg-blue-500"></div>
        <div className="star star-small bg-cyan-500"></div>
        <div className="star star-small bg-white"></div>
        <div className="star star-small bg-blue-400"></div>
        <div className="star star-small bg-cyan-400"></div>
        
        {/* Sharp Twinkling Stars */}
        <div className="star-sharp star-small bg-white"></div>
        <div className="star-sharp star-small bg-cyan-400"></div>
        <div className="star-sharp star-medium bg-white"></div>
        <div className="star-sharp star-small bg-blue-400"></div>
        <div className="star-sharp star-large bg-white"></div>
        <div className="star-sharp star-small bg-cyan-500"></div>
        <div className="star-sharp star-medium bg-white"></div>
        <div className="star-sharp star-small bg-blue-500"></div>
        
        {/* Meteor Shower */}
        <div className="meteor meteor1"></div>
        <div className="meteor meteor2"></div>
        <div className="meteor meteor3"></div>
        <div className="meteor meteor4"></div>
        <div className="meteor meteor5"></div>
        <div className="meteor meteor6"></div>
        
        {/* Shooting Stars */}
        <div className="shooting-star shooting-star1"></div>
        <div className="shooting-star shooting-star2"></div>
        <div className="shooting-star shooting-star3"></div>
        <div className="shooting-star shooting-star4"></div>
        <div className="shooting-star shooting-star5"></div>
        
        {/* Comets */}
        <div className="comet comet1"></div>
        <div className="comet comet2"></div>
        <div className="comet comet3"></div>

        {/* Nebula Clouds */}
        <div className="nebula nebula1"></div>
        <div className="nebula nebula2"></div>
        <div className="nebula nebula3"></div>

        {/* Pulsars */}
        <div className="pulsar pulsar1"></div>
        <div className="pulsar pulsar2"></div>
        <div className="pulsar pulsar3"></div>
        <div className="pulsar pulsar4"></div>

        {/* Aurora Borealis */}
        <div className="aurora aurora1"></div>
        <div className="aurora aurora2"></div>

        {/* Distant Galaxies */}
        <div className="galaxy galaxy1"></div>
        <div className="galaxy galaxy2"></div>
        <div className="galaxy galaxy3"></div>

        {/* Daily Constellation */}
        {currentConstellation && (
          <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
            {/* Constellation connecting lines */}
            {currentConstellation.lines.map((line, idx) => {
              const star1 = currentConstellation.stars[line[0]];
              const star2 = currentConstellation.stars[line[1]];
              return (
                <line
                  key={`line-${idx}`}
                  x1={`${star1.left}%`}
                  y1={`${star1.top}%`}
                  x2={`${star2.left}%`}
                  y2={`${star2.top}%`}
                  stroke="rgba(100, 200, 255, 0.15)"
                  strokeWidth="1"
                  className="constellation-line"
                />
              );
            })}
          </svg>
        )}

        {/* Constellation Stars - Brighter and more visible */}
        {currentConstellation && currentConstellation.stars.map((star, idx) => (
          <div
            key={`constellation-star-${idx}`}
            className="constellation-star"
            style={{
              position: 'absolute',
              top: `${star.top}%`,
              left: `${star.left}%`,
              width: '4px',
              height: '4px',
              background: 'radial-gradient(circle, rgba(255, 255, 255, 1) 0%, rgba(100, 200, 255, 0.8) 50%, transparent 100%)',
              borderRadius: '50%',
              boxShadow: '0 0 8px rgba(100, 200, 255, 0.8), 0 0 12px rgba(100, 200, 255, 0.5)',
              zIndex: 2,
            }}
          />
        ))}

        {/* Constellation Name Label */}
        {currentConstellation && (
          <div
            className="constellation-label"
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              color: 'rgba(100, 200, 255, 0.25)',
              fontSize: '12px',
              fontWeight: '400',
              letterSpacing: '3px',
              textShadow: '0 0 5px rgba(100, 200, 255, 0.2)',
              zIndex: 2,
              pointerEvents: 'none',
              textTransform: 'uppercase',
            }}
          >
            {currentConstellation.name}
          </div>
        )}
      </div>

      {/* Top Navigation Bar */}
      <Sidebar currentPage={currentPage} />

      {/* Main Content */}
      <div className="flex-1 pt-24 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
