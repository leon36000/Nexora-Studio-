import { Skeleton } from '@sim/emcn'

/** The Evaluations frame while the page and its URL state resolve. */
export default function EvaluationsLoading() {
  return (
    <div className='min-h-0 flex-1 overflow-y-auto px-6'>
      <div className='mx-auto flex w-full max-w-[64rem] flex-col gap-6 py-10'>
        <Skeleton className='h-6 w-32 rounded-md' />
        <Skeleton className='h-[30px] w-72 rounded-lg' />
        <Skeleton className='h-[240px] w-full rounded-lg' />
      </div>
    </div>
  )
}
