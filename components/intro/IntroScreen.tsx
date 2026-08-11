'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ArrowRight, Sparkles } from 'lucide-react';

interface CrowdCanvasProps {
  src?: string;
  rows?: number;
  cols?: number;
}

export const CrowdCanvas: React.FC<CrowdCanvasProps> = ({
  src = '/images/peeps/all-peeps.png',
  rows = 15,
  cols = 7,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const config = { src, rows, cols };

    // UTILS
    const randomRange = (min: number, max: number) => min + Math.random() * (max - min);
    const randomIndex = (array: any[]) => (randomRange(0, array.length) | 0);
    const removeFromArray = (array: any[], i: number) => array.splice(i, 1)[0];
    const removeItemFromArray = (array: any[], item: any) => removeFromArray(array, array.indexOf(item));
    const removeRandomFromArray = (array: any[]) => removeFromArray(array, randomIndex(array));
    const getRandomFromArray = (array: any[]) => array[randomIndex(array) | 0];

    // Helper: Procedural Peep Fallback Generator if image sprite is not present
    const createFallbackSprite = (): HTMLCanvasElement => {
      const spriteCanvas = document.createElement('canvas');
      const tileW = 60;
      const tileH = 120;
      spriteCanvas.width = tileW * rows;
      spriteCanvas.height = tileH * cols;
      const sCtx = spriteCanvas.getContext('2d');
      if (!sCtx) return spriteCanvas;

      const colors = ['#ffffff', '#e2e8f0', '#94a3b8', '#3b82f6', '#a855f7', '#10b981', '#f59e0b'];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = r * tileW;
          const y = c * tileH;
          const color = colors[(r + c) % colors.length];

          sCtx.save();
          sCtx.translate(x + tileW / 2, y + tileH);

          // Body / Shirt
          sCtx.fillStyle = color;
          sCtx.beginPath();
          sCtx.roundRect(-14, -50, 28, 45, [10, 10, 0, 0]);
          sCtx.fill();

          // Head
          sCtx.fillStyle = '#f8fafc';
          sCtx.beginPath();
          sCtx.arc(0, -62, 12, 0, Math.PI * 2);
          sCtx.fill();

          // Hair / Cap detail
          sCtx.fillStyle = '#0f172a';
          sCtx.beginPath();
          sCtx.arc(0, -65, 12, Math.PI, Math.PI * 2);
          sCtx.fill();

          // Legs
          sCtx.strokeStyle = '#64748b';
          sCtx.lineWidth = 4;
          sCtx.beginPath();
          sCtx.moveTo(-6, -5);
          sCtx.lineTo(-6, 0);
          sCtx.moveTo(6, -5);
          sCtx.lineTo(6, 0);
          sCtx.stroke();

          sCtx.restore();
        }
      }
      return spriteCanvas;
    };

    // TWEEN FACTORIES
    const resetPeep = ({ stage, peep }: { stage: any; peep: any }) => {
      const direction = Math.random() > 0.5 ? 1 : -1;
      const offsetY = 100 - 250 * gsap.parseEase('power2.in')(Math.random());
      const startY = stage.height - peep.height + offsetY;
      let startX: number;
      let endX: number;

      if (direction === 1) {
        startX = -peep.width;
        endX = stage.width;
        peep.scaleX = 1;
      } else {
        startX = stage.width + peep.width;
        endX = 0;
        peep.scaleX = -1;
      }

      peep.x = startX;
      peep.y = startY;
      peep.anchorY = startY;

      return { startX, startY, endX };
    };

    const normalWalk = ({ peep, props }: { peep: any; props: any }) => {
      const { startX, startY, endX } = props;
      const xDuration = 10;
      const yDuration = 0.25;

      const tl = gsap.timeline();
      tl.timeScale(randomRange(0.5, 1.5));
      tl.to(peep, { duration: xDuration, x: endX, ease: 'none' }, 0);
      tl.to(peep, { duration: yDuration, repeat: xDuration / yDuration, yoyo: true, y: startY - 10 }, 0);

      return tl;
    };

    const walks = [normalWalk];

    type Peep = {
      image: HTMLImageElement | HTMLCanvasElement;
      rect: number[];
      width: number;
      height: number;
      drawArgs: any[];
      x: number;
      y: number;
      anchorY: number;
      scaleX: number;
      walk: any;
      setRect: (rect: number[]) => void;
      render: (ctx: CanvasRenderingContext2D) => void;
    };

    const createPeep = ({ image, rect }: { image: HTMLImageElement | HTMLCanvasElement; rect: number[] }): Peep => {
      const peep: Peep = {
        image,
        rect: [],
        width: 0,
        height: 0,
        drawArgs: [],
        x: 0,
        y: 0,
        anchorY: 0,
        scaleX: 1,
        walk: null,
        setRect: (rect: number[]) => {
          peep.rect = rect;
          peep.width = rect[2];
          peep.height = rect[3];
          peep.drawArgs = [peep.image, ...rect, 0, 0, peep.width, peep.height];
        },
        render: (ctx: CanvasRenderingContext2D) => {
          ctx.save();
          ctx.translate(peep.x, peep.y);
          ctx.scale(peep.scaleX, 1);
          ctx.drawImage(
            peep.image as any,
            peep.rect[0],
            peep.rect[1],
            peep.rect[2],
            peep.rect[3],
            0,
            0,
            peep.width,
            peep.height
          );
          ctx.restore();
        },
      };

      peep.setRect(rect);
      return peep;
    };

    let activeImage: HTMLImageElement | HTMLCanvasElement;
    const stage = { width: 0, height: 0 };
    const allPeeps: Peep[] = [];
    const availablePeeps: Peep[] = [];
    const crowd: Peep[] = [];

    const createPeeps = () => {
      const { rows, cols } = config;
      const width = (activeImage as any).naturalWidth || activeImage.width;
      const height = (activeImage as any).naturalHeight || activeImage.height;
      const total = rows * cols;
      const rectWidth = width / rows;
      const rectHeight = height / cols;

      for (let i = 0; i < total; i++) {
        allPeeps.push(
          createPeep({
            image: activeImage,
            rect: [(i % rows) * rectWidth, ((i / rows) | 0) * rectHeight, rectWidth, rectHeight],
          })
        );
      }
    };

    const initCrowd = () => {
      while (availablePeeps.length) {
        addPeepToCrowd().walk.progress(Math.random());
      }
    };

    const addPeepToCrowd = () => {
      const peep = removeRandomFromArray(availablePeeps);
      const walk = getRandomFromArray(walks)({
        peep,
        props: resetPeep({ peep, stage }),
      }).eventCallback('onComplete', () => {
        removePeepFromCrowd(peep);
        addPeepToCrowd();
      });

      peep.walk = walk;
      crowd.push(peep);
      crowd.sort((a, b) => a.anchorY - b.anchorY);
      return peep;
    };

    const removePeepFromCrowd = (peep: Peep) => {
      removeItemFromArray(crowd, peep);
      availablePeeps.push(peep);
    };

    const render = () => {
      if (!canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

      crowd.forEach((peep) => {
        peep.render(ctx);
      });

      ctx.restore();
    };

    const resize = () => {
      if (!canvas) return;
      stage.width = canvas.clientWidth;
      stage.height = canvas.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = stage.width * dpr;
      canvas.height = stage.height * dpr;

      crowd.forEach((peep) => {
        if (peep.walk) peep.walk.kill();
      });

      crowd.length = 0;
      availablePeeps.length = 0;
      availablePeeps.push(...allPeeps);

      initCrowd();
    };

    const init = () => {
      createPeeps();
      resize();
      gsap.ticker.add(render);
    };

    const img = document.createElement('img');
    img.onload = () => {
      activeImage = img;
      init();
    };
    img.onerror = () => {
      activeImage = createFallbackSprite();
      init();
    };
    img.src = config.src;

    const handleResize = () => resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      gsap.ticker.remove(render);
      crowd.forEach((peep) => {
        if (peep.walk) peep.walk.kill();
      });
    };
  }, [src, rows, cols]);

  return <canvas ref={canvasRef} className="absolute bottom-0 h-[85vh] w-full pointer-events-none" />;
};

