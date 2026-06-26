import {
    FaceLandmarker,
    FilesetResolver
} from "@mediapipe/tasks-vision";

//just remember init function initially setups media pipe library. 
// NO need to know how it is done, This is called Blackbox programming

/**
 Jab tum kisi function ke parameters mein { landmarkerRef, videoRef, streamRef } likhte ho, toh tum JavaScript ko bol rahe ho:
"Main is function ko ek poora object bhejunga, tum us object ke andar se yeh teen cheezein nikal kar mujhe direct variable ki tarah de do."
 */

export const init = async ({ landmarkerRef, videoRef, streamRef}) => {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    landmarkerRef.current = await FaceLandmarker.createFromOptions(
        vision,
        {
            baseOptions: {
                modelAssetPath:
                    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task"
            },
            outputFaceBlendshapes: true,
            runningMode: "VIDEO",
            numFaces: 1
        }
    );

    streamRef.current = await navigator.mediaDevices.getUserMedia({ video: true });
    videoRef.current.srcObject = streamRef.current;
    await videoRef.current.play();
};

export const detect = ({ landmarkerRef, videoRef, setExpression, animationRef }) => {
    if (!landmarkerRef.current || !videoRef.current || videoRef.current.paused) return;

    if (videoRef.current.readyState >= 2) {
        const results = landmarkerRef.current.detectForVideo(
            videoRef.current,
            performance.now()
        );

        if (results.faceBlendshapes?.length > 0) {
            const blendshapes = results.faceBlendshapes[0].categories;
            const getScore = (name) => blendshapes.find((b) => b.categoryName === name)?.score || 0;

            const smileLeft = getScore("mouthSmileLeft");
            const smileRight = getScore("mouthSmileRight");
            const jawOpen = getScore("jawOpen");
            const browUp = getScore("browInnerUp");
            const frownLeft = getScore("mouthFrownLeft");
            const frownRight = getScore("mouthFrownRight");

            let currentExpression = "Neutral";

            if (smileLeft > 0.5 && smileRight > 0.5) {
                currentExpression = "happy 😄";
            } else if (jawOpen > 0.2 && browUp > 0.2) {
                currentExpression = "surprised 😲";
            } else if (frownLeft > 0.2 && frownRight > 0.2) { // ⚠️ Sad limit ko sensible 0.2 kiya taaki glitch na kare
                currentExpression = "sad 😢";
            }

            setExpression(currentExpression);
        }
    }
    if (animationRef) {
        animationRef.current = requestAnimationFrame(() => 
            detect({ landmarkerRef, videoRef, setExpression, animationRef })
        );
    }
};