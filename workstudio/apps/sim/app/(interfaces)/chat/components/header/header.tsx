'use client'

import { OverflowText, SimWordmark } from '@sim/emcn'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { SITE_URL } from '@/lib/core/utils/urls'
import { useBrandConfig } from '@/ee/whitelabeling'

interface ChatHeaderProps {
  chatConfig: {
    title?: string
    customizations?: {
      headerText?: string
      logoUrl?: string
      imageUrl?: string
      primaryColor?: string
    }
  } | null
}

export function ChatHeader({ chatConfig }: ChatHeaderProps) {
  const brand = useBrandConfig()
  const t = useTranslations('interfaces.chat')
  const customImage = chatConfig?.customizations?.imageUrl || chatConfig?.customizations?.logoUrl

  return (
    <nav
      aria-label={t('navigation')}
      className='flex w-full shrink-0 items-center justify-between gap-3 px-4 pt-3 pb-[21px] sm:px-8 sm:pt-[8.5px] md:px-[44px] md:pt-4'
    >
      <div className='min-w-0 flex-1'>
        <div className='flex min-w-0 items-center gap-3'>
          {customImage && (
            <Image
              src={customImage}
              alt={t('logoAlt', { title: chatConfig?.title || t('defaultTitle') })}
              width={24}
              height={24}
              unoptimized
              className='size-6 shrink-0 rounded-md object-cover'
            />
          )}
          <h2 className='min-w-0 text-[var(--text-primary)] text-lg'>
            <OverflowText
              label={
                chatConfig?.customizations?.headerText || chatConfig?.title || t('defaultTitle')
              }
            />
          </h2>
        </div>
      </div>

      {!brand.logoUrl && (
        <div className='flex shrink-0 items-center gap-4'>
          {/* Only show Nexora logo if no custom branding is set */}

          <Link
            href={SITE_URL}
            target='_blank'
            rel='noopener noreferrer'
            aria-label={t('home')}
            className='flex items-center'
          >
            <SimWordmark />
          </Link>
        </div>
      )}
    </nav>
  )
}
