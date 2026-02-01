"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

interface ShootingStar {
  id: number;
  startX: number;
  startY: number;
  duration: number;
}

export default function StarField() {
  const [stars, setStars] = useState<Star[]>([]);
  const [shootingStars, setShootingStars] = useState<ShootingStar[]>([]);

  useEffect(() => {
    // Generate random stars
    const generatedStars: Star[] = [];
    for (let i = 0; i < 150; i++) {
      generatedStars.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 1,
        duration: Math.random() * 3 + 2,
        delay: Math.random() * 5,
      });
    }
    setStars(generatedStars);

    // Generate shooting stars periodically
    const shootingInterval = setInterval(() => {
      const newShootingStar: ShootingStar = {
        id: Date.now(),
        startX: Math.random() * 50,
        startY: Math.random() * 30,
        duration: Math.random() * 1 + 0.5,
      };

      setShootingStars((prev) => [...prev, newShootingStar]);

      // Remove shooting star after animation
      setTimeout(() => {
        setShootingStars((prev) =>
          prev.filter((s) => s.id !== newShootingStar.id)
        );
      }, 2000);
    }, 8000);

    return () => clearInterval(shootingInterval);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 20% 20%, rgba(11, 61, 145, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(255, 107, 53, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(11, 61, 145, 0.05) 0%, transparent 70%),
            linear-gradient(180deg, #0a0e1a 0%, #0d1526 50%, #0a0e1a 100%)
          `,
        }}
      />

      {/* Stars */}
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
          }}
          animate={{
            opacity: [0.3, 1, 0.3],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: star.duration,
            repeat: Infinity,
            delay: star.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Shooting stars */}
      {shootingStars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute"
          style={{
            left: `${star.startX}%`,
            top: `${star.startY}%`,
          }}
          initial={{ opacity: 0, x: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            x: 300,
            y: 300,
          }}
          transition={{
            duration: star.duration,
            ease: "linear",
          }}
        >
          {/* Shooting star trail */}
          <div
            className="relative"
            style={{
              width: "100px",
              height: "2px",
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.8) 50%, white 100%)",
              transform: "rotate(45deg)",
              transformOrigin: "right center",
              boxShadow: "0 0 10px rgba(255,255,255,0.5)",
            }}
          />
        </motion.div>
      ))}

      {/* Subtle nebula clouds */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `
            radial-gradient(circle at 70% 30%, rgba(11, 61, 145, 0.2) 0%, transparent 30%),
            radial-gradient(circle at 30% 70%, rgba(255, 107, 53, 0.1) 0%, transparent 25%)
          `,
        }}
      />
    </div>
  );
}
