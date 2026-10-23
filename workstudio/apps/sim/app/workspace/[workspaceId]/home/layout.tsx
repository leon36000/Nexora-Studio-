/**
 * The chat composer, or the Nexora home page when Chat is disabled (Nexora edition). This path
 * is also baked into delivered invitation emails, so it always resolves.
 */
export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return <div className='flex h-full flex-1 flex-col overflow-hidden'>{children}</div>
}
