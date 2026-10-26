/**
 * Normaliza un teléfono argentino para wa.me (sólo dígitos, con 54 y 9 en celulares).
 * "011 15 5063-3206" → "5491150633206" · "2255 41-8960" → "5492255418960"
 */
export function waNumber(raw: string): string {
  let d = (raw || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('54')) {
    d = d.slice(2);
    if (d.startsWith('9')) d = d.slice(1);
  }
  if (d.startsWith('0')) d = d.slice(1);
  // Saca el "15" de celulares escritos a la antigua (área de 2 a 4 dígitos + 15 + número)
  if (d.length === 12) {
    for (const areaLen of [2, 3, 4]) {
      if (d.slice(areaLen, areaLen + 2) === '15') {
        d = d.slice(0, areaLen) + d.slice(areaLen + 2);
        break;
      }
    }
  }
  return d.length === 10 ? `549${d}` : d;
}

export function waLink(number: string, text: string) {
  return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
}
