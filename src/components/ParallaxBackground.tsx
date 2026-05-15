import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

export const ParallaxBackground = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dome1Ref = useRef<HTMLDivElement>(null);
  const dome2Ref = useRef<HTMLDivElement>(null);
  const dome3Ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Dome 1 Animation (Primary Color)
    gsap.to(dome1Ref.current, {
      x: "10vw",
      y: "15vh",
      scale: 1.2,
      duration: 12,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });

    // Dome 2 Animation (Accent Color)
    gsap.to(dome2Ref.current, {
      x: "-15vw",
      y: "-10vh",
      scale: 1.1,
      duration: 15,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
      delay: -5,
    });

    // Dome 3 Animation (Mint/Secondary Color)
    gsap.to(dome3Ref.current, {
      x: "5vw",
      y: "-15vh",
      scale: 1.3,
      duration: 18,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
      delay: -10,
    });
  }, { scope: containerRef });

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {/* Background container to ensure domes stay behind everything */}
      <div className="absolute inset-0 w-full h-full opacity-60 dark:opacity-40">

        {/* Dome 1: Primary Pink/Red */}
        <div
          ref={dome1Ref}
          className="absolute top-[-10%] left-[10%] w-[40vw] h-[40vw] rounded-full bg-primary/30 mix-blend-multiply dark:mix-blend-screen blur-[80px]"
        />

        {/* Dome 2: Warm/Yellowish Accent */}
        <div
          ref={dome2Ref}
          className="absolute top-[40%] left-[60%] w-[35vw] h-[35vw] rounded-full bg-[hsl(30,80%,70%)]/30 mix-blend-multiply dark:mix-blend-screen blur-[80px]"
        />

        {/* Dome 3: Mint/Blue */}
        <div
          ref={dome3Ref}
          className="absolute top-[10%] left-[50%] w-[45vw] h-[45vw] rounded-full bg-[hsl(180,50%,70%)]/30 mix-blend-multiply dark:mix-blend-screen blur-[80px]"
        />

      </div>
    </div>
  );
};
