import { Link, useLocation } from "react-router-dom"
import { Camera, House, Pencil, User } from "lucide-react"
import AddTransactionDialog from "@/features/transactions/AddTransactionDialog"
import VoiceRecorderButton from "@/features/transactions/VoiceRecorderButton"
import { cn } from "@/lib/utils"

// Единый стиль круглой кнопки (размер как у бывшей «+»).
const fabBase =
  "flex size-14 items-center justify-center rounded-full shadow-lg transition active:scale-95"
// Кнопки-действия (добавление расхода) — акцентные.
const fabAction = cn(fabBase, "bg-primary text-primary-foreground")

// Подпись под кнопкой.
const labelClass = "text-[11px] text-muted-foreground"

// Нижняя панель мобильной версии (sm:hidden). Слева — Профиль (навигация
// + настройки), справа — три способа добавить расход в едином крупном стиле:
// вручную (диалог формы), голосом (запись), фото (распознавание чека — задел).
function BottomNav() {
  const { pathname } = useLocation()
  const onFeed = pathname === "/"

  return (
    <nav className='fixed inset-x-0 bottom-0 z-40 border-t border-white/20 bg-background/40 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] sm:hidden'>
      {/* Прогрессивное размытие фона. Слои ВЛОЖЕНЫ друг в друга для более плавного перехода от четкого к размытию. */}
      <div className='pointer-events-none absolute inset-0 -z-10 overflow-hidden backdrop-blur-[6px]'>
        <div
          className='absolute inset-0 backdrop-blur-[14px]'
          style={{
            maskImage: "linear-gradient(to bottom, black 0%, transparent 75%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, black 0%, transparent 75%)",
          }}
        >
          <div
            className='absolute inset-0 backdrop-blur-[30px]'
            style={{
              maskImage:
                "linear-gradient(to bottom, black 0%, transparent 45%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, black 0%, transparent 45%)",
            }}
          />
        </div>
      </div>
      <div className='flex items-end justify-between px-4 py-2'>
        {/* Слева: на ленте — вход в профиль, иначе — возврат в ленту */}
        <Link
          to={onFeed ? "/settings" : "/"}
          className='flex flex-col items-center gap-1'
        >
          <span className={cn(fabBase, "bg-muted text-foreground")}>
            {onFeed ? (
              <User className='size-7' />
            ) : (
              <House className='size-7' />
            )}
          </span>
          <span className={labelClass}>{onFeed ? "Профиль" : "Лента"}</span>
        </Link>

        {/* Справа: способы добавить расход */}
        <div className='flex items-end gap-3'>
          <div className='flex flex-col items-center gap-1'>
            <AddTransactionDialog
              trigger={
                <button
                  type='button'
                  aria-label='Добавить вручную'
                  className={fabAction}
                >
                  <Pencil className='size-7' />
                </button>
              }
            />
            <span className={labelClass}>Вручную</span>
          </div>

          <div className='flex flex-col items-center gap-1'>
            <VoiceRecorderButton fab className={fabAction} />
            <span className={labelClass}>Голос</span>
          </div>

          <div className='flex flex-col items-center gap-1'>
            {/* Распознавание чека по фото — задел на будущее */}
            <button
              type='button'
              disabled
              aria-label='Добавить по фото (скоро)'
              title='Скоро'
              className={cn(fabAction, "opacity-40")}
            >
              <Camera className='size-7' />
            </button>
            <span className={labelClass}>Фото</span>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default BottomNav
