'use client'

import { useState } from 'react'
import { ChipSwitch } from '@sim/emcn'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { EChartsView } from '@/components/charts/echarts-view'

type DailyMeasure = 'totalTokens' | 'executions'

interface DailyChartProps {
  days: ReadonlyArray<{ date: string; executions: number; totalTokens: number }>
}

/** Tokens or runs per local day of the period: one series, so no legend; a tooltip per bar. */
export function DailyChart({ days }: DailyChartProps) {
  const t = useTranslations('governance.consumption.daily')
  const format = useFormatter()
  const locale = useLocale()
  const [measure, setMeasure] = useState<DailyMeasure>('totalTokens')
  const measureLabel = measure === 'totalTokens' ? t('tokens') : t('executions')

  const option = {
    grid: { left: 8, right: 8, top: 12, bottom: 4, containLabel: true },
    xAxis: {
      type: 'category',
      data: days.map((day) =>
        format.dateTime(new Date(`${day.date}T12:00:00Z`), {
          day: 'numeric',
          month: 'short',
          timeZone: 'UTC',
        })
      ),
      axisTick: { show: false },
    },
    yAxis: { type: 'value', splitNumber: 3, minInterval: 1 },
    series: [
      {
        type: 'bar',
        name: measureLabel,
        data: days.map((day) => day[measure]),
        barMaxWidth: 24,
        itemStyle: { borderRadius: [4, 4, 0, 0] },
      },
    ],
  }

  return (
    <div className='flex flex-col gap-3'>
      <ChipSwitch
        size='compact'
        aria-label={t('measure')}
        value={measure}
        onChange={setMeasure}
        options={[
          { value: 'totalTokens', label: t('tokens') },
          { value: 'executions', label: t('executions') },
        ]}
        className='self-start'
      />
      <EChartsView
        label={t('chartLabel', { measure: measureLabel, days: days.length })}
        option={option}
        className='h-[220px]'
        revision={locale}
        createController={() => {
          const compact = new Intl.NumberFormat(locale, { notation: 'compact' })
          const full = new Intl.NumberFormat(locale)
          return {
            prepareOption: (prepared) => ({
              ...prepared,
              yAxis: {
                ...(prepared.yAxis as Record<string, unknown>),
                axisLabel: { formatter: (value: number) => compact.format(value) },
              },
              tooltip: {
                ...(prepared.tooltip as Record<string, unknown>),
                valueFormatter: (value: number) => full.format(value),
              },
            }),
            afterUpdate: () => {},
            dispose: () => {},
          }
        }}
      />
    </div>
  )
}
