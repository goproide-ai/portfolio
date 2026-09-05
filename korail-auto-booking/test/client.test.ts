import { describe, expect, it } from 'vitest'
import { CookieJar, KorailClient, chooseSeatClass, classifyLoginId, extractLoginCryptoInfo, getSetCookies, nextMinute, redactUrl } from '../src/main/korail/client'
import { DynaPathError, LoginError, NeedToLoginError, NetworkError, NoResultsError, SoldOutError } from '../src/main/korail/errors'
import { DYNAPATH_HEADER } from '../src/main/korail/dynapath'
import { ENDPOINTS } from '../src/main/korail/constants'
import type { Train } from '../src/shared/types'

interface Recorded {
  method: string
  url: URL
  params: URLSearchParams
  headers: Record<string, string>
}

function jsonResponse(body: unknown, init: { status?: number; setCookie?: string[]; headers?: Record<string, string> } = {}): Response {
  const headers = new Headers({ 'Content-Type': 'application/json;charset=UTF-8', ...(init.headers ?? {}) })
  for (const c of init.setCookie ?? []) headers.append('set-cookie', c)
  return new Response(JSON.stringify(body), { status: init.status ?? 200, headers })
}

function hits(r: Recorded, endpoint: string): boolean {
  return r.url.pathname === new URL(endpoint).pathname
}

function makeFetch(handler: (r: Recorded) => Response | Promise<Response>): { fetch: typeof fetch; calls: Recorded[] } {
  const calls: Recorded[] = []
  const f = (async (input: string, init?: RequestInit) => {
    const url = new URL(input)
    const method = init?.method ?? 'GET'
    const params = method === 'GET' ? url.searchParams : new URLSearchParams(String(init?.body ?? ''))
    const rec: Recorded = { method, url, params, headers: (init?.headers as Record<string, string>) ?? {} }
    calls.push(rec)
    return handler(rec)
  }) as unknown as typeof fetch
  return { fetch: f, calls }
}

const KEY32 = 'abcdefghijklmnopqrstuvwxyz012345'

function trainJson(no: string, dep: string, gen = '11', spe = '13', wait = '0'): Record<string, string> {
  return {
    h_trn_clsf_cd: '00',
    h_trn_clsf_nm: 'KTX',
    h_trn_gp_cd: '100',
    h_trn_no: no,
    h_dpt_rs_stn_nm: '서울',
    h_dpt_rs_stn_cd: '0001',
    h_dpt_dt: '20260910',
    h_dpt_tm: dep,
    h_arv_rs_stn_nm: '부산',
    h_arv_rs_stn_cd: '0020',
    h_arv_dt: '20260910',
    h_arv_tm: '103000',
    h_run_dt: '20260910',
    h_dpt_stn_cons_ordr: '000001',
    h_dpt_stn_run_ordr: '000001',
    h_arv_stn_cons_ordr: '000010',
    h_arv_stn_run_ordr: '000010',
    h_rsv_psb_flg: 'Y',
    h_rsv_psb_nm: '예약가능',
    h_gen_rsv_cd: gen,
    h_spe_rsv_cd: spe,
    h_wait_rsv_flg: wait,
  }
}

async function loggedInClient(handler: (r: Recorded) => Response | Promise<Response>) {
  const { fetch, calls } = makeFetch((r) => {
    if (hits(r, ENDPOINTS.code)) return jsonResponse({ strResult: 'SUCC', 'app.login.cphd': { idx: '7', key: KEY32, pwdAESCphd: 'Y' } }, { setCookie: ['JSESSIONID=abc; Path=/'] })
    if (hits(r, ENDPOINTS.login)) return jsonResponse({ strResult: 'SUCC', Key: 'KEY-1', strMbCrdNo: '12345678', strCustNm: '홍길동', strEmailAdr: 'a@b.c' })
    return handler(r)
  })
  const client = new KorailClient({ fetch })
  await client.login('12345678', 'pw')
  calls.length = 0
  return { client, calls }
}

