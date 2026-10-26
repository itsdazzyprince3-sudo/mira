'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, Hand, LoaderCircle, ShieldCheck, Sparkles } from 'lucide-react'
import type { FaceLandmarker, HandLandmarker } from '@mediapipe/tasks-vision'

type Expression = 'calm' | 'happy' | 'surprised' | 'thoughtful'

const expressions: Record<Expression, string> = {
  calm: 'Calm',
  happy: 'Happy',
  surprised: 'Surprised',
  thoughtful: 'Thoughtful',
}

const visionWasmUrl = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm'
const faceModelUrl = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
const handModelUrl = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

export function MiraCompanion() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null)
  const handLandmarkerRef = useRef<HandLandmarker | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const sessionRef = useRef(0)
  const mountedRef = useRef(true)
  const [cameraOn, setCameraOn] = useState(false)
  const [starting, setStarting] = useState(false)
  const [compatibilityMode, setCompatibilityMode] = useState(false)
  const [expression, setExpression] = useState<Expression>('calm')
  const [gesture, setGesture] = useState('None yet')
  const [error, setError] = useState('')

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      stopCamera(false)
    }
  }, [])

  function stopCamera(updateState = true) {
    sessionRef.current += 1
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    faceLandmarkerRef.current?.close()
    faceLandmarkerRef.current = null
    handLandmarkerRef.current?.close()
    handLandmarkerRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    if (updateState) {
      setCameraOn(false)
      setStarting(false)
      setCompatibilityMode(false)
      setExpression('calm')
      setGesture('None yet')
    }
  }

  async function toggleCamera() {
    if (cameraOn || starting) {
      stopCamera()
      setError('')
      return
    }

    const session = ++sessionRef.current
    setError('')
    setStarting(true)

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not available in this browser. Try a current browser over HTTPS.')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      })
      if (!mountedRef.current || session !== sessionRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      streamRef.current = stream

      const video = videoRef.current
      if (!video) throw new Error('The camera preview could not be initialized.')
      video.srcObject = stream
      await video.play()

      const { FaceLandmarker, FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision')
      if (!mountedRef.current || session !== sessionRef.current) return
      const vision = await FilesetResolver.forVisionTasks(visionWasmUrl)
      const createLandmarkers = async (delegate: 'GPU' | 'CPU') => {
        const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: faceModelUrl, delegate },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
        })
        try {
          const handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: handModelUrl, delegate },
            runningMode: 'VIDEO',
            numHands: 2,
          })
          return [faceLandmarker, handLandmarker] as const
        } catch (trackerError) {
          faceLandmarker.close()
          throw trackerError
        }
      }

      let trackers: readonly [FaceLandmarker, HandLandmarker]
      try {
        trackers = await createLandmarkers('GPU')
      } catch {
        if (!mountedRef.current || session !== sessionRef.current) return
        setCompatibilityMode(true)
        trackers = await createLandmarkers('CPU')
      }
      const [faceLandmarker, handLandmarker] = trackers
      faceLandmarkerRef.current = faceLandmarker
      handLandmarkerRef.current = handLandmarker
      if (!mountedRef.current || session !== sessionRef.current) {
        stopCamera(false)
        return
      }

      setCameraOn(true)
      setStarting(false)

      let previousWristX: number | null = null
      let waveUntil = 0
      let lastAnalysis = 0
      let lastExpression = 'calm'
      let lastGesture = 'None yet'

      const analyzeFrame = (now: number) => {
        const currentVideo = videoRef.current
        const faceTracker = faceLandmarkerRef.current
        const handTracker = handLandmarkerRef.current

        if (!currentVideo || !faceTracker || !handTracker || currentVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          animationFrameRef.current = requestAnimationFrame(analyzeFrame)
          return
        }

        if (now - lastAnalysis > 100) {
          lastAnalysis = now
          const faceResult = faceTracker.detectForVideo(currentVideo, now)
          const categories = faceResult.faceBlendshapes[0]?.categories ?? []
          const score = (name: string) => categories.find((category) => category.categoryName === name)?.score ?? 0
          let nextExpression: Expression = 'calm'

          if ((score('mouthSmileLeft') + score('mouthSmileRight')) / 2 > 0.32) {
            nextExpression = 'happy'
          } else if (score('jawOpen') > 0.36 && score('eyeWideLeft') > 0.2) {
            nextExpression = 'surprised'
          } else if (score('browDownLeft') > 0.25 || score('browInnerUp') > 0.32) {
            nextExpression = 'thoughtful'
          }

          if (nextExpression !== lastExpression) {
            lastExpression = nextExpression
            setExpression(nextExpression)
          }

          const handResult = handTracker.detectForVideo(currentVideo, now)
          const hand = handResult.landmarks[0]
          let nextGesture = 'None yet'

          if (hand) {
            const indexUp = hand[8].y < hand[6].y
            const middleUp = hand[12].y < hand[10].y
            const ringUp = hand[16].y < hand[14].y
            const pinkyUp = hand[20].y < hand[18].y

            if (indexUp && middleUp && !ringUp && !pinkyUp) {
              nextGesture = 'Peace sign'
            } else if (indexUp && middleUp && ringUp && pinkyUp) {
              const wristX = hand[0].x
              if (previousWristX !== null && Math.abs(wristX - previousWristX) > 0.065) {
                waveUntil = now + 1200
              }
              previousWristX = wristX
              nextGesture = now < waveUntil ? 'Waving hello' : 'Open palm'
            } else if (!indexUp && !middleUp && !ringUp && !pinkyUp) {
              previousWristX = null
              nextGesture = 'Closed fist'
            } else {
              previousWristX = null
              nextGesture = 'Hand detected'
            }
          } else {
            previousWristX = null
          }

          if (nextGesture !== lastGesture) {
            lastGesture = nextGesture
            setGesture(nextGesture)
          }
        }

        animationFrameRef.current = requestAnimationFrame(analyzeFrame)
      }

      animationFrameRef.current = requestAnimationFrame(analyzeFrame)
    } catch (cameraError) {
      if (mountedRef.current && session === sessionRef.current) {
        stopCamera()
        setError(cameraError instanceof Error ? cameraError.message : 'Camera and gesture tracking could not start.')
      }
    }
  }

  return (
    <section className={`companion-card ${cameraOn ? 'companion-live' : ''}`} aria-label="MIRA anime companion">
      <div className="companion-heading">
        <span><Sparkles size={13} /> MIRA COMPANION</span>
        <span className={`companion-live-label ${cameraOn ? 'is-live' : ''}`}><i /> {cameraOn ? compatibilityMode ? 'CPU MODE' : 'ON DEVICE' : 'READY'}</span>
      </div>
      <div className={`companion-stage expression-${expression}`}>
        <div className="companion-glow" />
        <div className="anime-character" aria-label={`MIRA looks ${expressions[expression].toLowerCase()}`} role="img">
          <div className="anime-hair-back" />
          <div className="anime-body"><span className="anime-collar" /><span className="anime-ribbon" /></div>
          <div className="anime-neck" />
          <div className="anime-ear anime-ear-left" /><div className="anime-ear anime-ear-right" />
          <div className="anime-face">
            <div className="anime-blush anime-blush-left" /><div className="anime-blush anime-blush-right" />
            <span className="anime-eye anime-eye-left" /><span className="anime-eye anime-eye-right" />
            <span className="anime-mouth" />
          </div>
          <div className="anime-bangs" /><div className="anime-hair-strand" />
          <span className="anime-hair-clip">✦</span>
        </div>
        <div className="companion-state">{expressions[expression]}<span>{cameraOn ? 'Live expression cue' : 'Your AI companion'}</span></div>
      </div>
      <div className="companion-camera">
        <div className={`camera-preview ${cameraOn ? 'camera-preview-on' : ''}`}>
          <video ref={videoRef} muted playsInline aria-label="Mirrored camera preview" />
          {!cameraOn && <div className="camera-placeholder"><Camera size={19} /><span>{starting ? 'Connecting…' : 'Camera is off'}</span></div>}
          {starting && <span className="camera-loader"><LoaderCircle size={16} /></span>}
        </div>
        <div className="companion-readouts">
          <span><Hand size={12} /> Gesture</span>
          <strong>{cameraOn ? gesture : 'Turn on camera to begin'}</strong>
        </div>
      </div>
      {error && <p className="camera-error" role="alert">{error}</p>}
      <button className={`camera-toggle ${cameraOn ? 'camera-toggle-on' : ''}`} onClick={() => void toggleCamera()} aria-pressed={cameraOn}>
        {cameraOn ? <CameraOff size={15} /> : starting ? <LoaderCircle size={15} /> : <Camera size={15} />}
        {cameraOn ? 'Turn camera off' : starting ? 'Cancel startup' : 'Start camera'}
      </button>
      <p className="companion-privacy"><ShieldCheck size={12} /> Camera stays on this device. Nothing is recorded or uploaded.</p>
      <p className="companion-disclaimer">Expression cues are playful, not a measure of how you feel.</p>
    </section>
  )
}
