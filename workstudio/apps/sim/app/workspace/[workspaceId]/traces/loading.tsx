import { Skeleton } from '@sim/emcn'

/** The Traces frame while the page and its URL state resolve. */
export default function TracesLoading() {
  return (
    <div className='min-h-0 flex-1 overflow-y-auto px-6'>
      <div className='mx-auto flex w-full max-w-[72rem] flex-col gap-4 py-10'>
        <Skeleton className='h-6 w-32 rounded-md' />
        <Skeleton className='h-[30px] w-full rounded-lg' />
        <Skeleton className='h-[320px] w-full rounded-lg' />
      </div>
    </div>
  )
}
