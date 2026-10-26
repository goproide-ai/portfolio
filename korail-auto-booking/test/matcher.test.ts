import { describe, expect, it } from 'vitest'
import { categoryOf, describeTrain, formatDate, formatTime, inWindow, matchesCategory } from '../src/main/booking/matcher'
import { suggestStations } from '../src/shared/stations'

describe('matcher helpers', () => {
  it('classifies train names', () => {
    expect(categoryOf({ trainTypeName: 'KTX-산천' })).toBe('KTX')
    expect(categoryOf({ trainTypeName: 'KTX-이음' })).toBe('KTX')
    expect(categoryOf({ trainTypeName: 'ITX-새마을' })).toBe('ITX')
    expect(categoryOf({ trainTypeName: 'ITX-마음' })).toBe('ITX')
    expect(categoryOf({ trainTypeName: '새마을호' })).toBe('SAEMAEUL')
    expect(categoryOf({ trainTypeName: '무궁화호' })).toBe('MUGUNGHWA')
    expect(categoryOf({ trainTypeName: '누리로' })).toBe('MUGUNGHWA')
    expect(categoryOf({ trainTypeName: '통근열차' })).toBe('OTHER')
    expect(matchesCategory({ trainTypeName: 'KTX' }, [])).toBe(true)
    expect(matchesCategory({ trainTypeName: 'KTX' }, ['ITX'])).toBe(false)
  })

  it('checks time windows inclusively', () => {
    expect(inWindow({ depTime: '080000' }, '08:00', '10:00')).toBe(true)
    expect(inWindow({ depTime: '100059' }, '0800', '1000')).toBe(true)
    expect(inWindow({ depTime: '100100' }, '0800', '1000')).toBe(false)
    expect(inWindow({ depTime: '075900' }, '0800', '1000')).toBe(false)
  })

  it('formats', () => {
    expect(formatTime('083000')).toBe('08:30')
    expect(formatDate('20260910')).toBe('2026-09-10')
    expect(describeTrain({ trainTypeName: 'KTX', trainNo: '001', depName: '서울', depTime: '080000', arrName: '부산', arrTime: '103000' } as never)).toBe('KTX 001편 서울 08:00 → 부산 10:30')
  })
})

describe('stations', () => {
  it('suggests by prefix first', () => {
    const s = suggestStations('부')
    expect(s).toContain('부산')
    expect(s).toContain('부전')
    expect(s.slice(0, 3).every((n) => n.startsWith('부'))).toBe(true)
    expect(suggestStations('부산')[0]).toBe('부산')
    expect(suggestStations('송정')).toContain('광주송정')
    expect(suggestStations('서울역')).toContain('서울')
    expect(suggestStations('')).toHaveLength(8)
  })
})
