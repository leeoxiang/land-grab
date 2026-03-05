import { NextRequest, NextResponse } from 'next/server'
import { writeFile, readFile, mkdir } from 'fs/promises'
import { join } from 'path'
import type { PlotMeta } from '@/app/generator/page'

export async function POST(req: NextRequest) {
  try {
    const { imageData, meta }: { imageData: string; meta: PlotMeta } = await req.json()

    if (!imageData || !meta?.plotNumber) {
      return NextResponse.json({ error: 'Missing imageData or meta' }, { status: 400 })
    }

    const dir      = join(process.cwd(), 'public', 'plots')
    const padded   = String(meta.plotNumber).padStart(3, '0')

    await mkdir(dir, { recursive: true })

    // Save PNG
    const png = Buffer.from(imageData.replace(/^data:image\/png;base64,/, ''), 'base64')
    await writeFile(join(dir, `plot-${padded}.png`), png)

    // Save per-plot JSON sidecar
    await writeFile(join(dir, `plot-${padded}.json`), JSON.stringify(meta, null, 2))

    // Update / create the combined plots-metadata.json
    const allPath = join(dir, 'plots-metadata.json')
    let all: PlotMeta[] = []
    try {
      const raw = await readFile(allPath, 'utf8')
      all = JSON.parse(raw) as PlotMeta[]
    } catch {
      // file doesn't exist yet — start fresh
    }
    // Replace or append this entry
    const idx = all.findIndex(p => p.plotNumber === meta.plotNumber)
    if (idx >= 0) all[idx] = meta
    else all.push(meta)
    all.sort((a, b) => a.plotNumber - b.plotNumber)
    await writeFile(allPath, JSON.stringify(all, null, 2))

    return NextResponse.json({ ok: true, filename: `plot-${padded}.png` })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