describe('helpers', () => {
  it('classifies login ids', () => {
    expect(classifyLoginId('a@b.co')).toEqual({ flag: '5', value: 'a@b.co' })
    expect(classifyLoginId('010-1234-5678')).toEqual({ flag: '4', value: '010-1234-5678' })
    expect(classifyLoginId('01012345678')).toEqual({ flag: '4', value: '010-1234-5678' })
    expect(classifyLoginId(' 12345678 ')).toEqual({ flag: '2', value: '12345678' })
  })

  it('advances one minute and stops at midnight', () => {
    expect(nextMinute('083000')).toBe('083100')
    expect(nextMinute('085959')).toBe('090000')
    expect(nextMinute('235900')).toBeNull()
    expect(nextMinute('zz')).toBeNull()
  })

  it('stores cookies by name and splits legacy set-cookie strings', () => {
    const jar = new CookieJar()
    jar.store(['JSESSIONID=1; Path=/; HttpOnly', 'WMONID=x; Expires=Wed, 21 Oct 2026 07:28:00 GMT'])
    expect(jar.header()).toBe('JSESSIONID=1; WMONID=x')
    jar.store(['WMONID=y'])
    expect(jar.get('JSESSIONID')).toBe('1') // unrelated cookie must not clobber the session
    expect(jar.header()).toBe('JSESSIONID=1; WMONID=y')
    const res = new Response('', { headers: { 'set-cookie': 'a=1; Expires=Wed, 21 Oct 2026 07:28:00 GMT, b=2; Path=/' } })
    const h = res.headers as Headers & { getSetCookie?: () => string[] }
    if (typeof h.getSetCookie !== 'function') {
      expect(getSetCookies(res)).toEqual(['a=1; Expires=Wed, 21 Oct 2026 07:28:00 GMT', 'b=2; Path=/'])
    } else {
      expect(getSetCookies(res).length).toBeGreaterThan(0)
    }
  })

  it('redacts secrets in logged urls', () => {
    expect(redactUrl('https://x/?txtMemberNo=1&txtPwd=abc&Key=k&Sid=zz&mbCrdNo=9&Version=1')).toBe(
      'https://x/?txtMemberNo=***&txtPwd=***&Key=***&Sid=***&mbCrdNo=***&Version=1',
    )
  })

  it('chooses seat class per preference', () => {
    const t = (g: boolean, s: boolean, w = false) => ({ hasGeneralSeat: g, hasSpecialSeat: s, hasWaitingList: w })
    expect(chooseSeatClass(t(true, true), 'GENERAL_FIRST', false)).toEqual({ seatClass: '1', waiting: false })
    expect(chooseSeatClass(t(false, true), 'GENERAL_FIRST', false)).toEqual({ seatClass: '2', waiting: false })
    expect(chooseSeatClass(t(false, true), 'GENERAL_ONLY', false)).toBeNull()
    expect(chooseSeatClass(t(true, true), 'SPECIAL_FIRST', false)).toEqual({ seatClass: '2', waiting: false })
    expect(chooseSeatClass(t(true, false), 'SPECIAL_ONLY', false)).toBeNull()
    expect(chooseSeatClass(t(false, false, true), 'GENERAL_FIRST', true)).toEqual({ seatClass: '1', waiting: true })
    expect(chooseSeatClass(t(false, false, true), 'SPECIAL_ONLY', true)).toBeNull()
    expect(chooseSeatClass(t(false, false, true), 'GENERAL_FIRST', false)).toBeNull()
  })

  it('extracts login crypto info from various shapes', () => {
    expect(extractLoginCryptoInfo({ 'app.login.cphd': { idx: '1', key: KEY32, pwdAESCphd: 'Y' } })).toEqual({ idx: '1', key: KEY32, aes: true })
    expect(extractLoginCryptoInfo({ data: { login: { idx: '2', key: KEY32, loginFlg: 'Y' } } })).toEqual({ idx: '2', key: KEY32, aes: true })
    expect(extractLoginCryptoInfo({ login: { pwdAESCphd: 'N' } })).toEqual({ idx: '', key: '', aes: false })
    expect(extractLoginCryptoInfo({ strResult: 'SUCC' })).toBeNull()
  })
})

