import { describe, expect, it } from 'vitest'
import { AppVersionError, DynaPathError, KorailError, NoResultsError, describeNetworkFailure, errorFromResponse } from '../src/main/korail/errors'

describe('errorFromResponse', () => {
  it('recognises an app-update demand from the server text', () => {
    expect(errorFromResponse('WRC000000', '앱을 최신 버전으로 업데이트 후 이용해 주세요.')).toBeInstanceOf(AppVersionError)
    expect(errorFromResponse('IRT000001', '최신 버전의 앱으로 업데이트가 필요합니다')).toBeInstanceOf(AppVersionError)
    expect(errorFromResponse('', '코레일톡 앱 업데이트가 필요합니다.').message).toMatch(/KORAIL_APP_VERSION/)
  })

  it('does not mistake ordinary messages for an update demand', () => {
    const e = errorFromResponse('X', '예약 정보가 업데이트되었습니다.')
    expect(e).toBeInstanceOf(KorailError)
    expect(e).not.toBeInstanceOf(AppVersionError)
  })

  it('keeps the specific classes', () => {
    expect(errorFromResponse('WRG000000', '없음')).toBeInstanceOf(NoResultsError)
    expect(errorFromResponse('', 'MACRO ERROR')).toBeInstanceOf(DynaPathError)
    expect(new DynaPathError().message).toMatch(/시계/)
  })
})

describe('describeNetworkFailure', () => {
  it('explains DNS failures carried in a Node fetch cause', () => {
    const e = Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND', message: 'getaddrinfo ENOTFOUND smart.letskorail.com' } })
    expect(describeNetworkFailure(e)).toMatch(/주소를 찾을 수 없습니다/)
  })

  it('explains Chromium net errors from Electron net.fetch', () => {
    expect(describeNetworkFailure(new Error('net::ERR_INTERNET_DISCONNECTED'))).toMatch(/인터넷에 연결/)
    expect(describeNetworkFailure(new Error('net::ERR_NAME_NOT_RESOLVED'))).toMatch(/DNS/)
    expect(describeNetworkFailure(new Error('net::ERR_CERT_AUTHORITY_INVALID'))).toMatch(/TLS/)
    expect(describeNetworkFailure(new Error('net::ERR_PROXY_CONNECTION_FAILED'))).toMatch(/프록시/)
    expect(describeNetworkFailure(new Error('net::ERR_CONNECTION_RESET'))).toMatch(/끊어졌습니다/)
    expect(describeNetworkFailure(new Error('net::ERR_CONNECTION_TIMED_OUT'))).toMatch(/시간이 초과/)
    expect(describeNetworkFailure(new Error('net::ERR_CONNECTION_REFUSED'))).toMatch(/거부/)
  })

  it('explains Node errno codes', () => {
    expect(describeNetworkFailure(Object.assign(new Error('x'), { code: 'ECONNRESET' }))).toMatch(/끊어졌습니다/)
    expect(describeNetworkFailure(Object.assign(new Error('x'), { code: 'ETIMEDOUT' }))).toMatch(/시간이 초과/)
    expect(describeNetworkFailure(Object.assign(new Error('x'), { code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' }))).toMatch(/TLS/)
  })

  it('falls back to the raw message', () => {
    expect(describeNetworkFailure(new Error('weird'))).toBe('네트워크 오류: weird')
    expect(describeNetworkFailure('boom')).toBe('네트워크 오류: boom')
  })
})
