// Minimal stand-in for the 코레일+ (구 코레일톡) API used by the end-to-end test.
// Implements just enough of the protocol for login → search → reserve → cancel.
import { createDecipheriv } from 'node:crypto'
import { createServer } from 'node:http'

export const MOCK_KEY = 'abcdefghijklmnopqrstuvwxyz012345'
export const MOCK_USER = { id: '12345678', password: 'pw-1234', name: '홍길동', email: 'hong@example.com' }

function decryptPassword(doubleB64) {
  // Android Base64.DEFAULT wraps and appends "\n"; strip whitespace before decoding either layer.
  const inner = Buffer.from(doubleB64.replace(/\s/g, ''), 'base64').toString('utf8')
  const ct = Buffer.from(inner.replace(/\s/g, ''), 'base64')
  const d = createDecipheriv('aes-256-cbc', Buffer.from(MOCK_KEY, 'utf8'), Buffer.from(MOCK_KEY.slice(0, 16), 'utf8'))
  return Buffer.concat([d.update(ct), d.final()]).toString('utf8')
}

function train(no, name, group, clsf, depTime, arrTime, date, gen, spe, wait = '0') {
  return {
    h_trn_clsf_cd: clsf,
    h_trn_clsf_nm: name,
    h_trn_gp_cd: group,
    h_trn_no: no,
    h_dpt_rs_stn_nm: '서울',
    h_dpt_rs_stn_cd: '0001',
    h_dpt_dt: date,
    h_dpt_tm: depTime,
    h_arv_rs_stn_nm: '부산',
    h_arv_rs_stn_cd: '0020',
    h_arv_dt: date,
    h_arv_tm: arrTime,
    h_run_dt: date,
    h_rsv_psb_flg: gen === '11' || spe === '11' ? 'Y' : 'N',
    h_rsv_psb_nm: gen === '11' || spe === '11' ? '예약가능' : '매진',
    h_gen_rsv_cd: gen,
    h_spe_rsv_cd: spe,
    h_wait_rsv_flg: wait,
  }
}

/**
 * Scenario: every train is sold out for the first `soldOutRounds` schedule calls;
 * after that train 003 (09:00) gets a general seat. Train 005 (10:00) is sold out with a waiting
 * list until `state.train005OpensAfter` schedule calls have been made (Infinity = never).
 */