describe('KorailClient.login', () => {
  it('bootstraps the cipher key, encrypts the password and keeps the session', async () => {
    const { fetch, calls } = makeFetch((r) => {
      if (hits(r, ENDPOINTS.code)) {
        return jsonResponse({ strResult: 'SUCC', 'app.login.cphd': { idx: '42', key: KEY32, pwdAESCphd: 'Y' } }, { setCookie: ['JSESSIONID=S1; Path=/'] })
      }
      if (hits(r, ENDPOINTS.login)) {
        return jsonResponse({ strResult: 'SUCC', Key: 'KEY-1', strMbCrdNo: '12345678', strCustNm: '홍길동', strEmailAdr: 'a@b.c' })
      }
      return jsonResponse({ strResult: 'SUCC' })
    })
    const client = new KorailClient({ fetch })
    const result = await client.login('010-1234-5678', 'pw')
    expect(result).toEqual({ ok: true, name: '홍길동', membershipNumber: '12345678', email: 'a@b.c' })
    expect(client.loggedIn).toBe(true)

    const code = calls[0]
    expect(code.method).toBe('POST')
    expect(code.params.getAll('code')).toContain('app.login.cphd')
    expect(code.params.getAll('code').length).toBeGreaterThan(10)
    expect(code.params.get('OSVersion')).toBe('35')
    expect(code.params.get('deviceWidth')).toBe('1080')

    const login = calls[1]
    expect(login.method).toBe('POST')
    expect(login.params.get('txtInputFlg')).toBe('4')
    expect(login.params.get('txtMemberNo')).toBe('010-1234-5678')
    expect(login.params.get('idx')).toBe('42')
    expect(login.params.get('Version')).toBe('250601003')
    expect(login.params.get('Device')).toBe('AD')
    expect(login.params.get('Key')).toBe('korail1234567890')
    expect(login.params.get('checkValidPw')).toBe('Y')
    expect(login.params.get('txtPwd')).not.toBe('pw')
    expect(login.headers.Cookie).toBe('JSESSIONID=S1')
    expect(login.headers['User-Agent']).toContain('Dalvik')
    expect(login.headers[DYNAPATH_HEADER]).toMatch(/^bEeEP/)

    await client.reservations()
    const rsv = calls[2]
    expect(rsv.method).toBe('GET')
    expect(rsv.params.get('Key')).toBe('korail1234567890')
    expect(rsv.headers.Cookie).toBe('JSESSIONID=S1')
    expect(rsv.headers[DYNAPATH_HEADER]).toBeUndefined() // ReservationView is not a DynaPath path
  })

  it('accepts login success signalled only by h_msg_cd', async () => {
    const { fetch } = makeFetch((r) => {
      if (hits(r, ENDPOINTS.code)) return jsonResponse({ strResult: 'SUCC', 'app.login.cphd': { idx: '1', key: KEY32, pwdAESCphd: 'Y' } })
      return jsonResponse({ strResult: 'SUCC', h_msg_cd: 'IRZ000001', strMbCrdNo: '999', strCustNm: '김철수' })
    })
    const client = new KorailClient({ fetch })
    expect((await client.login('1', '2')).name).toBe('김철수')
  })

  it('surfaces a macro-notice on login', async () => {
    const { fetch } = makeFetch((r) => {
      if (hits(r, ENDPOINTS.code)) return jsonResponse({ strResult: 'SUCC', 'app.login.cphd': { idx: '1', key: KEY32, pwdAESCphd: 'Y' } })
      return jsonResponse({ strResult: 'SUCC', strMbCrdNo: '1', strCustNm: 'A', notiTpCd: 'MC' })
    })
    const result = await new KorailClient({ fetch }).login('1', '2')
    expect(result.message).toContain('매크로')
  })

  it('throws LoginError with the server message on failure', async () => {
    const { fetch } = makeFetch((r) => {
      if (hits(r, ENDPOINTS.code)) return jsonResponse({ strResult: 'SUCC', 'app.login.cphd': { idx: '1', key: KEY32, pwdAESCphd: 'Y' } })
      return jsonResponse({ strResult: 'FAIL', h_msg_cd: 'WRC000391', h_msg_txt: '비밀번호가 \n틀렸습니다.' })
    })
    const client = new KorailClient({ fetch })
    await expect(client.login('1', '2')).rejects.toThrow(LoginError)
    await expect(client.login('1', '2')).rejects.toThrow('비밀번호가 틀렸습니다.')
    expect(client.loggedIn).toBe(false)
  })

  it('reports the macro block as a DynaPathError', async () => {
    const { fetch } = makeFetch((r) => {
      if (hits(r, ENDPOINTS.code)) return jsonResponse({ strResult: 'SUCC', 'app.login.cphd': { idx: '1', key: KEY32, pwdAESCphd: 'Y' } })
      return new Response(JSON.stringify({ message: 'blocked' }), { status: 403, headers: { 'DynaPath-Result': '-1', 'Content-Type': 'application/json' } })
    })
    await expect(new KorailClient({ fetch }).login('1', '2')).rejects.toThrow(DynaPathError)
  })

  it('detects a MACRO ERROR body disguised as a normal response', async () => {
    const { fetch } = makeFetch((r) => {
      if (hits(r, ENDPOINTS.code)) return jsonResponse({ strResult: 'SUCC', 'app.login.cphd': { idx: '1', key: KEY32, pwdAESCphd: 'Y' } })
      return new Response('MACRO ERROR: update your app', { status: 200 })
    })
    await expect(new KorailClient({ fetch }).login('1', '2')).rejects.toThrow(DynaPathError)
  })

  it('fails clearly when the cipher key endpoint changes shape', async () => {
    const { fetch } = makeFetch(() => jsonResponse({ strResult: 'SUCC' }))
    const client = new KorailClient({ fetch })
    await expect(client.login('1', '2')).rejects.toThrow(/암호화 키/)
  })

  it('maps transport failures to NetworkError', async () => {
    const client = new KorailClient({ fetch: (async () => { throw new TypeError('fetch failed') }) as unknown as typeof fetch })
    await expect(client.login('1', '2')).rejects.toThrow(NetworkError)
    const http500 = new KorailClient({ fetch: (async () => new Response('x', { status: 500 })) as unknown as typeof fetch })
    await expect(http500.login('1', '2')).rejects.toThrow(/HTTP 500/)
  })
})

