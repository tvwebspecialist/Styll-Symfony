import type { Page, Response } from 'playwright/test'

type WaitForUrlTarget = Parameters<Page['waitForURL']>[0]
type WaitForUrlOptions = NonNullable<Parameters<Page['waitForURL']>[1]>

export async function gotoDomContentLoaded(
  page: Page,
  path: string,
): Promise<Response | null> {
  return page.goto(path, { waitUntil: 'domcontentloaded' })
}

export async function waitForUrlDomContentLoaded(
  page: Page,
  target: WaitForUrlTarget,
  options: Omit<WaitForUrlOptions, 'waitUntil'> = {},
): Promise<void> {
  await page.waitForURL(target, {
    ...options,
    waitUntil: 'domcontentloaded',
  })
}
