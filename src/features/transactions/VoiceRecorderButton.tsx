import { useEffect, useRef, useState } from "react"
import { Loader2, Mic, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCreateTransactionFromVoice } from "./hooks"

// Жёсткий потолок длительности — страховка от лимита 1 МБ на бэке. При
// 48 kbps это ~360 КБ, с большим запасом.
const MAX_RECORDING_MS = 60_000

// Подбираем mime, который умеет браузер. Chrome/Firefox — webm/opus,
// Safari — audio/mp4 (aac). Если оба не поддерживаются (старые движки),
// отдаём дефолт браузера: MediaRecorder сам выберет, имя файла подстроим
// под фактический blob.type.
const MIME_CANDIDATES: Array<{ mime: string; ext: string }> = [
  { mime: "audio/webm;codecs=opus", ext: "webm" },
  { mime: "audio/webm", ext: "webm" },
  { mime: "audio/mp4", ext: "mp4" },
]

function pickMime(): { mime: string; ext: string } | null {
  if (typeof MediaRecorder === "undefined") return null
  for (const c of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(c.mime)) return c
  }
  return null
}

function extFromBlobType(type: string): string {
  if (type.includes("webm")) return "webm"
  if (type.includes("mp4") || type.includes("aac")) return "mp4"
  if (type.includes("ogg")) return "ogg"
  if (type.includes("wav")) return "wav"
  return "webm"
}

// Кнопка голосового ввода. Тап — старт записи, повторный тап — стоп и
// отправка blob на POST /transactions/voice. Пока идёт распознавание,
// показывает «Распознаём…». При успехе мутация сама инвалидирует ленту.
function VoiceRecorderButton() {
  const mutation = useCreateTransactionFromVoice()
  const [isRecording, setIsRecording] = useState(false)
  const [permissionError, setPermissionError] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const autoStopRef = useRef<number | null>(null)

  // На размонтировании компонента отпускаем микрофон и сносим таймер, чтобы
  // не оставлять висящий getUserMedia-стрим (в браузере остаётся красная
  // точка вкладки) и не получить setState на размонтированном компоненте.
  useEffect(() => {
    return () => {
      if (autoStopRef.current !== null) {
        window.clearTimeout(autoStopRef.current)
      }
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const startRecording = async () => {
    setPermissionError(null)
    mutation.reset()

    if (typeof MediaRecorder === "undefined") {
      setPermissionError("Браузер не поддерживает запись аудио.")
      return
    }

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setPermissionError("Нет доступа к микрофону. Разреши его в браузере.")
      return
    }

    const picked = pickMime()
    const recorder = new MediaRecorder(
      stream,
      picked
        ? { mimeType: picked.mime, audioBitsPerSecond: 48_000 }
        : { audioBitsPerSecond: 48_000 },
    )

    chunksRef.current = []
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      if (autoStopRef.current !== null) {
        window.clearTimeout(autoStopRef.current)
        autoStopRef.current = null
      }
      setIsRecording(false)

      const blobType = recorder.mimeType || picked?.mime || "audio/webm"
      const blob = new Blob(chunksRef.current, { type: blobType })
      chunksRef.current = []
      if (blob.size === 0) return

      const ext = picked?.ext ?? extFromBlobType(blobType)
      mutation.mutate({ audio: blob, filename: `voice.${ext}` })
    }

    recorderRef.current = recorder
    streamRef.current = stream
    recorder.start()
    setIsRecording(true)

    // Авто-стоп: если пользователь забыл нажать стоп, прерываем сами,
    // чтобы не превысить лимит 1 МБ.
    autoStopRef.current = window.setTimeout(() => {
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop()
      }
    }, MAX_RECORDING_MS)
  }

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop()
    }
  }

  const handleClick = () => {
    if (mutation.isPending) return
    if (isRecording) stopRecording()
    else void startRecording()
  }

  return (
    <div className='flex flex-col items-end gap-1'>
      <Button
        type='button'
        onClick={handleClick}
        disabled={mutation.isPending}
        variant={isRecording ? "destructive" : "outline"}
        className={isRecording ? "animate-pulse" : ""}
      >
        {mutation.isPending ? (
          <>
            <Loader2 className='animate-spin' />
            Распознаём…
          </>
        ) : isRecording ? (
          <>
            <Square />
            Стоп
          </>
        ) : (
          <>
            <Mic />
            Голосом
          </>
        )}
      </Button>

      {permissionError && (
        <span className='text-xs text-destructive'>{permissionError}</span>
      )}
      {mutation.isError && (
        <span className='text-xs text-destructive'>
          Не удалось распознать. Попробуй ещё раз.
        </span>
      )}
    </div>
  )
}

export default VoiceRecorderButton