interface IntroScreenProps {
  onComplete: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onComplete }) => {
  const [exiting, setExiting] = useState(false);

  const handleEnter = () => {
    setExiting(true);
    setTimeout(() => {
      onComplete();
    }, 600);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleEnter();
    }, 4500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: exiting ? 0 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
      className="fixed inset-0 z-50 flex flex-col justify-between bg-white text-black overflow-hidden select-none"
    >
      {/* Top Header - BOLD BLACK FONTS AESTHETIC */}
      <div className="relative z-20 pt-16 px-6 text-center max-w-4xl mx-auto space-y-4">
        {/* Sub-tag pill */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-black text-white text-[11px] font-mono tracking-widest uppercase shadow-md"
        >
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          SHARED EXAM CALENDAR FOR STUDENTS
        </motion.div>

        {/* EXAM MATE BOLD TITLE */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tighter text-black uppercase leading-none font-sans"
        >
          EXAM MATE
        </motion.h1>

        {/* AESTHETIC TAGLINE */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-sm sm:text-base font-semibold text-neutral-800 tracking-tight font-mono max-w-md mx-auto"
        >
          NEVER ASK &quot;WHEN&apos;S THE EXAM?&quot; AGAIN.
        </motion.p>
      </div>

      {/* Enter Action Button overlay */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="relative z-30 mb-12 flex justify-center px-4"
      >
        <button
          onClick={handleEnter}
          className="group flex items-center gap-3 px-7 py-3.5 rounded-full bg-black text-white font-bold text-sm hover:bg-neutral-800 transition-all transform hover:scale-105 shadow-2xl cursor-pointer"
        >
          <span>ENTER EXAMMATE</span>
          <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </motion.div>

      {/* Crowd Canvas Animation Layer */}
      <div className="absolute inset-0 z-10">
        <CrowdCanvas src="/images/peeps/all-peeps.png" rows={15} cols={7} />
      </div>
    </motion.div>
  );
};
