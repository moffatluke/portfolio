import { useEffect } from 'react'

// Reveals elements with the `.reveal` class as they scroll into view by
// adding `.in`. Runs once after mount; cleans up its observer on unmount.
export function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    if (!els.length) return

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.style.transitionDelay = (e.target.dataset.delay || 0) + 'ms'
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    )

    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}