describe('KorailClient.searchTrains / searchWindow', () => {
  it('POSTs the schedule query with Sid + DynaPath and parses trains', async () => {
    const { client, calls } = await loggedInClient(() => jsonResponse({ strResult: 'SUCC', trn_infos: { trn_info: [trainJson('001', '080000'), trainJson('002', '083000', '13', '13', '9')] } }))
    const trains = await client.searchTrains({ dep: '서울', arr: '부산', date: '20260910', time: '080000', passengers: { adult: 2 } })
    expect(trains).toHaveLength(2)
    expect(trains[1].hasWaitingList).toBe(true)
    expect(trains[0].depConsOrder).toBe('000001')
    const q = calls[0].params
    expect(calls[0].method).toBe('POST')
    expect(hits(calls[0], ENDPOINTS.schedule)).toBe(true)
    expect(q.get('txtGoStart')).toBe('서울')
    expect(q.get('txtGoEnd')).toBe('부산')
    expect(q.get('txtGoAbrdDt')).toBe('20260910')
    expect(q.get('txtGoHour')).toBe('080000')
    expect(q.get('selGoTrain')).toBe('109')
    expect(q.get('txtTrnGpCd')).toBe('109')
    expect(q.get('txtPsgFlg_1')).toBe('2')
    expect(q.get('pgPrCnt')).toBe('10')
    expect(q.get('ebizCrossCheck')).toBe('N')
    expect(q.get('Sid')).toBeTruthy()
    expect(q.get('mbCrdNo')).toBe('12345678')
    expect(q.get('Version')).toBe('250601003')
    expect(calls[0].headers[DYNAPATH_HEADER]).toMatch(/^bEeEP/)
  })

  it('returns [] on no-results errors and rethrows others', async () => {
    const { client } = await loggedInClient(() => jsonResponse({ strResult: 'FAIL', h_msg_cd: 'WRG000000', h_msg_txt: '없음' }))
    expect(await client.searchTrains({ dep: '서울', arr: '부산', date: '20260910', time: '080000' })).toEqual([])
    const { client: c2 } = await loggedInClient(() => jsonResponse({ strResult: 'FAIL', h_msg_cd: 'P058', h_msg_txt: '로그인' }))
    await expect(c2.searchTrains({ dep: '서울', arr: '부산', date: '20260910', time: '080000' })).rejects.toThrow(NeedToLoginError)
  })

  it('reports an empty first page with the server message, but a later empty page just ends the scan', async () => {
    const { client } = await loggedInClient(() => jsonResponse({ strResult: 'FAIL', h_msg_cd: 'WRG000000', h_msg_txt: '운행 열차가 없습니다' }))
    await expect(client.searchWindow({ dep: '서울', arr: '부산', date: '20260910', timeFrom: '0800', timeTo: '1000' })).rejects.toThrow(/운행 열차가 없습니다/)

    const firstPage = Array.from({ length: 10 }, (_, i) => trainJson(String(i + 1).padStart(3, '0'), `08${String(i * 5).padStart(2, '0')}00`))
    const { client: c2, calls } = await loggedInClient((r) =>
      r.params.get('txtGoHour') === '080000'
        ? jsonResponse({ strResult: 'SUCC', trn_infos: { trn_info: firstPage } })
        : jsonResponse({ strResult: 'FAIL', h_msg_cd: 'WRG000000', h_msg_txt: '운행 열차가 없습니다' }),
    )
    const trains = await c2.searchWindow({ dep: '서울', arr: '부산', date: '20260910', timeFrom: '0800', timeTo: '1000' })
    expect(trains).toHaveLength(10)
    expect(calls).toHaveLength(2)
  })

  it('pages through the window and stops after the end time', async () => {
    const pages: Record<string, string[]> = {
      '080000': ['080000', '081500', '083000', '084500', '090000', '091500', '093000', '094500', '100000', '101500'],
      '101600': ['110000', '120000'],
    }
    const { client, calls } = await loggedInClient((r) => {
      const t = r.params.get('txtGoHour') ?? ''
      const list = pages[t]
      if (!list) return jsonResponse({ strResult: 'FAIL', h_msg_cd: 'P100', h_msg_txt: 'none' })
      return jsonResponse({ strResult: 'SUCC', trn_infos: { trn_info: list.map((d, i) => trainJson(`${t}-${i}`, d)) } })
    })
    const trains = await client.searchWindow({ dep: '서울', arr: '부산', date: '20260910', timeFrom: '08:00', timeTo: '12:00' })
    expect(calls.map((c) => c.params.get('txtGoHour'))).toEqual(['080000', '101600'])
    expect(trains.map((t) => t.depTime)).toEqual(['080000', '081500', '083000', '084500', '090000', '091500', '093000', '094500', '100000', '101500', '110000', '120000'])
  })

  it('stops paging when a page returns fewer than 10 trains', async () => {
    const { client, calls } = await loggedInClient(() => jsonResponse({ strResult: 'SUCC', trn_infos: { trn_info: [trainJson('001', '080000')] } }))
    const trains = await client.searchWindow({ dep: '서울', arr: '부산', date: '20260910', timeFrom: '0800', timeTo: '2300' })
    expect(trains).toHaveLength(1)
    expect(calls.length).toBe(1)
  })
})

