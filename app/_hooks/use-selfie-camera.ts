"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Урд камераар selfie авах. Unmount үед урсгалыг хаана. */
export function useSelfieCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [photo, setPhoto] = useState("");
  const [error, setError] = useState("");

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const open = useCallback(async () => {
    setError("");
    setIsOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setError(
        "Камерын зөвшөөрөл олгогдсонгүй. Demo selfie ашиглан алхмыг үргэлжлүүлж болно.",
      );
    }
  }, []);

  /** Амжилттай бол true буцаана. */
  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      setError("Камерын дүрс хараахан бэлэн болоогүй байна.");
      return false;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    setPhoto(canvas.toDataURL("image/jpeg", 0.72));
    releaseStream();
    setIsOpen(false);
    return true;
  }, [releaseStream]);

  const close = useCallback(() => {
    releaseStream();
    setIsOpen(false);
    setError("");
  }, [releaseStream]);

  const reset = useCallback(() => {
    close();
    setPhoto("");
  }, [close]);

  useEffect(() => releaseStream, [releaseStream]);

  return { videoRef, isOpen, photo, error, open, capture, close, reset };
}
