import { ageInMonths } from './places'
import { KEYS, useStored } from './storage'

export function useChild() {
  const [birthDate, setBirthDate] = useStored<string | null>(KEYS.childBirthDate, null)
  const [name, setName] = useStored<string>(KEYS.childName, '')
  const [napStart, setNapStart] = useStored<string>(KEYS.napStart, '')
  return {
    birthDate,
    setBirthDate,
    name,
    setName,
    napStart,
    setNapStart,
    months: ageInMonths(birthDate),
  }
}
