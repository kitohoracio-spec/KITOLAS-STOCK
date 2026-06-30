import { useState, useEffect, useRef } from 'react'
import { collection, getDocs, query, orderBy, limit as fbLimit } from 'firebase/firestore'
import { db } from '../firebase'

// Cache em memória partilhado entre páginas (sobrevive a navegação, não a refresh)
const cache = {}
const CACHE_TTL = 60 * 1000 // 60 segundos

async function fetchCollection(name, opts = {}) {
  const cacheKey = name + JSON.stringify(opts)
  const cached = cache[cacheKey]
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data
  }
  let q = collection(db, name)
  if (opts.orderByField) q = query(q, orderBy(opts.orderByField, opts.orderDir || 'desc'))
  if (opts.limitTo) q = query(q, fbLimit(opts.limitTo))
  const snap = await getDocs(q)
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  cache[cacheKey] = { data, time: Date.now() }
  return data
}

export function invalidateCache(name) {
  Object.keys(cache).forEach(k => { if (k.startsWith(name)) delete cache[k] })
}

// Hook: busca várias colecções em paralelo, com cache, e devolve resultado parcial assim que disponível
export function useFirestoreCollections(specs) {
  // specs: { produtos: {orderByField, limitTo}, vendas: {...}, ... }
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    setLoading(true)

    // Tenta usar cache imediatamente (instantâneo) e depois revalida
    const keys = Object.keys(specs)
    const cachedInitial = {}
    let allCached = true
    keys.forEach(k => {
      const cacheKey = k + JSON.stringify(specs[k])
      const c = cache[cacheKey]
      if (c && Date.now() - c.time < CACHE_TTL) {
        cachedInitial[k] = c.data
      } else {
        allCached = false
      }
    })
    if (Object.keys(cachedInitial).length > 0) {
      setData(prev => ({ ...prev, ...cachedInitial }))
      if (allCached) setLoading(false)
    }

    // Busca real (ou revalidação)
    Promise.all(keys.map(k => fetchCollection(k, specs[k]).then(d => [k, d])))
      .then(results => {
        if (!mounted.current) return
        const obj = {}
        results.forEach(([k, d]) => { obj[k] = d })
        setData(prev => ({ ...prev, ...obj }))
        setLoading(false)
      })

    return () => { mounted.current = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(specs)])

  return { data, loading }
}
