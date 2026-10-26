'use client';

import { useEffect, useRef } from 'react';
import { useMotionValueEvent, useSpring, type MotionValue } from 'motion/react';

export function useScrollVideo(videoRef: React.RefObject<HTMLVideoElement | null>, progress: MotionValue<number>, reduce: boolean | null) {
  const frame = useRef<number | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProgress = useRef(progress.get());
  const lastDirection = useRef(0);
  const smoothProgress = useSpring(progress, { stiffness: 300, damping: 32, mass: 0.25 });

  useMotionValueEvent(progress, 'change', (value) => {
    if (reduce) return;
    const direction = Math.sign(value - lastProgress.current);
    if (direction && lastDirection.current && direction !== lastDirection.current) {
      const current = smoothProgress.get();
      smoothProgress.jump(current);
      smoothProgress.set(value);
    }
    if (direction) lastDirection.current = direction;
    lastProgress.current = value;
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      smoothProgress.stop();
      if (frame.current !== null) {
        cancelAnimationFrame(frame.current);
        frame.current = null;
      }
    }, 180);
  });

  useMotionValueEvent(smoothProgress, 'change', (value) => {
    if (reduce || frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const video = videoRef.current;
      if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
      const time = Math.max(0, Math.min(value, 1)) * video.duration;
      if (Math.abs(video.currentTime - time) > 1 / 30) video.currentTime = time;
    });
  });

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reduce) return;
    const syncTime = () => {
      const time = Math.max(0, Math.min(smoothProgress.get(), 1)) * video.duration;
      if (Number.isFinite(time)) video.currentTime = time;
    };
    video.addEventListener('loadedmetadata', syncTime);
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) syncTime();
    return () => video.removeEventListener('loadedmetadata', syncTime);
  }, [smoothProgress, reduce, videoRef]);

  useEffect(() => () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);
}
