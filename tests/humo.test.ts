import { expect, test } from 'vitest'
import { UMBRAL_GPS_M } from '../src/config'

test('umbral GPS por defecto', () => expect(UMBRAL_GPS_M).toBe(30))
