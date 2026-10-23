import { Loader } from '@sim/emcn/icons'

export default function AssistantLoading() {
  return (
    <div className='flex min-h-0 flex-1 items-center justify-center'>
      <Loader className='size-[16px] text-[var(--text-muted)]' animate />
    </div>
  )
}