export function startMockKorail({ soldOutRounds = 2 } = {}) {
  const state = {
    scheduleCalls: 0,
    train005OpensAfter: Infinity,
    reserveCalls: 0,
    reservations: [],
    sessionKey: null,
    loggedIn: false,
    log: [],
    dynapathSeen: [],
    sidSeen: [],
  }

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost')
    const chunks = []
    for await (const c of req) chunks.push(c)
    const body = new URLSearchParams(Buffer.concat(chunks).toString('utf8'))
    const p = (k) => url.searchParams.get(k) ?? body.get(k)
    const path = url.pathname
    state.log.push(`${req.method} ${path}`)
    const send = (obj, extraHeaders = {}) => {
      res.writeHead(200, { 'Content-Type': 'application/json;charset=UTF-8', ...extraHeaders })
      res.end(JSON.stringify(obj))
    }
    const fail = (code, text) => send({ strResult: 'FAIL', h_msg_cd: code, h_msg_txt: text })

    const dynapath = req.headers['x-dynapath-m-token']
    // DynaPath-protected paths must carry the app-integrity token (login/search/reserve).
    const requiresDynapath = /(login\.Login|seatMovie\.ScheduleView|certification\.TicketReservation)$/.test(path)
    if (requiresDynapath) {
      state.dynapathSeen.push(path)
      if (!dynapath || !dynapath.startsWith('bEeEP')) {
        res.writeHead(403, { 'Content-Type': 'application/json;charset=UTF-8', 'DynaPath-Result': '-1' })
        res.end(JSON.stringify({ message: 'MACRO ERROR' }))
        return
      }
    }

    if (path.endsWith('.common.code.do')) {
      const codes = url.searchParams.getAll('code').concat(body.getAll('code'))
      if (!codes.includes('app.login.cphd')) return fail('WRC000000', 'unknown code')
      return send({ strResult: 'SUCC', 'app.login.cphd': { idx: '77', key: MOCK_KEY, pwdAESCphd: 'Y' } }, { 'Set-Cookie': 'JSESSIONID=mock-session; Path=/; HttpOnly' })
    }
    if (path.endsWith('.login.Login')) {
      if (p('idx') !== '77' || p('Device') !== 'AD') return fail('WRC000391', '잘못된 요청')
      if (p('Sid')) state.sidSeen.push('login')
      let pw = ''
      try {
        pw = decryptPassword(p('txtPwd') ?? '')
      } catch {
        return fail('WRC000391', '비밀번호 복호화 실패')
      }
      if (p('txtMemberNo') !== MOCK_USER.id || pw !== MOCK_USER.password) return fail('WRC000391', '회원번호 또는 비밀번호가 올바르지 않습니다.')
      state.loggedIn = true
      state.sessionKey = 'MOCK-KEY-1'
      return send({ strResult: 'SUCC', h_msg_cd: 'IRZ000001', Key: state.sessionKey, strMbCrdNo: MOCK_USER.id, strCustNm: MOCK_USER.name, strEmailAdr: MOCK_USER.email })
    }
    if (path.endsWith('.common.logout')) {
      state.loggedIn = false
      return send({ strResult: 'SUCC' })
    }
    if (!(req.headers.cookie ?? '').includes('JSESSIONID=mock-session') || !state.loggedIn) return fail('P058', '로그인 후 이용하세요.')

    if (path.endsWith('.seatMovie.ScheduleView')) {
      state.scheduleCalls += 1
      if (p('Sid')) state.sidSeen.push('search')
      const date = p('txtGoAbrdDt')
      const hour = p('txtGoHour') ?? '000000'
      if (p('txtGoStart') !== '서울' || p('txtGoEnd') !== '부산') return fail('WRG000000', '운행 열차가 없습니다.')
      const seatOpen = state.scheduleCalls > soldOutRounds ? '11' : '13'
      const all = [
        train('001', 'KTX', '100', '00', '080000', '103000', date, '13', '13'),
        train('1001', 'ITX-새마을', '101', '08', '083000', '134000', date, '13', '00'),
        train('003', 'KTX', '100', '00', '090000', '113000', date, seatOpen, '13', '9'),
        train('005', 'KTX-산천', '100', '07', '100000', '124000', date, state.scheduleCalls > state.train005OpensAfter ? '11' : '13', '13', '9'),
        train('1203', '무궁화호', '102', '02', '110000', '163000', date, '11', '00'),
        train('007', 'KTX', '100', '00', '130000', '153000', date, '11', '11'),
      ].filter((t) => t.h_dpt_tm >= hour)
      if (all.length === 0) return fail('P100', '조회 결과가 없습니다.')
      return send({ strResult: 'SUCC', h_msg_cd: 'IRG000000', trn_infos: { trn_info: all } })
    }
    if (path.endsWith('.certification.TicketReservation')) {
      state.reserveCalls += 1
      // The session is the cookie (already checked above); the app sends the static Key, not the login one.
      if (p('Key') !== 'korail1234567890') return fail('P058', '로그인 후 이용하세요.')
      const no = p('txtTrnNo1')
      const open = no === '1203' || no === '007' || (no === '003' && state.scheduleCalls > soldOutRounds) || (no === '005' && state.scheduleCalls > state.train005OpensAfter)
      // A waiting-list registration (txtJobId 1102) has no payment deadline until a seat is assigned;
      // the real server reports it as 00000000 / 235900 plus a waiting sequence number.
      const waiting = p('txtJobId') === '1102'
      const hasWaitingList = no === '003' || no === '005'
      if (waiting) {
        if (!hasWaitingList) return fail('ERR211161', '좌석이 매진되었습니다.')
        if (state.reservations.some((r) => r.h_trn_no === no && r.h_wct_no)) return fail('WRR800017', '이미 예약대기 신청한 열차입니다.')
      } else if (!open) {
        return fail('ERR211161', '좌석이 매진되었습니다.')
      }
      const pnr = String(10000 + state.reservations.length + 1)
      // Korail reports deadlines as KST wall-clock; render "20 minutes from now" in KST whatever the host zone.
      const now = new Date(Date.now() + 20 * 60 * 1000 + 9 * 60 * 60 * 1000)
      const pad = (n) => String(n).padStart(2, '0')
      state.reservations.push({
        h_pnr_no: pnr,
        h_trn_clsf_cd: p('txtTrnClsfCd1'),
        h_trn_clsf_nm: no === '1203' ? '무궁화호' : no === '005' ? 'KTX-산천' : 'KTX',
        h_trn_no: no,
        h_dpt_rs_stn_nm: '서울',
        h_dpt_rs_stn_cd: '0001',
        h_arv_rs_stn_nm: '부산',
        h_arv_rs_stn_cd: '0020',
        h_run_dt: p('txtRunDt1'),
        h_dpt_tm: p('txtDptTm1'),
        h_arv_tm: '113000',
        h_tot_seat_cnt: String(p('txtTotPsgCnt') ?? '1').padStart(3, '0'),
        h_ntisu_lmt_dt: waiting ? '00000000' : `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}`,
        h_ntisu_lmt_tm: waiting ? '235900' : `${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`,
        h_rsv_amt: '00059800',
        ...(waiting ? { h_wct_no: '1' } : {}),
      })
      return send({ strResult: 'SUCC', h_pnr_no: pnr, ...(waiting ? { h_wct_no: '1' } : {}) })
    }
    if (path.endsWith('.reservation.ReservationView')) {
      if (state.reservations.length === 0) return fail('P100', '예약 내역이 없습니다.')
      return send({ strResult: 'SUCC', jrny_infos: { jrny_info: [{ train_infos: { train_info: state.reservations } }] } })
    }
    if (path.endsWith('.reservationCancel.ReservationCancelChk')) {
      const before = state.reservations.length
      state.reservations = state.reservations.filter((r) => r.h_pnr_no !== p('txtPnrNo'))
      if (state.reservations.length === before) return fail('WRR000000', '예약을 찾을 수 없습니다.')
      return send({ strResult: 'SUCC' })
    }
    fail('WRC000000', `unknown endpoint ${path}`)
  })

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      resolve({ base: `http://127.0.0.1:${port}`, state, close: () => new Promise((r) => server.close(r)) })
    })
  })
}