describe('KorailClient.reserve', () => {
  const train = (): Train => ({
    trainType: '00', trainTypeName: 'KTX', trainGroup: '100', trainNo: '00101',
    depName: '서울', depCode: '0001', depDate: '20260910', depTime: '080000',
    arrName: '부산', arrCode: '0020', arrDate: '20260910', arrTime: '103000', runDate: '20260910',
    depConsOrder: '000001', depRunOrder: '000001', arrConsOrder: '000010', arrRunOrder: '000010',
    reservePossible: true, reservePossibleName: '예약가능', generalSeat: '13', specialSeat: '11', waitReserveFlag: 0,
    hasGeneralSeat: false, hasSpecialSeat: true, hasWaitingList: false, key: '20260910-00101-0001-0020',
  })

  it('POSTs the reservation with 8 passenger rows and DynaPath, then looks it up', async () => {
    const { client, calls } = await loggedInClient((r) => {
      if (hits(r, ENDPOINTS.reserve)) return jsonResponse({ strResult: 'SUCC', h_pnr_no: '99887' })
      if (hits(r, ENDPOINTS.reservations)) {
        return jsonResponse({ strResult: 'SUCC', jrny_infos: { jrny_info: [{ train_infos: { train_info: [{ h_pnr_no: '99887', h_tot_seat_cnt: '001', h_rsv_amt: '59800', h_ntisu_lmt_dt: '20260910', h_ntisu_lmt_tm: '123000', h_trn_no: '00101' }] } }] } })
      }
      return jsonResponse({ strResult: 'FAIL', h_msg_cd: 'X' })
    })
    const result = await client.reserve(train(), { adult: 1 }, 'GENERAL_FIRST', false)
    expect(result.pnrNo).toBe('99887')
    expect(result.seatClass).toBe('2')
    expect(result.reservation?.price).toBe(59800)
    expect(result.reservation?.buyLimitTime).toBe('123000')
    const q = calls[0].params
    expect(calls[0].method).toBe('POST')
    expect(hits(calls[0], ENDPOINTS.reserve)).toBe(true)
    expect(q.get('txtJobId')).toBe('1101')
    expect(q.get('txtPsrmClCd1')).toBe('2')
    expect(q.get('txtTrnNo1')).toBe('00101')
    expect(q.get('txtDptRsStnCd1')).toBe('0001')
    expect(q.get('txtArvRsStnCd1')).toBe('0020')
    expect(q.get('txtRunDt1')).toBe('20260910')
    expect(q.get('txtTrnClsfCd1')).toBe('00')
    expect(q.get('txtTrnGpCd1')).toBe('100')
    expect(q.get('txtTotPsgCnt')).toBe('1')
    expect(q.get('txtCompaCnt1')).toBe('1')
    expect(q.get('txtPsgTpCd1')).toBe('1')
    expect(q.get('txtCompaCnt8')).toBe('0') // all 8 rows present
    expect(q.get('txtPsgTpCd8')).toBe('1')
    expect(q.get('txtDptStnConsOrdr1')).toBe('000001')
    expect(q.get('arvTm_1')).toBe('103000')
    expect(q.get('Key')).toBe('korail1234567890')
    expect(q.get('txtJrnyCnt')).toBe('1')
    expect(q.get('txtSeatAttCd4')).toBe('015')
    expect(calls[0].headers[DYNAPATH_HEADER]).toMatch(/^bEeEP/)
  })

  it('throws SoldOutError locally when nothing matches the preference', async () => {
    const { client, calls } = await loggedInClient(() => jsonResponse({ strResult: 'SUCC' }))
    await expect(client.reserve(train(), { adult: 1 }, 'GENERAL_ONLY', false)).rejects.toThrow(SoldOutError)
    expect(calls).toHaveLength(0)
  })

  it('uses the waiting-list job id when allowed', async () => {
    const { client, calls } = await loggedInClient((r) => {
      if (hits(r, ENDPOINTS.reserve)) return jsonResponse({ strResult: 'SUCC', h_pnr_no: '1' })
      return jsonResponse({ strResult: 'FAIL', h_msg_cd: 'P100', h_msg_txt: 'none' })
    })
    const t = { ...train(), hasSpecialSeat: false, specialSeat: '13', hasWaitingList: true, waitReserveFlag: 9 }
    const result = await client.reserve(t, { adult: 1 }, 'GENERAL_FIRST', true)
    expect(result.waiting).toBe(true)
    expect(result.reservation).toBeNull()
    expect(calls[0].params.get('txtJobId')).toBe('1102')
  })

  it('maps the server sold-out codes', async () => {
    const { client } = await loggedInClient(() => jsonResponse({ strResult: 'FAIL', h_msg_cd: 'IRT010110', h_msg_txt: '매진' }))
    await expect(client.reserve(train(), { adult: 1 }, 'SPECIAL_FIRST', false)).rejects.toThrow(SoldOutError)
  })
})

describe('KorailClient.reservations / cancel', () => {
  it('returns [] when there are no reservations', async () => {
    const { client } = await loggedInClient(() => jsonResponse({ strResult: 'FAIL', h_msg_cd: 'P100', h_msg_txt: '없음' }))
    expect(await client.reservations()).toEqual([])
  })

  it('POSTs cancel with the reservation identifiers', async () => {
    const { client, calls } = await loggedInClient(() => jsonResponse({ strResult: 'SUCC' }))
    expect(await client.cancel({ rsvId: '5', journeyNo: '001', journeyCnt: '01', rsvChgNo: '00000' })).toBe(true)
    expect(calls[0].method).toBe('POST')
    expect(hits(calls[0], ENDPOINTS.cancel)).toBe(true)
    expect(calls[0].params.get('txtPnrNo')).toBe('5')
    expect(calls[0].params.get('hidRsvChgNo')).toBe('00000')
  })

  it('propagates NoResultsError type checks', () => {
    expect(new NoResultsError()).toBeInstanceOf(Error)
  })
})
