import { useEffect, useRef, useState } from "react"
import { isAxiosError } from "axios"
import fixWebmDuration from "fix-webm-duration"
import { Loader2, Mic, Square } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useCreateTransactionFromVoice } from "./hooks"

// Достаём человекочитаемую причину сбоя запроса.
function messageFromError(err: unknown): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as
      | { message?: string | string[] }
      | undefined
    const msg = data?.message
    if (Array.isArray(msg)) return msg.join(". ")
    if (typeof msg === "string" && msg) return msg
    if (!err.response) return "Сервер недоступен. Проверь соединение."
  }
  return "Не удалось распознать. Попробуй ещё раз."
}

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
//
// fab — круглый icon-only вид для нижней панели (BottomNav): без текста.
// Ошибки (доступ к микрофону, сбой распознавания) показываются всплывающим
// тостом (sonner), а не инлайном — поэтому fab возвращает чистую кнопку.
// className задаёт базовый стиль круга (передаёт BottomNav для единообразия).
function VoiceRecorderButton({
  fab = false,
  className,
}: {
  fab?: boolean
  className?: string
} = {}) {
  const mutation = useCreateTransactionFromVoice()
  const [isRecording, setIsRecording] = useState(false)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const autoStopRef = useRef<number | null>(null)
  const startedAtRef = useRef<number>(0)

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

  // Сбой запроса распознавания — всплывашкой. mutation.error меняется один раз
  // при провале, поэтому эффект сработает ровно на новой ошибке.
  useEffect(() => {
    if (mutation.isError) toast.error(messageFromError(mutation.error))
  }, [mutation.isError, mutation.error])

  const startRecording = async () => {
    mutation.reset()

    if (typeof MediaRecorder === "undefined") {
      toast.error("Браузер не поддерживает запись аудио.")
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error(
        "Микрофон работает только по https или localhost. Открой приложение так.",
      )
      return
    }

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      // Различаем причины: явный отказ, отсутствие микрофона, прочее.
      const name = err instanceof DOMException ? err.name : ""
      if (name === "NotAllowedError" || name === "SecurityError") {
        toast.error(
          "Доступ к микрофону запрещён. Разреши его в настройках браузера.",
        )
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        toast.error("Микрофон не найден.")
      } else {
        toast.error("Не удалось включить микрофон. Попробуй ещё раз.")
      }
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
      const rawBlob = new Blob(chunksRef.current, { type: blobType })
      chunksRef.current = []
      if (rawBlob.size === 0) return

      const ext = picked?.ext ?? extFromBlobType(blobType)
      const durationMs = Date.now() - startedAtRef.current

      // MediaRecorder пишет webm без длительности в заголовке — Nexara читает
      // её как 0 и отклоняет («минимальная длина 0.3 с»). Дописываем реальную
      // длительность в контейнер. Для прочих форматов отправляем как есть.
      const prepare = blobType.includes("webm")
        ? fixWebmDuration(rawBlob, durationMs, { logger: false })
        : Promise.resolve(rawBlob)

      prepare.then((blob) => {
        mutation.mutate({ audio: blob, filename: `voice.${ext}` })
      })
    }

    recorderRef.current = recorder
    streamRef.current = stream
    startedAtRef.current = Date.now()
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

  // Круглый вид для нижней панели: только иконка, ошибки — всплывающим тостом.
  if (fab) {
    return (
      <button
        type='button'
        onClick={handleClick}
        disabled={mutation.isPending}
        aria-label='Добавить голосом'
        className={cn(
          className,
          isRecording && "animate-pulse bg-destructive text-white",
        )}
      >
        {mutation.isPending ? (
          <Loader2 className='size-7 animate-spin' />
        ) : isRecording ? (
          <Square className='size-7' />
        ) : (
          <Mic className='size-7' />
        )}
      </button>
    )
  }

  return (
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
  )
}

export default VoiceRecorderButton
