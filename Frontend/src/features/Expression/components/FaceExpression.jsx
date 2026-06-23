import React, { useEffect, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export default function FaceExpression() {
  const videoRef = useRef(null);
  const landmarkerRef = useRef(null);
  const animationRef = useRef(null);

  const [expression, setExpression] = useState('Detecting...');

  useEffect(() => {
    let stream;
    let isMounted = true;

    const init = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        // Fixed the broken URL path and model name string here
        landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
          },
          outputFaceBlendshapes: true,
          runningMode: 'VIDEO',
          numFaces: 1
        });

        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        
        if (videoRef.current && isMounted) {
          videoRef.current.srcObject = stream;
          // Wait for metadata to load before playing
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            detect();
          };
        }
      } catch (error) {
        console.error("Error initializing FaceLandmarker:", error);
        setExpression("Failed to load camera/model ❌");
      }
    };

    const detect = () => {
      if (!landmarkerRef.current || !videoRef.current || videoRef.current.paused) {
        animationRef.current = requestAnimationFrame(detect);
        return;
      }

      // Ensure the video actually has data ready
      if (videoRef.current.readyState >= 2) {
        const results = landmarkerRef.current.detectForVideo(
          videoRef.current,
          performance.now()
        );

        if (results.faceBlendshapes?.length > 0) {
          const blendshapes = results.faceBlendshapes[0].categories;
          const getScore = name => blendshapes.find(b => b.categoryName === name)?.score || 0;

          const smileLeft = getScore('mouthSmileLeft');
          const smileRight = getScore('mouthSmileRight');
          const jawOpen = getScore('jawOpen');
          const browUp = getScore('browInnerUp');
          const frownLeft = getScore('mouthFrownLeft');
          const frownRight = getScore('mouthFrownRight');

          let currentExpression = 'Neutral';

          if (smileLeft > 0.5 && smileRight > 0.5) {
            currentExpression = 'Happy 😄';
          } else if (jawOpen > 0.2 && browUp > 0.2) {
            currentExpression = 'Surprised 😲';
          } else if (frownLeft > 0.2 && frownRight > 0.2) {
            currentExpression = 'Sad 😢';
          }
          
          setExpression(currentExpression);
        }
      }
      
      animationRef.current = requestAnimationFrame(detect);
    };

    init();

    // Clean up completely when component unmounts
    return () => {
      isMounted = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div style={{ textAlign: 'center', fontFamily: 'sans-serif', marginTop: '20px' }}>
      <video
        ref={videoRef}
        style={{
          width: '400px',
          borderRadius: '12px',
          transform: 'scaleX(-1)' // Mirrors the webcam feed for natural interaction
        }}
        playsInline
        muted
      />
      <h2>{expression}</h2>
    </div>
  );
}