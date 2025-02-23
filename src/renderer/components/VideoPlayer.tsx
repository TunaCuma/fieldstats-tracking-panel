// src/renderer/components/VideoPlayer.tsx
/* eslint react/react-in-jsx-scope: "off" */
import { useRef, useEffect, MouseEvent } from 'react';
import type { ReactElement } from 'react';

export interface YoloObject {
  class_id: number;
  confidence: number;
  bbox: number[]; // [x1, y1, x2, y2]
  center: number[];
  color: string;
  source: string;
  transformed_center: number[];
  id?: number; // Optional id for hit testing
}

export interface VideoPlayerProps {
  src: string;
  yoloData: any[]; // Array of frame data with YOLO objects
  onBoxClick: (object: YoloObject) => void;
}

export function VideoPlayer({
  src,
  yoloData,
  onBoxClick,
}: VideoPlayerProps): ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRate = 30; // assumed frame rate

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawOverlay = (): void => {
      if (!video || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const currentFrameIndex = Math.floor(video.currentTime * frameRate);
      const frameData = yoloData.find(
        (frame) => frame.frame_index === currentFrameIndex,
      );
      if (frameData && frameData.objects) {
        frameData.objects.forEach((obj: YoloObject) => {
          const [x1, y1, x2, y2] = obj.bbox;
          ctx.strokeStyle = obj.color;
          ctx.lineWidth = 2;
          ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        });
      }
      // Call requestAnimationFrame without the void operator
      requestAnimationFrame(drawOverlay);
    };

    const onPlay = (): void => {
      canvas.width = video.clientWidth;
      canvas.height = video.clientHeight;
      drawOverlay();
    };

    video.addEventListener('play', onPlay);

    // eslint-disable-next-line consistent-return
    return () => {
      video.removeEventListener('play', onPlay);
    };
  }, [yoloData]);

  const handleCanvasClick = (e: MouseEvent<HTMLCanvasElement>): void => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const currentFrameIndex = Math.floor(video.currentTime * frameRate);
    const frameData = yoloData.find(
      (frame) => frame.frame_index === currentFrameIndex,
    );
    if (frameData && frameData.objects) {
      const clickedObj = frameData.objects.find((obj: YoloObject) => {
        const [x1, y1, x2, y2] = obj.bbox;
        return clickX >= x1 && clickX <= x2 && clickY >= y1 && clickY <= y2;
      });
      if (clickedObj) {
        onBoxClick(clickedObj);
      }
    }
  };

  return (
    <div className="relative">
      <video ref={videoRef} src={src} controls className="w-full">
        <track kind="captions" srcLang="en" label="English captions" />
      </video>
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 pointer-events-auto"
        onClick={handleCanvasClick}
      />
    </div>
  );
}
